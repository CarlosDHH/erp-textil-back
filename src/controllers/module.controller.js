import * as moduleService from '../services/module.service.js'

export const getAll = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query
  const result = await moduleService.getAll({ page, limit, search })
  res.status(result.statusCode).json(result)
}

export const getById = async (req, res) => {
  const result = await moduleService.getById(req.params.id)
  res.status(result.statusCode).json(result)
}

export const create = async (req, res) => {
  const result = await moduleService.create(req.body)
  res.status(result.statusCode).json(result)
}

export const update = async (req, res) => {
  const result = await moduleService.update(req.params.id, req.body)
  res.status(result.statusCode).json(result)
}

export const remove = async (req, res) => {
  const result = await moduleService.remove(req.params.id)
  res.status(result.statusCode).json(result)
}