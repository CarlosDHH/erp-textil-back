import { Router } from 'express'
import { getAll, getById, create, update, remove } from '../controllers/role.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))

router.get('/', getAll)
router.post('/', create)
router.get('/:id', getById)
router.put('/:id', update)
router.delete('/:id', remove)

export default router
