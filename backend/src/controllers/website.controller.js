import crawlerService from '../services/crawler.service.js'
import uxAuditorService from '../services/ux-auditor.service.js'
import aiService from '../services/ai.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'
import browserPool from '../utils/browser-pool.js'
import path from 'path'

export async function auditWebsite(req, res) {
    try {
        const { url, platform } = req.body

        if (!url || url.trim() === '') {
            return res.status(400).json({
                error: 'URL is required',
                message: 'Please provide a valid URL to audit.'
            })
        }

        // Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return res.status(400).json({
                error: 'Invalid URL format',
                message: 'URL must start with http:// or https://'
            })
        }

        logger.info(`Website UX audit requested for: ${url}`)

        // Crawl the website
        const crawlData = await crawlerService.crawlWebsite(url, { platform })

        // Perform comprehensive UX audit
        const auditResults = await uxAuditorService.performFullAudit(
            crawlData,
            crawlData.domData.elements
        )

        // Combine all issues
        const allIssues = [
            ...auditResults.layoutIssues,
            ...auditResults.spacingIssues,
            ...auditResults.typographyIssues,
            ...auditResults.colorIssues,
            ...auditResults.componentIssues,
            ...auditResults.responsiveIssues
        ]

        // Calculate overall score
        const criticalCount = allIssues.filter(i => i.severity === 'critical').length
        const warningCount = allIssues.filter(i => i.severity === 'warning').length
        const minorCount = allIssues.filter(i => i.severity === 'minor').length

        const score = Math.max(0, 100 - (criticalCount * 15) - (warningCount * 7) - (minorCount * 3))

        // Category scores
        const categories = {
            layout: Math.max(0, 100 - (auditResults.layoutIssues.length * 10)),
            spacing: Math.max(0, 100 - (auditResults.spacingIssues.length * 10)),
            typography: Math.max(0, 100 - (auditResults.typographyIssues.length * 10)),
            colors: Math.max(0, 100 - (auditResults.colorIssues.length * 10)),
            components: Math.max(0, 100 - (auditResults.componentIssues.length * 10)),
            responsive: Math.max(0, 100 - (auditResults.responsiveIssues.length * 10))
        }

        // Enhance critical issues with AI explanations and screenshots
        const timestamp = Date.now()
        const fullScreenshotBuffer = Buffer.from(crawlData.screenshot, 'base64')
        const fullScreenshotPath = await storageService.saveScreenshot(`ux-audit-full-${timestamp}.png`, fullScreenshotBuffer)
        const fullScreenshotUrl = fullScreenshotPath

        // Capture issue-specific screenshots
        const browser = await browserPool.getBrowser()
        const page = await browser.newPage()
        await page.setViewport({ width: 1920, height: 1080 })
        await page.setContent(crawlData.html)

        let screenshotCount = 0
        const MAX_ISSUE_SCREENSHOTS = 15

        for (const issue of allIssues) {
            if (issue.severity === 'critical' || issue.severity === 'warning') {
                try {
                    if (issue.coordinates && screenshotCount < MAX_ISSUE_SCREENSHOTS) {
                        const { x, y, width, height } = issue.coordinates
                        const clipX = Math.max(0, x - 50)
                        const clipY = Math.max(0, y - 50)
                        const clipWidth = Math.min(1920 - clipX, width + 100)
                        const clipHeight = Math.min(height + 100, 1080)

                        const issueBuffer = await page.screenshot({
                            clip: { x: clipX, y: clipY, width: clipWidth, height: clipHeight },
                            encoding: 'binary'
                        })
                        const issuePath = await storageService.saveScreenshot(`ux-issue-${timestamp}-${Math.random().toString(36).substr(2, 5)}.png`, issueBuffer)
                        issue.screenshotUrl = issuePath
                        screenshotCount++
                    }

                    if (aiService.isEnabled() && issue.severity === 'critical') {
                        issue.aiExplanation = await aiService.explainIssue(issue)
                    }
                } catch (err) {
                    logger.warn(`Failed to process issue ${issue.category}:`, err.message)
                }
            }
        }
        await page.close()

        const results = {
            ok: true,
            score: Math.round(score),
            platform: auditResults.platform,
            pageSummary: auditResults.pageSummary,
            issues: allIssues,
            categories,
            metadata: {
                url,
                platform: auditResults.platform,
                loadTime: crawlData.loadTime,
                timestamp: crawlData.timestamp
            },
            screenshotUrl: fullScreenshotUrl,
            fullScreenshotUrl
        }

        // Persist to history
        await storageService.addAudit({
            url,
            type: 'Website Audit',
            score: Math.round(score),
            status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
            issuesFound: allIssues.length,
            criticalIssues: criticalCount
        })

        res.json(results)

    } catch (error) {
        logger.error('Website audit error:', error)
        res.status(500).json({
            error: 'Failed to audit website',
            message: error.message
        })
    }
}
