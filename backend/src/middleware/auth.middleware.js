import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger.js'
import userService from '../services/user.service.js'

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // TEMPORARY BYPASS FOR TESTING - REMOVE IN PRODUCTION
            logger.warn('Authentication bypassed - using mock user')
            req.user = {
                id: '1766755530976',
                name: 'Guest User',
                email: 'guest@example.com',
                role: 'user'
            }
            return next()
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-123')

        const user = await userService.findById(decoded.id)
        if (!user) {
            return res.status(401).json({ error: 'User not found' })
        }

        // Add user info to request (without sensitive fields)
        const { password, ...safeUser } = user
        req.user = safeUser
        next()
    } catch (error) {
        logger.error('Authentication error:', error.message)
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please login again.' })
        }
        return res.status(401).json({ error: 'Invalid token' })
    }
}
