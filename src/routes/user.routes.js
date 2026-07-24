import { Router } from 'express'
import { getAll, getById, create, update, remove, checkPhone } from '../controllers/user.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'
import { authorizeSelfOrPermission, requireModulePermission } from '../middlewares/permission.js'

const router = Router()

router.use(authenticate)

router.get('/', requireModulePermission('usuarios', 'canView'), getAll)
// Debe declararse antes de '/:id' para que no lo capture como un id.
router.get('/check-phone', requireModulePermission('usuarios', 'canView'), checkPhone)
router.post('/', authorize('admin'), create)
// Un usuario siempre puede ver su propio perfil, aunque no tenga permisos sobre el módulo Usuarios.
router.get('/:id', authorizeSelfOrPermission('usuarios', 'canView'), getById)
router.put('/:id', authorize('admin'), update)
router.delete('/:id', authorize('admin'), remove)

export default router
