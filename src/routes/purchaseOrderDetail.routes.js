import { Router } from 'express'
import { addItem } from '../controllers/purchaseOrderDetail.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))

router.post('/', addItem)

export default router