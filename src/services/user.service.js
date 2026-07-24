import bcrypt from 'bcryptjs'
import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'
import { ENTITY, diffFields, logUpdate } from './activityLog.service.js'

const SALT_ROUNDS = 10
const baseWhere = { deleted: false }

/**
 * Campos auditables del usuario y su etiqueta en la bitácora.
 * `passwordHash` queda fuera a propósito: la bitácora se muestra en el perfil y
 * no debe reflejar nada relativo a las credenciales.
 */
const USER_AUDIT_FIELDS = {
  name: 'nombre',
  lastName: 'apellido',
  phone: 'teléfono',
  roleId: 'rol',
  active: 'estado',
}

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

/**
 * Verifica si un teléfono ya está registrado por otro usuario (no eliminado).
 * `excludeId` permite excluir al propio usuario en modo edición.
 */
export const checkPhone = async (phone, excludeId) => {
  try {
    if (!phone) return generateResponse(200, true, 'Teléfono disponible', { exists: false })

    const user = await prisma.user.findFirst({
      where: {
        phone,
        deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })

    return generateResponse(200, true, 'Verificación de teléfono', { exists: !!user })
  } catch (error) {
    return generateResponse(500, false, 'Error al verificar teléfono', null, error.message)
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

/**
 * Edición de usuario, con registro en la bitácora de actividad.
 *
 * @param {string} id
 * @param {object} data
 * @param {string} [editorId] Quién hace el cambio (no quién lo recibe). El
 *   evento se atribuye al editor, que es como lo consulta la pestaña
 *   "Actividad Reciente": muestra lo que ese usuario hizo.
 */
export const update = async (id, data, editorId) => {
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

    // Igual que en insumos: la bitácora se escribe después y sin transacción,
    // para que un fallo al auditar no deshaga una edición ya guardada.
    await logUpdate({
      userId: editorId,
      entity: ENTITY.USER,
      entityId: updated.id,
      entityName: `${updated.name} ${updated.lastName}`.trim(),
      changedFields: diffFields(user, updated, USER_AUDIT_FIELDS),
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
