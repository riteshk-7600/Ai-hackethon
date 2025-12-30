import layoutComparatorService from '../services/layout-comparator.service.js'
import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'

/**
 * Production-Ready Layout Comparator Controller
 * POST /api/audit/compare-layout
 * 
 * Request Body:
 * {
 *   liveUrl: string (required)
 *   stageUrl: string (required)
 *   maxElements: number (optional, default 500, max 800)
 *   viewport: { width: number, height: number } (optional)
 *   screenshot: boolean (optional, default false)
 * }
 */
export const compareLayout = async (req, res) => {
    const startTime = Date.now()

    try {
        const {
            liveUrl,
            stageUrl,
            maxElements = 500,
            viewport = { width: 1366, height: 900 },
            screenshot = false
        } = req.body

        // Validation
        if (!liveUrl || !stageUrl) {
            return res.status(400).json({
                ok: false,
                error: 'Both liveUrl and stageUrl are required',
                message: 'Please provide both liveUrl and stageUrl in the request body'
            })
        }

        // Validate URLs
        if (!isValidUrl(liveUrl) || !isValidUrl(stageUrl)) {
            return res.status(400).json({
                ok: false,
                error: 'Invalid URL format',
                message: 'Both URLs must be valid http or https URLs'
            })
        }

        // Validate maxElements
        const maxElementsNum = parseInt(maxElements)
        if (isNaN(maxElementsNum) || maxElementsNum < 1 || maxElementsNum > 800) {
            return res.status(400).json({
                ok: false,
                error: 'Invalid maxElements',
                message: 'maxElements must be a number between 1 and 800'
            })
        }

        // Validate viewport
        if (!viewport.width || !viewport.height ||
            viewport.width < 320 || viewport.width > 3840 ||
            viewport.height < 240 || viewport.height > 2160) {
            return res.status(400).json({
                ok: false,
                error: 'Invalid viewport',
                message: 'Viewport dimensions must be between 320x240 and 3840x2160'
            })
        }

        logger.info(`📊 Compare Layout Request: ${liveUrl} vs ${stageUrl}`)
        logger.info(`   Options: maxElements=${maxElementsNum}, viewport=${viewport.width}x${viewport.height}, screenshot=${screenshot}`)

        // Execute comparison
        const result = await layoutComparatorService.compareLayout(liveUrl, stageUrl, {
            maxElements: maxElementsNum,
            viewport,
            screenshot
        })

        // Log summary
        const requestDuration = Date.now() - startTime
        logger.info(`✅ Comparison completed in ${requestDuration}ms`)
        logger.info(`   Results: ${result.summary.totalDifferences} differences across ${result.summary.totalElementsCompared} elements`)

        // Persist to history
        await storageService.addAudit({
            url: `${liveUrl} vs ${stageUrl}`,
            type: 'Advanced Comparison',
            score: Math.max(0, 100 - (result.summary?.totalDifferences || 0)),
            status: (result.summary?.totalDifferences || 0) < 10 ? 'pass' : 'warning',
            issuesFound: result.summary?.totalDifferences || 0,
            criticalIssues: result.summary?.layoutDifferences || 0
        })

        // Return successful result
        res.json(result)

    } catch (error) {
        const requestDuration = Date.now() - startTime
        logger.error(`❌ Layout comparison failed after ${requestDuration}ms:`, error.message)
        logger.error(error.stack)

        // Determine appropriate error response
        const statusCode = error.message.includes('timeout') ? 504 :
            error.message.includes('navigation') ? 502 :
                error.message.includes('Browser') ? 503 :
                    500

        res.status(statusCode).json({
            ok: false,
            error: 'Comparison failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                durationMs: requestDuration
            } : {
                durationMs: requestDuration
            }
        })
    }
}

/**
 * Validate URL format and protocol
 */
function isValidUrl(urlString) {
    try {
        const url = new URL(urlString)
        // Only allow http and https protocols
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch (error) {
        return false
    }
}

/**
 * Get Example Response (for documentation)
 * GET /api/audit/compare-layout/example
 */
export const getExampleResponse = (req, res) => {
    const exampleResponse = {
        ok: true,
        summary: {
            totalElementsCompared: 342,
            totalDifferences: 23,
            typographyDifferences: 5,
            colorDifferences: 8,
            spacingDifferences: 6,
            layoutDifferences: 3,
            imageDifferences: 1,
            contentDifferences: 0
        },
        differences: [
            {
                selector: "#header > nav.main-nav",
                nodeText: "Home About Products Contact",
                category: "typography",
                property: "fontSize",
                liveValue: "16px",
                stageValue: "18px",
                liveRect: { x: 100, y: 20, width: 800, height: 60 },
                stageRect: { x: 100, y: 20, width: 800, height: 64 },
                liveScreenshot: "iVBORw0KGgoAAAANSUhEUgAAAAUA...(base64)",
                stageScreenshot: "iVBORw0KGgoAAAANSUhEUgAAAAUA...(base64)",
                matchType: "selector",
                difference: "📝 fontSize: Live=\"16px\" vs Stage=\"18px\""
            },
            {
                selector: ".hero-section > h1",
                nodeText: "Welcome to Our Platform",
                category: "color",
                property: "color",
                liveValue: "rgb(0, 0, 0)",
                stageValue: "rgb(51, 51, 51)",
                liveRect: { x: 200, y: 150, width: 600, height: 80 },
                stageRect: { x: 200, y: 150, width: 600, height: 80 },
                liveScreenshot: null,
                stageScreenshot: null,
                matchType: "selector",
                difference: "🎨 color: Live=\"rgb(0, 0, 0)\" vs Stage=\"rgb(51, 51, 51)\""
            },
            {
                selector: ".button-primary",
                nodeText: "Get Started",
                category: "spacing",
                property: "paddingTop",
                liveValue: "12px",
                stageValue: "16px",
                liveRect: { x: 400, y: 300, width: 200, height: 48 },
                stageRect: { x: 400, y: 300, width: 200, height: 52 },
                liveScreenshot: null,
                stageScreenshot: null,
                matchType: "selector",
                difference: "📏 paddingTop: Live=\"12px\" vs Stage=\"16px\""
            }
        ],
        screenshots: {
            liveFullPage: "iVBORw0KGgoAAAANSUhEUgAAAAUA...(base64 encoded full page)",
            stageFullPage: "iVBORw0KGgoAAAANSUhEUgAAAAUA...(base64 encoded full page)"
        },
        meta: {
            liveUrl: "https://example.com",
            stageUrl: "https://staging.example.com",
            durationMs: 4532,
            browserVersion: "Chrome/120.0.6099.109",
            thresholdsUsed: {
                pixelThreshold: 1,
                colorThreshold: 15,
                fontSizeThreshold: 1,
                layoutThreshold: 2
            },
            timestamp: "2025-12-15T06:55:37.000Z"
        }
    }

    res.json(exampleResponse)
}
