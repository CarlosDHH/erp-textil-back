import { Router } from 'express'
import { getAll, create, update, remove } from '../controllers/roleModule.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)

// Lectura abierta a cualquier usuario autenticado (ver role.routes.js para el motivo).
router.get('/', getAll)

router.post('/', authorize('admin'), create)
router.patch('/:id', authorize('admin'), update)
router.delete('/:id', authorize('admin'), remove)

export default router