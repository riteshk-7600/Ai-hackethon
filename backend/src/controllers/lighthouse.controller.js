import axios from 'axios'
import dotenv from 'dotenv'
import { logger } from '../utils/logger.js'
import { runLocalLighthouse } from '../services/lighthouse.service.js'
import { generateAutoFixReport } from '../services/autofix.service.js'
import storageService from '../services/storage.service.js'

dotenv.config()

const GOOGLE_PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

// Helper to safely get nested properties
const get = (obj, path, defaultValue = null) => {
    return path.split('.').reduce((o, p) => (o ? o[p] : defaultValue), obj) || defaultValue
}

export const runLighthouse = async (req, res) => {
    let { url, device = 'mobile' } = req.body // Changed from req.query to req.body for consistency with other routes

    if (!url) {
        return res.status(400).json({
            ok: false,
            error: 'Missing URL',
            message: 'Please provide a URL parameter'
        })
    }

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url
    }

    // Validate device strategy
    const strategy = ['mobile', 'desktop'].includes(device) ? device : 'mobile'

    logger.info(`Running Lighthouse analysis for ${url} on ${strategy}`)

    // 1. Try Google PageSpeed API
    try {
        const params = {
            url,
            strategy,
            key: process.env.GOOGLE_PAGESPEED_API_KEY,
            category: [
                'performance',
                'accessibility',
                'best-practices',
                'seo'
            ]
        }

        const response = await axios.get(GOOGLE_PAGESPEED_API_URL, { params })
        const data = response.data
        const lh = data.lighthouseResult

        logger.info('Google PageSpeed API success')

        // --- Generate Auto-Fix Report (Deep Scan) ---
        const { issues, autoFixSummary, fixPriorityList } = generateAutoFixReport(lh)

        // Extract Scores (0-1 -> 0-100)
        const scores = {
            performance: Math.round(get(lh, 'categories.performance.score', 0) * 100),
            accessibility: Math.round(get(lh, 'categories.accessibility.score', 0) * 100),
            bestPractices: Math.round(get(lh, 'categories.best-practices.score', 0) * 100),
            seo: Math.round(get(lh, 'categories.seo.score', 0) * 100)
        }

        const metrics = {
            fcp: get(lh, 'audits.first-contentful-paint.numericValue', 0),
            lcp: get(lh, 'audits.largest-contentful-paint.numericValue', 0),
            cls: get(lh, 'audits.cumulative-layout-shift.numericValue', 0),
            tbt: get(lh, 'audits.total-blocking-time.numericValue', 0),
            fid: get(lh, 'audits.max-potential-fid.numericValue', 0),
            speedIndex: get(lh, 'audits.speed-index.numericValue', 0),
            si: get(lh, 'audits.speed-index.numericValue', 0)
        }

        const opportunityAudits = Object.values(lh.audits).filter(
            audit => audit.details && audit.details.type === 'opportunity' && get(audit, 'score') !== 1
        )

        const opportunities = opportunityAudits.map(audit => ({
            id: audit.id,
            title: audit.title,
            description: audit.description,
            savingsMs: get(audit, 'details.overallSavingsMs', 0),
            savingsBytes: get(audit, 'details.overallSavingsBytes', 0),
            score: audit.score
        })).sort((a, b) => (b.savingsMs || 0) - (a.savingsMs || 0))

        const diagnosticIds = [
            'unused-javascript',
            'unused-css-rules',
            'render-blocking-resources',
            'mainthread-work-breakdown',
            'total-byte-weight',
            'dom-size',
            'server-response-time',
            'critical-request-chains',
            'layout-shift-root'
        ]

        const diagnostics = diagnosticIds.map(id => {
            const audit = lh.audits[id]
            if (!audit) return null
            return {
                id: audit.id,
                title: audit.title,
                description: audit.description,
                value: audit.displayValue || audit.numericValue,
                score: audit.score,
                details: audit.details
            }
        }).filter(Boolean)

        const passedAudits = Object.values(lh.audits)
            .filter(audit => audit.score === 1 && (!audit.details || audit.details.type !== 'opportunity'))
            .map(audit => audit.id)

        const finalScreenshot = get(lh, 'audits.final-screenshot.details.data')
        const filmstripItems = get(lh, 'audits.screenshot-thumbnails.details.items', [])
        const waterfallScreenshotFrames = filmstripItems.map(item => item.data)

        const result = {
            ok: true,
            mode: 'psi',
            device: strategy,
            finalScreenshot,
            scores,
            metrics,
            issues,
            autoFixSummary,
            fixPriorityList,
            opportunities: opportunities.map(o => ({
                id: o.id,
                title: o.title,
                description: o.description,
                savingsMs: o.savingsMs,
                savingsKB: o.savingsBytes ? Math.round(o.savingsBytes / 1024) : 0
            })),
            diagnostics: diagnostics.map(d => ({
                id: d.id,
                title: d.title,
                value: d.value,
                description: d.description
            })),
            passedAudits,
            waterfallScreenshotFrames,
            rawLighthouseResult: lh
        }

        // Log to history
        await storageService.addAudit({
            url: url,
            type: 'PageSpeed',
            score: result.scores.performance,
            status: result.scores.performance < 50 ? 'error' : result.scores.performance < 90 ? 'warning' : 'pass',
            issuesFound: (result.opportunities?.length || 0) + (result.diagnostics?.length || 0),
            criticalIssues: result.issues?.filter(i => i.severity === 'critical').length || 0
        })

        return res.json(result)

    } catch (error) {
        // ... (Error handling remains similar, ensuring local fallback also logs to storage if it can)
        logger.warn('Google API failed or quota exceeded. Trying local fallback...')
        try {
            const localResult = await runLocalLighthouse(url, strategy)
            return res.json({ ok: true, ...localResult })
        } catch (localError) {
            logger.error('Lighthouse analysis failed completely:', localError.message)
            return res.status(500).json({ ok: false, error: localError.message })
        }
    }
}
