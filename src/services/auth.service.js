import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { sendPasswordResetEmail } from './mail.service.js'

const MAX_ATTEMPTS = 5
const BLOCK_MINUTES = 15
const RESET_TOKEN_EXPIRES_MINUTES = 60

export const generateTokens = (payload) => ({
  accessToken: jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  }),
  refreshToken: jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  }),
})

export const login = async (email, password) => {
  try {
    const user = await prisma.user.findFirst({
      where: { email, deleted: false },
      include: { role: true },
    })

    if (!user || !user.active) {
      return generateResponse(401, false, 'Credenciales inválidas')
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.blockedUntil - new Date()) / 1000 / 60)
      return generateResponse(403, false, `Cuenta bloqueada. Intenta de nuevo en ${minutesLeft} minutos`)
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      const attempts = user.loginAttempts + 1
      const shouldBlock = attempts >= MAX_ATTEMPTS

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: attempts,
          blockedUntil: shouldBlock
            ? new Date(Date.now() + BLOCK_MINUTES * 60 * 1000)
            : null,
        },
      })

      if (shouldBlock) {
        return generateResponse(403, false, `Demasiados intentos. Cuenta bloqueada por ${BLOCK_MINUTES} minutos`)
      }

      const remaining = MAX_ATTEMPTS - attempts
      return generateResponse(401, false, `Credenciales inválidas. Intentos restantes: ${remaining}`)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, blockedUntil: null },
    })

    const tokens = generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role.name,
    })

    return generateResponse(200, true, 'Login exitoso', {
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name,
      },
      ...tokens,
    })
  } catch (error) {
    return generateResponse(500, false, 'Error en login', null, error.message)
  }
}

export const refreshToken = (token) => {
  try {
    const { sub, email, role } = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const tokens = generateTokens({ sub, email, role })
    return generateResponse(200, true, 'Token renovado', tokens)
  } catch {
    return generateResponse(401, false, 'Refresh token inválido o expirado')
  }
}



export async function isAccountLocked(email) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) return { locked: false }

  if (user.blockedUntil && user.blockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.blockedUntil - new Date()) / 1000 / 60)
    return { locked: true, minutesRemaining: minutesLeft }
  }

  return { locked: false }
}

export async function registerFailedAttempt(email) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return

  const attempts = user.loginAttempts + 1
  const shouldBlock = attempts >= MAX_ATTEMPTS

  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginAttempts: attempts,
      blockedUntil: shouldBlock
        ? new Date(Date.now() + BLOCK_MINUTES * 60 * 1000)
        : null,
    },
  })
}

export async function resetFailedAttempts(email) {
  await prisma.user.update({
    where: { email },
    data: { loginAttempts: 0, blockedUntil: null },
  })
}

export const forgotPassword = async (email) => {
  // Respuesta genérica exista o no el correo, para no filtrar qué correos están
  // registrados (enumeración de usuarios).
  const genericResponse = generateResponse(
    200,
    true,
    'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña'
  )

  try {
    // Regla estricta: sin usuario real no se genera token ni se llama a Resend.
    // Se corta aquí y se devuelve la misma respuesta que en el caso exitoso.
    const user = await prisma.user.findFirst({ where: { email, deleted: false } })
    if (!user) return genericResponse

    const rawToken = crypto.randomBytes(32).toString('hex')
    // En la base solo se guarda el hash: si alguien lee la tabla no puede
    // reconstruir el enlace de recuperación.
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000),
      },
    })

    try {
      // El servicio de correo arma la URL con FRONTEND_URL; aquí solo viaja el token.
      await sendPasswordResetEmail(email, rawToken)
    } catch (mailError) {
      // El error original queda en el log del servidor para poder depurar
      // (clave inválida, dominio sin verificar, cuota agotada…), pero nunca se
      // expone al cliente.
      console.error('[forgotPassword] Fallo al enviar el correo de recuperación:', mailError)

      return generateResponse(
        500,
        false,
        'Hubo un problema al enviar el correo de recuperación. Intenta más tarde.'
      )
    }

    return genericResponse
  } catch (error) {
    return generateResponse(500, false, 'Error al procesar la solicitud', null, error.message)
  }
}

export const resetPassword = async (token, newPassword) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // `deleted: false` va en el filtro por la misma razón que en forgotPassword:
    // un usuario dado de baja conserva su fila (y podría conservar un token aún
    // vigente), pero no debe poder recuperar el acceso a la cuenta.
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiresAt: { gt: new Date() },
        deleted: false,
      },
    })

    if (!user) {
      return generateResponse(400, false, 'El enlace de recuperación es inválido o ha expirado')
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
        loginAttempts: 0,
        blockedUntil: null,
      },
    })

    return generateResponse(200, true, 'Contraseña actualizada correctamente')
  } catch (error) {
    return generateResponse(500, false, 'Error al restablecer la contraseña', null, error.message)
  }
}