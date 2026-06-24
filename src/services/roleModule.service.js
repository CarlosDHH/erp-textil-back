import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'

const safeRoleModule = (rm) => ({
  id: rm.id,
  roleId: rm.roleId,
  moduleId: rm.moduleId,
  canView: rm.canView,
  canCreate: rm.canCreate,
  canEdit: rm.canEdit,
  canDelete: rm.canDelete,
})

export const getAll = async () => {
  try {
    const data = await prisma.rolePermission.findMany()
    return generateResponse(200, true, 'Permisos obtenidos', data.map(safeRoleModule))
  } catch (error) {
    return generateResponse(500, false, 'Error al obtener permisos', null, error.message)
  }
}

export const create = async (data) => {
  try {
    const exists = await prisma.rolePermission.findFirst({
      where: {
        roleId: data.roleId,
        moduleId: data.moduleId,
      },
    })

    if (exists) {
      return generateResponse(409, false, 'El permiso ya existe para este rol y módulo')
    }

    const rm = await prisma.rolePermission.create({
      data: {
        roleId: data.roleId,
        moduleId: data.moduleId,
        canView: data.canView ?? false,
        canCreate: data.canCreate ?? false,
        canEdit: data.canEdit ?? false,
        canDelete: data.canDelete ?? false,
      },
    })

    return generateResponse(201, true, 'Permiso creado', safeRoleModule(rm))
  } catch (error) {
    return generateResponse(500, false, 'Error al crear permiso', null, error.message)
  }
}

export const update = async (id, data) => {
  try {
    const exists = await prisma.rolePermission.findUnique({ where: { id } })
    if (!exists) return generateResponse(404, false, 'Permiso no encontrado')

    const updated = await prisma.rolePermission.update({
      where: { id },
      data: {
        ...(data.canView !== undefined && { canView: data.canView }),
        ...(data.canCreate !== undefined && { canCreate: data.canCreate }),
        ...(data.canEdit !== undefined && { canEdit: data.canEdit }),
        ...(data.canDelete !== undefined && { canDelete: data.canDelete }),
      },
    })

    return generateResponse(200, true, 'Permiso actualizado', safeRoleModule(updated))
  } catch (error) {
    return generateResponse(500, false, 'Error al actualizar permiso', null, error.message)
  }
}

export const remove = async (id) => {
  try {
    const exists = await prisma.rolePermission.findUnique({ where: { id } })
    if (!exists) return generateResponse(404, false, 'Permiso no encontrado')

    await prisma.rolePermission.delete({ where: { id } })

    return generateResponse(200, true, 'Permiso eliminado')
  } catch (error) {
    return generateResponse(500, false, 'Error al eliminar permiso', null, error.message)
  }
}