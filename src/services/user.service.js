import bcrypt from 'bcryptjs'
import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'

const SALT_ROUNDS = 10
const baseWhere = { deleted: false }

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role?.name ?? null,
  active: user.active,
  createdAt: user.createdAt,
})

export const getAll = async ({ page, limit, search } = {}) => {
  try {
    const where = {
      ...baseWhere,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({  
        where,
        include: { role: { select: { name: true } } },
        ...paginate(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return generateResponse(200, true, 'Usuarios obtenidos', paginatedResponse(users.map(safeUser), total, page, limit))
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener usuarios', null, error.message)
  }
}

export const getById = async (id) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id, ...baseWhere },
      include: { role: { select: { name: true } } },
    })

    if (!user) return generateResponse(404, false, 'Usuario no encontrado')

    return generateResponse(200, true, 'Usuario obtenido', safeUser(user))
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener usuario', null, error.message)
  }
}

export const create = async (data) => {
  try {
    const exists = await prisma.user.findFirst({ where: { email: data.email, ...baseWhere } })
    if (exists) return generateResponse(409, false, 'Ya existe un usuario con ese email')

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? null,
        roleId: data.roleId,
        passwordHash,
      },
      include: { role: { select: { name: true } } },
    })

    return generateResponse(201, true, 'Usuario creado', safeUser(user))
  } catch (error) {
    return generateResponse(500, false, 'Error al crear usuario', null, error.message)
  }
}

export const update = async (id, data) => {
  try {
    const user = await prisma.user.findFirst({ where: { id, ...baseWhere } })
    if (!user) return generateResponse(404, false, 'Usuario no encontrado')

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.roleId && { roleId: data.roleId }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: { role: { select: { name: true } } },
    })

    return generateResponse(200, true, 'Usuario actualizado', safeUser(updated))
  } catch (error) {
    return generateResponse(500, false, 'Error al actualizar usuario', null, error.message)
  }
}

export const remove = async (id) => {
  try {
    const user = await prisma.user.findFirst({ where: { id, ...baseWhere } })
    if (!user) return generateResponse(404, false, 'Usuario no encontrado')

    await prisma.user.update({ where: { id }, data: { deleted: true, active: false } })

    return generateResponse(200, true, 'Usuario eliminado')
  } catch (error) {
    return generateResponse(500, false, 'Error al eliminar usuario', null, error.message)
  }
}
