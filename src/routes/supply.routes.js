import { Router } from 'express'
import { getAll, getById, create, update, remove } from '../controllers/supply.controller.js'
import { authenticate } from '../middlewares/auth.js'
import { requireModulePermission } from '../middlewares/permission.js'

const router = Router()

router.use(authenticate)

router.get('/', requireModulePermission('insumos', 'canView'), getAll)
router.post('/', requireModulePermission('insumos', 'canCreate'), create)
router.get('/:id', requireModulePermission('insumos', 'canView'), getById)
router.patch('/:id', requireModulePermission('insumos', 'canEdit'), update)
router.delete('/:id', requireModulePermission('insumos', 'canDelete'), remove)

export default router