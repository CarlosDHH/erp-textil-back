import * as authService from '../services/auth.service.js'
import { generateResponse } from '../utils/handleResponse.js'

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
