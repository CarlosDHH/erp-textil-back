import { Router } from 'express'
import { getAll, getById, create, update } from '../controllers/purchaseOrder.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))

router.get('/', getAll)
router.post('/', create)
router.get('/:id', getById)
router.patch('/:id', update)

export default router