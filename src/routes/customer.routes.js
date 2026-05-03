import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import { apiKey } from '../middlewares/apiKey.js'
import * as customerController from '../controllers/customer.controller.js'

const router = Router()

router.post('/bulk', apiKey, customerController.bulkCreate)

router.use(authenticate)

router.get('/',     customerController.getAll)
router.get('/:id',  customerController.getById)
router.post('/',    authorize('ADMIN', 'OPERATOR'), customerController.create)
router.patch('/:id',  authorize('ADMIN', 'OPERATOR'), customerController.update)
router.delete('/:id', authorize('ADMIN'),           customerController.remove)

export default router