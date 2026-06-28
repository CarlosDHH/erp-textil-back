import * as batchService from '../services/batch.service.js'

export const getAll = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query
  const result = await batchService.getAll({ page, limit, search })
  res.status(result.statusCode).json(result)
}

export const getById = async (req, res) => {
  const result = await batchService.getById(req.params.id)
  res.status(result.statusCode).json(result)
}

export const create = async (req, res) => {
  const result = await batchService.create(req.body)
  res.status(result.statusCode).json(result)
}

export const update = async (req, res) => {
  const result = await batchService.update(req.params.id, req.body)
  res.status(result.statusCode).json(result)
}

export const remove = async (req, res) => {
  const result = await batchService.remove(req.params.id)
  res.status(result.statusCode).json(result)
}