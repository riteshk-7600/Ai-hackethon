import jwt from 'jsonwebtoken'
import userService from '../services/user.service.js'
import { logger } from '../utils/logger.js'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-123'
const JWT_EXPIRES_IN = '7d'

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' })
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' })
        }

        const newUser = await userService.createUser({ name, email, password })

        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

        logger.info(`User registered: ${email}`)
        res.status(201).json({ user: newUser, token })
    } catch (error) {
        logger.error('Registration error:', error.message)
        res.status(400).json({ error: error.message })
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await userService.findByEmail(email)

        if (!user || !(await userService.verifyPassword(user, password))) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

        // Track session
        await userService.addSession(user.id, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            device: 'Web Browser'
        })

        const { password: _, ...safeUser } = user

        logger.info(`User logged in: ${email}`)
        res.json({ user: safeUser, token })
    } catch (error) {
        logger.error('Login error:', error.message)
        res.status(400).json({ error: error.message })
    }
}

export const getProfile = async (req, res) => {
    res.json({ user: req.user })
}

export const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body
        const userId = req.user.id

        const updatedUser = await userService.updateUser(userId, { name, email })
        logger.info(`Profile updated for user: ${userId}`)
        res.json({ user: updatedUser })
    } catch (error) {
        logger.error('Update profile error:', error.message)
        res.status(400).json({ error: error.message })
    }
}

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        const userId = req.user.id

        const user = await userService.findById(userId)
        if (!(await userService.verifyPassword(user, currentPassword))) {
            return res.status(400).json({ error: 'Current password is incorrect' })
        }

        await userService.updateUser(userId, { password: newPassword })
        logger.info(`Password changed for user: ${userId}`)
        res.json({ message: 'Password updated successfully' })
    } catch (error) {
        logger.error('Change password error:', error.message)
        res.status(400).json({ error: error.message })
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        const user = await userService.findByEmail(email)

        if (!user) {
            // Don't reveal user existence for security, still say check email
            return res.json({ message: 'If an account exists with that email, a reset link has been sent.' })
        }

        // Simulate token generation and email sending
        const resetToken = jwt.sign({ id: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' })
        logger.info(`Password reset requested for: ${email}. Simulated token: ${resetToken}`)

        res.json({
            message: 'If an account exists with that email, a reset link has been sent.',
            simulatedToken: resetToken // For demo/development convenience
        })
    } catch (error) {
        logger.error('Forgot password error:', error.message)
        res.status(400).json({ error: error.message })
    }
}
