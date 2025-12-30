import docsService from '../services/docs.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'
import multer from 'multer'

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith('.zip')) {
            cb(null, true)
        } else {
            cb(new Error('Only ZIP files are allowed'))
        }
    }
})

export const uploadMiddleware = upload.single('file')

export async function generateDocs(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ZIP file is required' })
        }

        logger.info('Documentation generation requested')

        const results = await docsService.generateDocs(req.file.buffer)

        // Persist to history
        await storageService.addAudit({
            url: 'Source Code Documentation',
            type: 'Documentation',
            score: results.accessibility?.score || 100,
            status: 'pass',
            issuesFound: results.components?.length || 0,
            criticalIssues: results.accessibility?.issues?.filter(i => i.severity === 'High').length || 0
        })

        res.json(results)

    } catch (error) {
        logger.error('Documentation generation error:', error)
        res.status(500).json({
            error: 'Failed to generate documentation',
            message: error.message
        })
    }
}
