import imageOptimizerService from '../services/image-optimizer.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/temp-optimizer'
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
        }
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        cb(null, `raw-${uniqueSuffix}${ext}`)
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
        files: 20 // Max 20 images at once
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
        const mimetype = allowedTypes.test(file.mimetype)

        if (mimetype && extname) {
            return cb(null, true)
        } else {
            cb(new Error('Only image files are allowed (JPG, PNG, WebP, SVG, GIF)'))
        }
    }
})

// Wrap multer middleware to handle errors gracefully
const multerUpload = upload.array('images', 20)
export const uploadMiddleware = (req, res, next) => {
    multerUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    ok: false,
                    error: 'File too large',
                    message: 'One or more files exceed the 50MB size limit.'
                })
            }
            return res.status(400).json({
                ok: false,
                error: 'Upload Error',
                message: err.message
            })
        } else if (err) {
            return res.status(400).json({
                ok: false,
                error: 'Upload Error',
                message: err.message
            })
        }
        next()
    })
}

/**
 * Full image optimization with download
 * Processes uploaded images, optimizes to multiple formats, creates ZIP
 */
export const optimizeImages = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No images uploaded',
                message: 'Please upload at least one image'
            })
        }

        logger.info(`Processing ${req.files.length} images for optimization`)

        // Check for oversized files (double check, though multer handles it)
        const oversizedFiles = req.files.filter(f => f.size > 50 * 1024 * 1024)
        if (oversizedFiles.length > 0) {
            // Clean up uploaded files
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) logger.error('Error deleting file:', err)
                })
            })

            return res.status(400).json({
                ok: false,
                error: 'File too large',
                message: `One of the images exceeds 50MB limit`,
                failedFilesCount: oversizedFiles.length
            })
        }

        // Process images
        const results = await imageOptimizerService.optimizeUploadedImages(req.files)

        // Clean up original uploaded files (keep optimized versions)
        req.files.forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) logger.error('Error deleting temp file:', err)
            })
        })

        // Persist to history
        await storageService.addAudit({
            url: 'Batch Image Session',
            type: 'Image Optimization',
            score: results.averageReductionPercent,
            status: results.averageReductionPercent > 20 ? 'pass' : 'warning',
            issuesFound: results.totalImages,
            criticalIssues: results.failedImages
        })

        res.json(results)

    } catch (error) {
        logger.error('Image optimization error:', error)

        // Clean up files on error
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) logger.error('Error deleting file:', err)
                })
            })
        }

        res.status(500).json({
            ok: false,
            error: 'Optimization failed',
            message: error.message || 'Failed to optimize images. Please try again.'
        })
    }
}

export const generateAINames = async (req, res, next) => {
    try {
        const { sessionId } = req.body
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' })
        }

        const result = await imageOptimizerService.generateAINames(sessionId)
        res.json({ ok: true, results: result })
    } catch (error) {
        console.error('AI Name Gen Error', error)
        res.status(500).json({ error: error.message })
    }
}

export const applyAINames = async (req, res, next) => {
    try {
        const { sessionId, nameMapping } = req.body
        if (!sessionId || !nameMapping) {
            return res.status(400).json({ error: 'Session ID and name mapping required' })
        }

        const result = await imageOptimizerService.applyAINames(sessionId, nameMapping)
        res.json({ ok: true, ...result })
    } catch (error) {
        console.error('AI Apply Error', error)
        res.status(500).json({ error: error.message })
    }
}
