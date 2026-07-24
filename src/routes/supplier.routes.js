import { Router } from 'express'
import { getAll, getById, create, update, remove } from '../controllers/supplier.controller.js'
import { authenticate } from '../middlewares/auth.js'
import { requireModulePermission } from '../middlewares/permission.js'

const router = Router()

router.use(authenticate)

router.get('/', requireModulePermission('proveedores', 'canView'), getAll)
router.post('/', requireModulePermission('proveedores', 'canCreate'), create)
router.get('/:id', requireModulePermission('proveedores', 'canView'), getById)
router.patch('/:id', requireModulePermission('proveedores', 'canEdit'), update)
router.delete('/:id', requireModulePermission('proveedores', 'canDelete'), remove)

export default router
