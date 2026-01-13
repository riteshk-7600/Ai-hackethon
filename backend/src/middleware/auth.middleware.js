import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger.js'
import userService from '../services/user.service.js'

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required. Please login.' })
        }

        const token = authHeader.split(' ')[1]
        const jwtSecret = process.env.JWT_SECRET

        if (!jwtSecret) {
            logger.error('CRITICAL: JWT_SECRET environment variable is not defined!')
            return res.status(500).json({ error: 'Server configuration error' })
        }

        const decoded = jwt.verify(token, jwtSecret)

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
