import comparatorService from '../services/comparator.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'

export async function compareEnvironments(req, res) {
    try {
        const { liveUrl, stageUrl } = req.body

        if (!liveUrl || !stageUrl) {
            return res.status(400).json({ error: 'Both live and stage URLs are required' })
        }

        logger.info(`Comparing: ${liveUrl} vs ${stageUrl}`)

        const results = await comparatorService.compareEnvironments(liveUrl, stageUrl)

        // Persist to history
        await storageService.addAudit({
            url: `${liveUrl} vs ${stageUrl}`,
            type: 'Environment Comparison',
            score: results.visualDiff?.similarity || 100,
            status: (results.visualDiff?.similarity || 100) >= 95 ? 'pass' : 'warning',
            issuesFound: results.differences?.length || 0,
            criticalIssues: results.differences?.filter(d => d.severity === 'high').length || 0
        })

        res.json(results)

    } catch (error) {
        logger.error('Comparison error:', error)
        res.status(500).json({
            error: 'Failed to compare environments',
            message: error.message
        })
    }
}
