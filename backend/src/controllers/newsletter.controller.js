import newsletterService from '../services/newsletter.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'

export async function testNewsletter(req, res) {
    try {
        const { emailHtml, options } = req.body

        if (!emailHtml) {
            return res.status(400).json({ error: 'Email HTML is required' })
        }

        logger.info('Newsletter test requested')

        const results = await newsletterService.testNewsletter(emailHtml, options || {})

        // Persist to history
        await storageService.addAudit({
            url: 'Email Template',
            type: 'Newsletter',
            score: results.score,
            status: results.score >= 80 ? 'pass' : results.score >= 60 ? 'warning' : 'fail',
            issuesFound: results.issues.length,
            criticalIssues: results.issues.filter(i => i.severity === 'critical').length
        })

        res.json(results)

    } catch (error) {
        logger.error('Newsletter test error:', error)
        res.status(500).json({
            error: 'Failed to test newsletter',
            message: error.message
        })
    }
}

export async function autoFixNewsletter(req, res) {
    try {
        const { emailHtml } = req.body

        if (!emailHtml) {
            return res.status(400).json({ error: 'Email HTML is required' })
        }

        logger.info('Newsletter auto-fix requested')

        const results = await newsletterService.autoFixHTML(emailHtml)

        // Persist to history
        await storageService.addAudit({
            url: 'Email Template (Auto-Fix)',
            type: 'Newsletter Fix',
            score: 100,
            status: 'pass',
            issuesFound: Object.values(results.summary).reduce((a, b) => a + b, 0),
            criticalIssues: 0
        })

        res.json(results)

    } catch (error) {
        logger.error('Newsletter auto-fix error:', error)
        res.status(500).json({
            error: 'Failed to auto-fix newsletter',
            message: error.message
        })
    }
}
