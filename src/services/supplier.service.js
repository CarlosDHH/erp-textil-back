import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'

const safeSupplier = (supplier) => ({
  id: supplier.id,
  name: supplier.name,
  rfc: supplier.rfc,
  phone: supplier.phone,
  email: supplier.email,
  contactName: supplier.contactName,
  active: supplier.active,
  createdAt: supplier.createdAt,
})

export const getAll = async ({ page, limit, search } = {}) => {
  try {
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { rfc: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        ...paginate(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where }),
    ])

    return generateResponse(
      200,
      true,
      'Proveedores obtenidos',
      paginatedResponse(suppliers.map(safeSupplier), total, page, limit)
    )
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener proveedores', null, error.message)
  }
}

export const getById = async (id) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) return generateResponse(404, false, 'Proveedor no encontrado')

    return generateResponse(200, true, 'Proveedor obtenido', safeSupplier(supplier))
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener proveedor', null, error.message)
  }
}

export const create = async (data) => {
  try {
    // Validar email duplicado (opcional)
    if (data.email) {
      const exists = await prisma.supplier.findFirst({
        where: { email: data.email },
      })
      if (exists) return generateResponse(409, false, 'Ya existe un proveedor con ese email')
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        rfc: data.rfc ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        contactName: data.contactName ?? null,
      },
    })

    return generateResponse(201, true, 'Proveedor creado', safeSupplier(supplier))
  } catch (error) {
    return generateResponse(500, false, 'Error al crear proveedor', null, error.message)
  }
}

export const update = async (id, data) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) return generateResponse(404, false, 'Proveedor no encontrado')

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.rfc !== undefined && { rfc: data.rfc }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.active !== undefined && { active: data.active }),
      },
    })

    return generateResponse(200, true, 'Proveedor actualizado', safeSupplier(updated))
  } catch (error) {
    return generateResponse(500, false, 'Error al actualizar proveedor', null, error.message)
  }
}

export const remove = async (id) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) return generateResponse(404, false, 'Proveedor no encontrado')

    // Como no tienes deleted → usamos active = false
    await prisma.supplier.update({
      where: { id },
      data: { active: false },
    })

    return generateResponse(200, true, 'Proveedor desactivado')
  } catch (error) {
    return generateResponse(500, false, 'Error al eliminar proveedor', null, error.message)
  }
}