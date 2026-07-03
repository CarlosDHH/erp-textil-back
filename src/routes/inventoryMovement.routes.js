import { Router } from 'express'
import { create, getAll } from '../controllers/inventoryMovement.controller.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAll)
router.post('/', create)

export default router