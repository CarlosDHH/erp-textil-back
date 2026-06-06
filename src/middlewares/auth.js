import jwt from 'jsonwebtoken'
import { generateResponse } from '../utils/handleResponse.js'

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(generateResponse(401, false, 'Token no proporcionado'))
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json(generateResponse(401, false, 'Token inválido o expirado'))
  }
}

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json(generateResponse(403, false, 'No tienes permiso para esta acción'))
  }
  next()
}
