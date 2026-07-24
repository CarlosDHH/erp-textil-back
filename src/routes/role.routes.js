import { Router } from 'express'
import { getAll, getById, create, update, remove } from '../controllers/role.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)

// Lectura abierta a cualquier usuario autenticado: el propio sistema de permisos
// necesita poder resolver roles/módulos/permisos para calcular lo que el usuario puede ver.
router.get('/', getAll)
router.get('/:id', getById)

router.post('/', authorize('admin'), create)
router.put('/:id', authorize('admin'), update)
router.delete('/:id', authorize('admin'), remove)

export default router
