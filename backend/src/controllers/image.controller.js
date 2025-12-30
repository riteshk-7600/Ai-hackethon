import imageService from '../services/image.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/images'
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
        }
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        cb(null, `upload-${uniqueSuffix}${ext}`)
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
        const mimetype = allowedTypes.test(file.mimetype)

        if (mimetype && extname) {
            return cb(null, true)
        } else {
            cb(new Error('Only image files are allowed!'))
        }
    }
})

export const uploadMiddleware = upload.array('images', 10) // Max 10 images

// NEW: Full image optimization with download
export async function optimizeAndDownload(req, res) {
    try {
        const { url } = req.body

        if (!url) {
            return res.status(400).json({ error: 'URL is required' })
        }

        logger.info(`Image optimization with download requested for: ${url}`)

        const results = await imageService.optimizeImagesFromUrl(url)

        // Persist to history
        await storageService.addAudit({
            url,
            type: 'Image Analysis',
            score: results.summary?.averageReductionPercent || 0,
            status: 'pass',
            issuesFound: results.summary?.totalImages || 0,
            criticalIssues: results.summary?.brokenImages || 0
        })

        res.json(results)

    } catch (error) {
        logger.error('Image optimization error:', error)
        res.status(500).json({
            error: 'Failed to optimize images',
            message: error.message
        })
    }
}

// Existing: Analyze only (no optimization)
export async function optimizeImages(req, res) {
    try {
        const { url } = req.body

        if (!url) {
            return res.status(400).json({ error: 'URL is required' })
        }

        logger.info(`Image analysis requested for: ${url}`)

        const results = await imageService.analyzeImages(url)

        // Persist to history
        await storageService.addAudit({
            url,
            type: 'Image Audit',
            score: results.score,
            status: results.score >= 80 ? 'pass' : results.score >= 60 ? 'warning' : 'fail',
            issuesFound: results.issues?.length || 0,
            criticalIssues: results.metadata?.missingImages || 0
        })

        res.json(results)

    } catch (error) {
        logger.error('Image analysis error:', error)
        res.status(500).json({
            error: 'Failed to analyze images',
            message: error.message
        })
    }
}

export async function analyzeUploadedImages(req, res) {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' })
        }

        logger.info(`Analyzing ${req.files.length} uploaded images`)

        const results = await imageService.analyzeUploadedImages(req.files)

        // Clean up uploaded files
        req.files.forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) logger.error('Error deleting file:', err)
            })
        })

        res.json(results)

    } catch (error) {
        logger.error('Uploaded image analysis error:', error)

        // Clean up files on error
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) logger.error('Error deleting file:', err)
                })
            })
        }

        res.status(500).json({
            error: 'Failed to analyze uploaded images',
            message: error.message
        })
    }
}
