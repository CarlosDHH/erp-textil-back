import * as purchaseOrderService from '../services/purchaseOrder.service.js'

export const getAll = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query
  const result = await purchaseOrderService.getAll({ page, limit, search })
  res.status(result.statusCode).json(result)
}

export const getById = async (req, res) => {
  const result = await purchaseOrderService.getById(req.params.id)
  res.status(result.statusCode).json(result)
}

export const create = async (req, res) => {
  const result = await purchaseOrderService.create(req.body, req.user.id)
  res.status(result.statusCode).json(result)
}

export const update = async (req, res) => {
  const result = await purchaseOrderService.update(req.params.id, req.body)
  res.status(result.statusCode).json(result)
}