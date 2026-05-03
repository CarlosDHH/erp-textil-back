import * as svc from '../services/customer.service.js'

export const getAll = async (req, res, next) => {
  try {
    const result = await svc.getAll(req.query)
    return res.status(result.statusCode).json(result)
  } catch (error) { next(error) }
}

export const getById = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id)
    return res.status(result.statusCode).json(result)
  } catch (error) { next(error) }
}

export const create = async (req, res, next) => {
  try {
    const result = await svc.create(req.body)
    return res.status(result.statusCode).json(result)
  } catch (error) { next(error) }
}

export const update = async (req, res, next) => {
  try {
    const result = await svc.update(req.params.id, req.body)
    return res.status(result.statusCode).json(result)
  } catch (error) { next(error) }
}

export const remove = async (req, res, next) => {
  try {
    const result = await svc.remove(req.params.id)
    return res.status(result.statusCode).json(result)
  } catch (error) { next(error) }
}

export const bulkCreate = async (req, res, next) => {
  try {
    const { planId, customers } = req.body
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ statusCode: 400, success: false, message: 'El campo "customers" debe ser un array no vacío' })
    }
    const result = await svc.bulkCreate(customers, planId)
    return res.status(result.statusCode).json(result)
  } catch (error) { next(error) }
}