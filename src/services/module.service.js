import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'

const safeModule = (module) => ({
  id: module.id,
  slug: module.slug,
  name: module.name,
  description: module.description,
  icon: module.icon,
  path: module.path,
  parentId: module.parentId,
  sortOrder: module.sortOrder,
  isActive: module.isActive,
})

export const getAll = async ({ page, limit, search } = {}) => {
  try {
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [modules, total] = await Promise.all([
      prisma.module.findMany({
        where,
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        ...paginate(page, limit),
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.module.count({ where }),
    ])

    return generateResponse(
      200,
      true,
      'Módulos obtenidos',
      paginatedResponse(modules.map(safeModule), total, page, limit)
    )
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener módulos', null, error.message)
  }
}

export const getById = async (id) => {
  try {
    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    })

    if (!module) return generateResponse(404, false, 'Módulo no encontrado')

    return generateResponse(200, true, 'Módulo obtenido', safeModule(module))
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener módulo', null, error.message)
  }
}

export const create = async (data) => {
  try {
    const exists = await prisma.module.findUnique({
      where: { slug: data.slug },
    })

    if (exists) return generateResponse(409, false, 'El slug ya existe')

    const module = await prisma.module.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? null,
        path: data.path ?? null,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    })

    return generateResponse(201, true, 'Módulo creado', safeModule(module))
  } catch (error) {
    return generateResponse(500, false, 'Error al crear módulo', null, error.message)
  }
}

export const update = async (id, data) => {
  try {
    const module = await prisma.module.findUnique({ where: { id } })
    if (!module) return generateResponse(404, false, 'Módulo no encontrado')

    const updated = await prisma.module.update({
      where: { id },
      data: {
        ...(data.slug && { slug: data.slug }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.path !== undefined && { path: data.path }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return generateResponse(200, true, 'Módulo actualizado', safeModule(updated))
  } catch (error) {
    return generateResponse(500, false, 'Error al actualizar módulo', null, error.message)
  }
}

export const remove = async (id) => {
  try {
    const module = await prisma.module.findUnique({ where: { id } })
    if (!module) return generateResponse(404, false, 'Módulo no encontrado')

    await prisma.module.update({
      where: { id },
      data: { isActive: false },
    })

    return generateResponse(200, true, 'Módulo desactivado')
  } catch (error) {
    return generateResponse(500, false, 'Error al eliminar módulo', null, error.message)
  }
}