import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import auditRoutes from './routes/audit.routes.js'
import authRoutes from './routes/auth.routes.js'
import pagespeedRoutes from './routes/pagespeed.routes.js'
import emailRoutes from './routes/email.routes.js'
import { authenticate } from './middleware/auth.middleware.js'
import { logger } from './utils/logger.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
}))
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static file serving for uploads (screenshots, reports, etc.)
app.use('/uploads', express.static('uploads'))
// Serve downloads (optimized images, ZIP files) with nested session directories
app.use('/downloads', express.static('uploads/downloads', {
    setHeaders: (res, filepath) => {
        // Allow CORS for downloads
        res.set('Access-Control-Allow-Origin', '*')
        // Set proper content types
        if (filepath.endsWith('.zip')) {
            res.set('Content-Type', 'application/zip')
        }
        // Force download with correct filename
        if (filepath.endsWith('.zip')) {
            res.set('Content-Disposition', 'attachment; filename="optimized-images.zip"')
        } else {
            res.set('Content-Disposition', `attachment; filename="${path.basename(filepath)}"`)
        }
        // Allow cross-origin resource loading (essential for img tags)
        res.set('Cross-Origin-Resource-Policy', 'cross-origin')
    }
}))

// Request logging in development
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        logger.info(`${req.method} ${req.path}`)
        next()
    })
}

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/audit', authenticate, auditRoutes)
app.use('/api/pagespeed', authenticate, pagespeedRoutes)
app.use('/api/email', emailRoutes)

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Endpoint not found',
            path: req.path
        }
    })
})

// Error handling middleware
app.use((err, req, res, next) => {
    // Log error with details
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    })

    // Determine status code
    const statusCode = err.statusCode || err.status || 500

    // Prepare error response
    const errorResponse = {
        error: {
            message: err.message || 'Internal server error',
            type: err.name || 'Error'
        }
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack
        errorResponse.error.details = err.details || null
    }

    res.status(statusCode).json(errorResponse)
})

// Start server if not running in a serverless environment (Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`)
        logger.info(`📊 Environment: ${process.env.NODE_ENV}`)
    })
}

export default app
