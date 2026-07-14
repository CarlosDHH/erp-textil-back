import { Router } from 'express'
import { create, getAll, createExit, createExitFIFO, getKardex } from '../controllers/inventoryMovement.controller.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAll)
router.post('/', create)
router.post('/exit', createExit)
router.post('/exit-fifo', createExitFIFO)
router.get('/kardex/:supplyId', getKardex)

export default router