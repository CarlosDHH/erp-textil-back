import { Router } from 'express'
import { getAll, getById, create, update, receiveOrder } from '../controllers/purchaseOrder.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))

router.get('/', getAll)
router.post('/', create)
router.get('/:id', getById)
router.patch('/:id', update)
router.post('/:id/receive', receiveOrder)

export default router