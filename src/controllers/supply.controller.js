import * as supplyService from '../services/supply.service.js'

export const getAll = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query
  const result = await supplyService.getAll({ page, limit, search })
  res.status(result.statusCode).json(result)
}

export const getById = async (req, res) => {
  const result = await supplyService.getById(req.params.id)
  res.status(result.statusCode).json(result)
}

export const create = async (req, res) => {
  const result = await supplyService.create(req.body)
  res.status(result.statusCode).json(result)
}

export const update = async (req, res) => {
  const result = await supplyService.update(req.params.id, req.body)
  res.status(result.statusCode).json(result)
}

export const remove = async (req, res) => {
  const result = await supplyService.remove(req.params.id)
  res.status(result.statusCode).json(result)
}