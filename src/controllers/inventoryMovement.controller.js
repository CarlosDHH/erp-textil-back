import * as movementService from '../services/inventoryMovement.service.js'

export const create = async (req, res) => {
  try {
    const userId = req.user?.sub

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'User not authenticated',
      })
    }

    const result = await movementService.create(req.body, userId)
    res.status(result.statusCode).json(result)
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Controller error',
      error: error.message,
    })
  }
}

export const getAll = async (req, res) => {
  try {
    const result = await movementService.getAll()
    res.status(result.statusCode).json(result)
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Controller error',
      error: error.message,
    })
  }
}

export const createExit = async (req, res) => {
  const result = await movementService.createExit(req.body, req.user.sub)
  res.status(result.statusCode).json(result)
}

export const createExitFIFO = async (req, res) => {
  const result = await movementService.createExitFIFO(req.body, req.user.sub)
  res.status(result.statusCode).json(result)
}

export const getKardex = async (req, res) => {
  const { supplyId } = req.params
  const result = await movementService.getKardex(supplyId)
  res.status(result.statusCode).json(result)
}