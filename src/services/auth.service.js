import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'

const MAX_ATTEMPTS = 5
const BLOCK_MINUTES = 15

const generateTokens = (payload) => ({
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
