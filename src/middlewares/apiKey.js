import { generateResponse } from '../utils/handleResponse.js'

export const apiKey = (req, res, next) => {
  const key = req.headers['x-api-key']

  if (!key || key !== process.env.BULK_API_KEY) {
    return res.status(401).json(generateResponse(401, false, 'API key inválida o ausente'))
  }

  next()
}
