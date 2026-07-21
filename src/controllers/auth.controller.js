import * as authService from '../services/auth.service.js'
import { generateResponse } from '../utils/handleResponse.js'
import prisma from '../config/prisma.js'
import {
  buildRegistrationOptions,
  verifyAndSaveRegistration,
  buildAuthenticationOptions,
  verifyAuthenticationAndGetUser,
} from '../services/webauthn.service.js'
import {
  isAccountLocked,
  registerFailedAttempt,
  resetFailedAttempts,
  generateTokens,
} from '../services/auth.service.js'

export const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json(generateResponse(400, false, 'Email y contraseña son requeridos'))
  }
  const result = await authService.login(email, password)
  res.status(result.statusCode).json(result)
}

export const refresh = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(400).json(generateResponse(400, false, 'Refresh token requerido'))
  }
  const result = authService.refreshToken(refreshToken)
  res.status(result.statusCode).json(result)
}

// Requiere sesión activa (authenticate middleware) — se usa para VINCULAR una passkey
export async function getBiometricRegistrationOptions(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } })
    if (!user) {
      return res.status(404).json(generateResponse(404, false, 'Usuario no encontrado'))
    }

    const options = await buildRegistrationOptions(user)
    return res.status(200).json(generateResponse(200, true, 'Opciones de registro generadas', options))
  } catch (err) {
    next(err)
  }
}

export async function verifyBiometricRegistration(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } })
    if (!user) {
      return res.status(404).json(generateResponse(404, false, 'Usuario no encontrado'))
    }

    const { credential, friendlyName } = req.body
    await verifyAndSaveRegistration(user, credential, friendlyName)
    return res.status(200).json(generateResponse(200, true, 'Passkey registrada correctamente'))
  } catch (err) {
    return res.status(400).json(generateResponse(400, false, 'No se pudo verificar la credencial biométrica'))
  }
}

export async function getBiometricAuthenticationOptions(req, res, next) {
  try {
    const { email } = req.body
    const lock = await isAccountLocked(email)
    if (lock.locked) {
      return res.status(403).json(
        generateResponse(403, false, `Cuenta bloqueada. Intenta en ${lock.minutesRemaining} min.`)
      )
    }
    const { options } = await buildAuthenticationOptions(email)
    return res.status(200).json(generateResponse(200, true, 'Opciones de autenticación generadas', options))
  } catch (err) {
    return res.status(400).json(
      generateResponse(400, false, 'No hay credenciales biométricas registradas para este correo')
    )
  }
}

export async function verifyBiometricAuthentication(req, res, next) {
  try {
    const { email, credential } = req.body
    const lock = await isAccountLocked(email)
    if (lock.locked) {
      return res.status(403).json(
        generateResponse(403, false, `Cuenta bloqueada. Intenta en ${lock.minutesRemaining} min.`)
      )
    }
    const user = await verifyAuthenticationAndGetUser(email, credential)
    await resetFailedAttempts(email)

    const tokens = generateTokens({ sub: user.id, email: user.email, role: user.role.name })

    return res.status(200).json(
      generateResponse(200, true, 'Autenticación biométrica exitosa', {
        ...tokens,
        user: {
          id: user.id,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          role: user.role.name,
        },
      })
    )
  } catch (err) {
    await registerFailedAttempt(req.body.email)
    return res.status(401).json(generateResponse(401, false, 'La verificación biométrica falló'))
  }
}