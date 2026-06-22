import * as roleModuleService from '../services/roleModule.service.js'

export const getAll = async (req, res) => {
  const result = await roleModuleService.getAll()
  res.status(result.statusCode).json(result)
}

export const create = async (req, res) => {
  const result = await roleModuleService.create(req.body)
  res.status(result.statusCode).json(result)
}

export const update = async (req, res) => {
  const result = await roleModuleService.update(req.params.id, req.body)
  res.status(result.statusCode).json(result)
}

export const remove = async (req, res) => {
  const result = await roleModuleService.remove(req.params.id)
  res.status(result.statusCode).json(result)
}