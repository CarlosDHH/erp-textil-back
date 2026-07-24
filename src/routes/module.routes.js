import { Router } from 'express'
import { getAll, getById, create, update, remove } from '../controllers/module.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)

// Lectura abierta a cualquier usuario autenticado (ver role.routes.js para el motivo).
router.get('/', getAll)
router.get('/:id', getById)

router.post('/', authorize('admin'), create)
router.patch('/:id', authorize('admin'), update)
router.delete('/:id', authorize('admin'), remove)

export default router