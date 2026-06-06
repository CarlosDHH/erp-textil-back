import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'

export const getAll = async ({ page, limit, search } = {}) => {
  try {
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        ...paginate(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.role.count({ where }),
    ])

    return generateResponse(200, true, 'Roles obtenidos', paginatedResponse(roles, total, page, limit))
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener roles', null, error.message)
  }
}

export const getById = async (id) => {
  try {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) return generateResponse(404, false, 'Rol no encontrado')
    return generateResponse(200, true, 'Rol obtenido', role)
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener rol', null, error.message)
  }
}

export const create = async (data) => {
  try {
    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description ?? null,
      },
    })
    return generateResponse(201, true, 'Rol creado', role)
  } catch (error) {
    return generateResponse(500, false, 'Error al crear rol', null, error.message)
  }
}

export const update = async (id, data) => {
  try {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) return generateResponse(404, false, 'Rol no encontrado')

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return generateResponse(200, true, 'Rol actualizado', updated)
  } catch (error) {
    return generateResponse(500, false, 'Error al actualizar rol', null, error.message)
  }
}

export const remove = async (id) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })
    if (!role) return generateResponse(404, false, 'Rol no encontrado')
    if (role._count.users > 0) {
      return generateResponse(409, false, 'No se puede eliminar un rol con usuarios asignados')
    }

    await prisma.role.delete({ where: { id } })
    return generateResponse(200, true, 'Rol eliminado')
  } catch (error) {
    return generateResponse(500, false, 'Error al eliminar rol', null, error.message)
  }
}
