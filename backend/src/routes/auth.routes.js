import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = Router()

// Public Routes
router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/forgot-password', authController.forgotPassword)

// Protected Routes
router.get('/profile', authenticate, authController.getProfile)
router.patch('/profile', authenticate, authController.updateProfile)
router.post('/change-password', authenticate, authController.changePassword)

export default router
