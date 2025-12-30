import performanceService from '../services/performance.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'

export async function analyzePerformance(req, res) {
    try {
        const { url } = req.body

        if (!url) {
            return res.status(400).json({ error: 'URL is required' })
        }

        logger.info(`Performance analysis requested for: ${url}`)

        const results = await performanceService.analyzePerformance(url)

        // Persist to history
        await storageService.addAudit({
            url,
            type: 'Performance Audit',
            score: results.score || 0,
            status: (results.score || 0) >= 80 ? 'pass' : (results.score || 0) >= 60 ? 'warning' : 'fail',
            issuesFound: results.metrics?.filter(m => m.status === 'error').length || 0,
            criticalIssues: results.metrics?.filter(m => m.severity === 'high').length || 0
        })

        res.json(results)

    } catch (error) {
        logger.error('Performance analysis error:', error)
        res.status(500).json({
            error: 'Failed to analyze performance',
            message: error.message
        })
    }
}
