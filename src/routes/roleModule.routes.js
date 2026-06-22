import { Router } from 'express'
import { getAll, create, update, remove } from '../controllers/roleModule.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))

router.get('/', getAll)
router.post('/', create)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router