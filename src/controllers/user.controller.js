import * as userService from '../services/user.service.js'

export const getAll = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query
  const result = await userService.getAll({ page, limit, search })
  res.status(result.statusCode).json(result)
}

export const getById = async (req, res) => {
  const result = await userService.getById(req.params.id)
  res.status(result.statusCode).json(result)
}

export const checkPhone = async (req, res) => {
  const { phone, excludeId } = req.query
  const result = await userService.checkPhone(phone, excludeId)
  res.status(result.statusCode).json(result)
}

export const create = async (req, res) => {
  const result = await userService.create(req.body)
  res.status(result.statusCode).json(result)
}

export const update = async (req, res) => {
  // Se pasa quién edita (no a quién se edita): la bitácora atribuye el cambio a su autor.
  const result = await userService.update(req.params.id, req.body, req.user?.sub)
  res.status(result.statusCode).json(result)
}

export const remove = async (req, res) => {
  const result = await userService.remove(req.params.id)
  res.status(result.statusCode).json(result)
}
