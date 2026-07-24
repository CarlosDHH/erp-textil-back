import { Router } from 'express'
import { login, refresh, forgotPassword, resetPassword } from '../controllers/auth.controller.js'
import {
    getBiometricRegistrationOptions,
    verifyBiometricRegistration,
    getBiometricAuthenticationOptions,
    verifyBiometricAuthentication,
} from '../controllers/auth.controller.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()

router.post('/login', login)
router.post('/refresh', refresh)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

router.get('/biometric/register/options', authenticate, getBiometricRegistrationOptions)
router.post('/biometric/register/verify', authenticate, verifyBiometricRegistration)
router.post('/biometric/login/options', getBiometricAuthenticationOptions)
router.post('/biometric/login/verify', verifyBiometricAuthentication)

export default router
