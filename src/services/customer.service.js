import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'

const baseWhere = { deleted: false }

export const getAll = async ({ page, limit, search, active } = {}) => {
  try {
    const where = {
      ...baseWhere,
      ...(active !== undefined && { active: active === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { municipality: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        ...paginate(page, limit),
        orderBy: { name: 'asc' },
        include: {
          contracts: {
            where: { deleted: false, status: 'ACTIVE' },
            include: { plan: true, payments: { where: { deleted: false }, orderBy: { paidAt: 'desc' }, take: 1 } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.customer.count({ where }),
    ])

    return generateResponse(200, true, 'Clientes obtenidos', paginatedResponse(customers, total, page, limit))
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener clientes', null, error.message)
  }
}

export const getById = async (id) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id, ...baseWhere },
      include: {
        contracts: {
          where: { deleted: false },
          include: {
            plan: true,
            payments: {
              where: { deleted: false },
              orderBy: { paidAt: 'desc' },
              take: 5,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) return generateResponse(404, false, 'Cliente no encontrado')

    return generateResponse(200, true, 'Cliente obtenido', customer)
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener cliente', null, error.message)
  }
}

export const create = async (data) => {
  try {
    const exists = await prisma.customer.findFirst({
      where: { email: data.email, ...baseWhere },
    })
    if (exists) return generateResponse(409, false, 'Ya existe un cliente con ese correo')

    const customer = await prisma.customer.create({ data })

    return generateResponse(201, true, 'Cliente creado', customer)
  } catch (error) {
    return generateResponse(500, false, 'Error al crear cliente', null, error.message)
  }
}

export const update = async (id, data) => {
  try {
    const customer = await prisma.customer.findFirst({ where: { id, ...baseWhere } })
    if (!customer) return generateResponse(404, false, 'Cliente no encontrado')

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.municipality && { municipality: data.municipality }),
        ...(data.city && { city: data.city }),
        ...(data.active !== undefined && { active: data.active }),
      },
    })

    return generateResponse(200, true, 'Cliente actualizado', updated)
  } catch (error) {
    return generateResponse(500, false, 'Error al actualizar cliente', null, error.message)
  }
}

export const bulkCreate = async (records) => {
  const created = []
  const failed = []

  for (let i = 0; i < records.length; i++) {
    const raw = records[i]
    try {
      if (raw.email) {
        const exists = await prisma.customer.findFirst({
          where: { email: raw.email, ...baseWhere },
        })
        if (exists) {
          failed.push({ index: i, email: raw.email ?? null, reason: 'Email duplicado' })
          continue
        }
      }

      const customer = await prisma.customer.create({
        data: {
          name:         raw.name,
          lastName:     raw.lastName     || 'N/A',
          email:        raw.email        || null,
          phone:        raw.phone        || 'N/A',
          municipality: raw.municipality || 'N/A',
          city:         raw.city         || 'N/A',
        },
      })
      created.push(customer.id)
    } catch (error) {
      failed.push({ index: i, email: raw.email ?? null, reason: error.message })
    }
  }

  return generateResponse(201, true, `Carga completada: ${created.length} creados, ${failed.length} fallidos`, {
    created: created.length,
    failed,
  })
}

export const remove = async (id) => {
  try {
    const customer = await prisma.customer.findFirst({ where: { id, ...baseWhere } })
    if (!customer) return generateResponse(404, false, 'Cliente no encontrado')

    await prisma.customer.update({
      where: { id },
      data: { deleted: true, active: false },
    })

    return generateResponse(200, true, 'Cliente eliminado')
  } catch (error) {
    return generateResponse(500, false, 'Error al eliminar cliente', null, error.message)
  }
}