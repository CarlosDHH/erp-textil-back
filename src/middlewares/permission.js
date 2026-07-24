import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'

const isAdmin = (role) => (role ?? '').toLowerCase() === 'admin'

const hasModulePermission = async (roleName, moduleSlug, action) => {
  const role = await prisma.role.findUnique({ where: { name: roleName } })
  if (!role) return false

  const module = await prisma.module.findUnique({ where: { slug: moduleSlug } })
  if (!module) return false

  const permission = await prisma.rolePermission.findUnique({
    where: { roleId_moduleId: { roleId: role.id, moduleId: module.id } },
  })

  return !!permission?.[action]
}

/**
 * Autoriza según el flag de permiso (canView/canCreate/canEdit/canDelete) que el rol
 * tiene configurado para el módulo indicado. Los administradores siempre pasan.
 */
export const requireModulePermission = (moduleSlug, action) => async (req, res, next) => {
  try {
    if (isAdmin(req.user?.role)) return next()

    const allowed = await hasModulePermission(req.user?.role, moduleSlug, action)
    if (!allowed) {
      return res.status(403).json(generateResponse(403, false, 'No tienes permiso para esta acción'))
    }
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * Igual que requireModulePermission, pero deja pasar sin validar permisos de módulo
 * cuando el recurso solicitado (req.params[idParam]) pertenece al propio usuario —
 * un usuario siempre puede acceder a su propio perfil, tenga o no permisos sobre
 * el módulo de Usuarios.
 */
export const authorizeSelfOrPermission = (moduleSlug, action, idParam = 'id') => async (req, res, next) => {
  if (req.params[idParam] && req.params[idParam] === req.user?.sub) return next()
  return requireModulePermission(moduleSlug, action)(req, res, next)
}
