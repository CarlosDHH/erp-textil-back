import { Router } from 'express'
import { getAll, getById, create, update, remove } from '../controllers/batch.controller.js'
import { authenticate } from '../middlewares/auth.js'
import { requireModulePermission } from '../middlewares/permission.js'

const router = Router()

router.use(authenticate)

router.get('/', requireModulePermission('lotes', 'canView'), getAll)
router.post('/', requireModulePermission('lotes', 'canCreate'), create)
router.get('/:id', requireModulePermission('lotes', 'canView'), getById)
router.patch('/:id', requireModulePermission('lotes', 'canEdit'), update)
router.delete('/:id', requireModulePermission('lotes', 'canDelete'), remove)

export default router
