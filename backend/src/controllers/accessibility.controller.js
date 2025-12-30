import accessibilityService from '../services/accessibility.service.js'
import aiService from '../services/ai.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'

export async function checkAccessibility(req, res) {
    try {
        const { url } = req.body

        if (!url || url.trim() === '') {
            return res.status(400).json({
                error: 'URL is required',
                message: 'Please provide a valid URL to check.'
            })
        }

        // Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return res.status(400).json({
                error: 'Invalid URL format',
                message: 'URL must start with http:// or https://'
            })
        }

        logger.info(`WAVE-style accessibility check for: ${url}`)

        // Run comprehensive accessibility analysis
        const results = await accessibilityService.checkAccessibility(url)

        // Enhance critical issues with AI explanations (if enabled)
        if (aiService.isEnabled() && results.errors.length > 0) {
            const topErrors = results.errors.slice(0, 2)
            for (const error of topErrors) {
                try {
                    error.aiEnhancement = await aiService.explainIssue(error)
                } catch (err) {
                    logger.warn('AI enhancement failed:', err.message)
                }
            }
        }

        // Return WAVE-style comprehensive response
        const response = {
            score: results.score,
            wcagLevel: results.wcagLevel,

            // Issue categorization
            errors: results.errors,
            alerts: results.alerts,
            features: results.features,
            passes: results.passes,

            // Category breakdowns
            colorContrastIssues: results.colorContrastIssues || [],
            keyboardIssues: results.keyboardIssues || [],
            ariaIssues: results.ariaIssues || [],
            imageIssues: results.imageIssues || [],
            formIssues: results.formIssues || [],
            structureIssues: results.structureIssues || [],
            navigationIssues: results.navigationIssues || [],
            linkIssues: results.linkIssues || [],
            tableIssues: results.tableIssues || [],
            motionIssues: results.motionIssues || [],

            // Summary
            summary: results.summary,
            nextSteps: results.nextSteps,

            // Metadata
            metadata: results.metadata
        }

        // Persist to history
        await storageService.addAudit({
            url,
            type: 'Accessibility',
            score: results.score,
            status: results.score >= 80 ? 'pass' : results.score >= 60 ? 'warning' : 'fail',
            issuesFound: results.errors.length + results.alerts.length,
            criticalIssues: results.errors.length
        })

        res.json(response)

    } catch (error) {
        logger.error('Accessibility check error:', error)
        res.status(500).json({
            error: 'Failed to check accessibility',
            message: error.message
        })
    }
}
