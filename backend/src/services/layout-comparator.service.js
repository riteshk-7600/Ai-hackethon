import puppeteer from 'puppeteer'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { logger } from '../utils/logger.js'
import storageService from './storage.service.js'
import browserPool from '../utils/browser-pool.js'
import {
    shouldIgnoreDiff,
    categorizeProperty,
    captureElementScreenshot,
    matchElements,
    formatDifferenceMessage,
    calculateColorDistance
} from '../utils/visual-diff-helpers.js'

/**
 * Expert Visual & CSS Comparator Service
 * Compares Live vs Stage environments with pixel-accurate diffing,
 * DOM structural analysis, and console audit.
 */
export class LayoutComparatorService {
    constructor() {
        this.defaultConfig = {
            maxElements: 500,
            viewport: { width: 1440, height: 900 },
            timeout: 90000,
            waitForNetworkIdle: 'networkidle0',
            extraWaitMs: 3000,
            thresholds: {
                pixelThreshold: 1,
                colorThreshold: 10,
                fontSizeThreshold: 0.5,
                layoutThreshold: 1
            }
        }
    }

    async compareLayout(liveUrl, stageUrl, options = {}) {
        const startTime = Date.now()
        const config = { ...this.defaultConfig, ...options }
        const consoleLogs = { live: [], stage: [] }

        logger.info(`🔍 Expert Comparison: ${liveUrl} vs ${stageUrl}`)

        const browser = await browserPool.getBrowser()
        let livePage = null
        let stagePage = null

        try {
            [livePage, stagePage] = await Promise.all([
                browser.newPage(),
                browser.newPage()
            ])

            await this.configurePages(livePage, stagePage, config, consoleLogs)

            logger.info('📄 Loading environments...')
            await this.navigatePages(livePage, stagePage, liveUrl, stageUrl, config)

            // Perform Page Stabilization
            logger.info('⚖️ Stabilizing environments (Expert Loading Sequence)...')
            const [liveScreenshotHeight, stageScreenshotHeight] = await Promise.all([
                this.stabilizePage(livePage),
                this.stabilizePage(stagePage)
            ])

            // Capture snapshots
            logger.info('📸 Capturing visual snapshots...')
            const [liveScreenshot, stageScreenshot] = await Promise.all([
                livePage.screenshot({ type: 'png', fullPage: true }),
                stagePage.screenshot({ type: 'png', fullPage: true })
            ])

            // Perform visual diffing
            const { diffBuffer, width, height: normalizedHeight } = await this.generateVisualDiff(liveScreenshot, stageScreenshot)

            // Extract element data
            logger.info('🔎 Analyzing DOM structures...')
            const [liveElements, stageElements] = await Promise.all([
                this.extractElementData(livePage, config.maxElements),
                this.extractElementData(stagePage, config.maxElements)
            ])

            const matchedPairs = matchElements(liveElements, stageElements)

            // Compare elements and detect deep differences
            const rawDifferences = await this.compareElements(matchedPairs, livePage, stagePage, config)

            // Categorize and generate fix suggestions
            const differences = rawDifferences.map(diff => ({
                ...diff,
                severity: this.calculateSeverity(diff),
                recommendation: this.generateRecommendation(diff)
            }))

            const summary = this.generateSummary(differences, liveElements.length, stageElements.length, consoleLogs)

            // Systemic Audit
            const systemicIssues = this.performSystemicAudit(stageElements)

            // Save unique screenshots for the audit
            const timestamp = Date.now()
            const [liveUrlPath, stageUrlPath, diffUrlPath] = await Promise.all([
                storageService.saveScreenshot(`live-${timestamp}.png`, liveScreenshot),
                storageService.saveScreenshot(`stage-${timestamp}.png`, stageScreenshot),
                storageService.saveScreenshot(`diff-${timestamp}.png`, diffBuffer)
            ])

            const result = {
                ok: true,
                summary: {
                    ...summary,
                    systemicIssuesCount: systemicIssues.length
                },
                differences,
                systemicIssues,
                visualDiff: {
                    liveUrl: liveUrlPath,
                    stageUrl: stageUrlPath,
                    diffUrl: diffUrlPath,
                    width: width,
                    height: normalizedHeight,
                    liveHeight: liveScreenshotHeight,
                    stageHeight: stageScreenshotHeight
                },
                console: {
                    errors: {
                        live: consoleLogs.live.filter(l => l.type === 'error'),
                        stage: consoleLogs.stage.filter(l => l.type === 'error')
                    }
                },
                meta: {
                    liveUrl,
                    stageUrl,
                    durationMs: Date.now() - startTime,
                    timestamp: new Date().toISOString()
                }
            }

            // Log to history
            await storageService.addAudit({
                url: stageUrl,
                type: 'Website Audit',
                score: result.summary.totalDifferences === 0 ? 100 : Math.max(0, 100 - result.summary.totalDifferences * 2),
                status: result.summary.criticalIssues > 0 ? 'error' : result.summary.totalDifferences > 5 ? 'warning' : 'pass',
                issuesFound: result.summary.totalDifferences,
                criticalIssues: result.summary.criticalIssues
            })

            return result

        } catch (error) {
            logger.error('❌ Comparator error:', error.message)
            throw error
        } finally {
            if (livePage) await livePage.close().catch(() => { })
            if (stagePage) await stagePage.close().catch(() => { })
        }
    }

    async configurePages(livePage, stagePage, config, logs) {
        const setupLogging = (page, type) => {
            page.on('console', msg => {
                if (msg.type() === 'error' || msg.type() === 'warning') {
                    logs[type].push({ type: msg.type(), text: msg.text(), location: msg.location() })
                }
            })
            page.on('pageerror', err => {
                logs[type].push({ type: 'error', text: err.message, stack: err.stack })
            })
        }

        await Promise.all([
            livePage.setViewport(config.viewport),
            stagePage.setViewport(config.viewport),
            livePage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
            stagePage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        ])

        setupLogging(livePage, 'live')
        setupLogging(stagePage, 'stage')
    }

    async navigatePages(livePage, stagePage, liveUrl, stageUrl, config) {
        const navOptions = { waitUntil: config.waitForNetworkIdle, timeout: config.timeout }

        await Promise.all([
            livePage.goto(liveUrl, navOptions),
            stagePage.goto(stageUrl, navOptions)
        ]).catch(e => logger.warn(`Navigation warning: ${e.message}`))

        // Explicit check for document ready state
        await Promise.all([
            livePage.waitForFunction(() => document.readyState === 'complete'),
            stagePage.waitForFunction(() => document.readyState === 'complete')
        ])
    }

    async stabilizePage(page) {
        try {
            // 1. Inject Brute-Force Stability & Visibility CSS
            await page.addStyleTag({
                content: `
                    /* 1. Kill all animations/transitions */
                    *, *::before, *::after {
                        transition: none !important;
                        animation: none !important;
                        transition-delay: 0s !important;
                        animation-delay: 0s !important;
                    }

                    /* 2. Brute-Force Content Visibility */
                    [class*="animate"], [class*="fade"], [class*="slide"],
                    [style*="opacity: 0"], [style*="visibility: hidden"] {
                        opacity: 1 !important;
                        visibility: visible !important;
                        display: block !important;
                        transform: none !important;
                    }

                    /* 3. Smarter Overlay Suppression */
                    #onetrust-banner-sdk, #ot-sdk-btn-container,
                    [id*="cookie"], [class*="cookie"],
                    [id*="consent"], [class*="consent"],
                    .intercom-lightweight-app, .intercom-app,
                    #hubspot-messages-loader-container, 
                    .drift-frame-controller, .drift-widget-container,
                    .wp-block-cover__video-background,
                    #pum-1, .pum-overlay, #preloader, .loader, .spinner {
                        display: none !important;
                        z-index: -9999 !important;
                    }

                    /* 4. Ensure root is visible and scrollable */
                    html, body {
                        overflow: visible !important;
                        height: auto !important;
                        min-height: 100vh !important;
                        background: white !important;
                    }
                `
            })

            // 2. Clear common "Blocker" overlays via script
            await page.evaluate(() => {
                const killList = ['preloader', 'loader', 'spinner', 'overlay', 'modal', 'popup', 'consent', 'cookie']
                document.querySelectorAll('div').forEach(div => {
                    const style = window.getComputedStyle(div)
                    const isFullscreen = div.offsetWidth >= window.innerWidth && div.offsetHeight >= window.innerHeight
                    const hasHighZ = parseInt(style.zIndex) > 100

                    if (isFullscreen && hasHighZ) {
                        const classOrId = (div.className + ' ' + div.id).toLowerCase()
                        if (killList.some(k => classOrId.includes(k))) {
                            div.style.setProperty('display', 'none', 'important')
                        }
                    }
                })
            })

            // 3. Slow-Scroll to trigger ALL lazy-loading
            await page.evaluate(async () => {
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
                const totalHeight = document.documentElement.scrollHeight
                const distance = 400

                // Scroll down
                for (let i = 0; i < totalHeight; i += distance) {
                    window.scrollTo(0, i)
                    await delay(100)
                }

                // Stay at bottom for a bit
                await delay(500)

                // Scroll back up slowly
                for (let i = totalHeight; i >= 0; i -= distance) {
                    window.scrollTo(0, i)
                    await delay(50)
                }

                window.scrollTo(0, 0)
            })

            // 4. Force Height Recalculation
            const fullHeight = await page.evaluate(() => {
                return Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.offsetHeight,
                    document.body.clientHeight,
                    document.documentElement.clientHeight
                )
            })

            const currentViewport = page.viewport()
            await page.setViewport({
                width: currentViewport.width,
                height: Math.ceil(fullHeight)
            })

            // 5. Final wait for rendering to "settle"
            await new Promise(r => setTimeout(r, 3000))

            // 6. Ensure all images are loaded
            await page.evaluate(async () => {
                const selectors = Array.from(document.querySelectorAll('img'))
                await Promise.all(selectors.map(img => {
                    if (img.complete) return
                    return new Promise((resolve, reject) => {
                        img.addEventListener('load', resolve)
                        img.addEventListener('error', resolve)
                    })
                }))
            })

            await page.evaluate(() => document.fonts?.ready)

            return fullHeight
        } catch (e) {
            logger.warn(`Stabilization warning: ${e.message}`)
        }
    }

    async generateVisualDiff(liveBuf, stageBuf) {
        try {
            let img1 = PNG.sync.read(liveBuf)
            let img2 = PNG.sync.read(stageBuf)

            const maxWidth = Math.max(img1.width, img2.width)
            const maxHeight = Math.max(img1.height, img2.height)

            // Normalize dimensions
            if (img1.width !== maxWidth || img1.height !== maxHeight) {
                img1 = this.padImage(img1, maxWidth, maxHeight)
            }
            if (img2.width !== maxWidth || img2.height !== maxHeight) {
                img2 = this.padImage(img2, maxWidth, maxHeight)
            }

            const diff = new PNG({ width: maxWidth, height: maxHeight })
            pixelmatch(img1.data, img2.data, diff.data, maxWidth, maxHeight, { threshold: 0.1 })

            return {
                diffBuffer: PNG.sync.write(diff),
                width: maxWidth,
                height: maxHeight
            }
        } catch (e) {
            logger.error('Visual diff failed:', e.message)
            return { diffBuffer: Buffer.alloc(0), width: 0, height: 0 }
        }
    }

    padImage(img, width, height) {
        const newImg = new PNG({ width, height, fill: true })
        newImg.data.fill(255)
        PNG.bitblt(img, newImg, 0, 0, img.width, img.height, 0, 0)
        return newImg
    }

    async extractElementData(page, maxElements) {
        return await page.evaluate((max) => {
            const elements = []
            const nodes = document.querySelectorAll('h1, h2, h3, h4, h5, h6, section, header, footer, nav, aside, main, .container, [class*="section"], [class*="hero"], [class*="card"], [class*="item"], button, a, img')

            const getSectionName = (el) => {
                let current = el
                while (current && current !== document.body) {
                    const tag = current.tagName.toLowerCase()
                    if (['header', 'footer', 'nav', 'main', 'section', 'aside'].includes(tag)) return tag
                    if (current.className && typeof current.className === 'string') {
                        if (current.className.includes('hero')) return 'hero'
                        if (current.className.includes('section')) return 'section'
                    }
                    current = current.parentElement
                }
                return 'body'
            }

            for (let i = 0; i < nodes.length && elements.length < max; i++) {
                const el = nodes[i]
                const rect = el.getBoundingClientRect()
                const style = window.getComputedStyle(el)

                if (rect.width === 0 || rect.height === 0 || style.display === 'none') continue

                elements.push({
                    selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')}` : ''),
                    tagName: el.tagName.toLowerCase(),
                    nodeText: el.innerText?.trim().substring(0, 50),
                    section: getSectionName(el),
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                    styles: {
                        fontSize: style.fontSize,
                        fontFamily: style.fontFamily,
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                        color: style.color,
                        backgroundColor: style.backgroundColor,
                        paddingTop: style.paddingTop,
                        paddingBottom: style.paddingBottom,
                        marginTop: style.marginTop,
                        marginBottom: style.marginBottom,
                        gap: style.gap,
                        display: style.display,
                        flexDirection: style.flexDirection,
                        justifyContent: style.justifyContent,
                        borderRadius: style.borderRadius,
                        borderWidth: style.borderWidth
                    },
                    imageSrc: el.tagName === 'IMG' ? el.src : null
                })
            }
            return elements
        }, maxElements)
    }

    async compareElements(matchedPairs, livePage, stagePage, config) {
        const differences = []
        for (const { live, stage } of matchedPairs) {
            const props = Object.keys(live.styles)

            for (const prop of props) {
                if (!shouldIgnoreDiff(prop, live.styles[prop], stage.styles[prop], config.thresholds)) {
                    let category = categorizeProperty(prop)
                    if (category === 'layout') category = 'structure'

                    differences.push({
                        selector: live.selector,
                        category: category,
                        property: prop,
                        liveValue: live.styles[prop],
                        stageValue: stage.styles[prop],
                        liveRect: live.rect,
                        stageRect: stage.rect,
                        section: live.section || 'body',
                        nodeText: live.nodeText,
                        severity: this.calculateSeverity({ category, property: prop })
                    })
                }
            }
        }

        // Generate recommendations
        differences.forEach(diff => {
            diff.recommendation = this.generateRecommendation(diff)
        })

        return differences
    }

    calculateSeverity(diff) {
        if (diff.category === 'structure') return 'critical'
        if (['fontSize', 'color', 'src'].includes(diff.property)) return 'medium'
        return 'low'
    }

    generateRecommendation(diff) {
        const { property, liveValue, stageValue } = diff
        if (property === 'src') return 'Check if image asset was intentionally replaced.'
        if (property === 'color') return `Update Stage ${property} to match Live: ${liveValue}.`
        return `Adjust Stage ${property} from ${stageValue} to ${liveValue}.`
    }

    generateSummary(differences, liveCount, stageCount, logs) {
        const sections = [...new Set(differences.map(d => d.section))]

        return {
            totalDifferences: differences.length,
            criticalIssues: differences.filter(d => d.severity === 'critical').length,
            mediumIssues: differences.filter(d => d.severity === 'medium').length,
            lowIssues: differences.filter(d => d.severity === 'low').length,
            consoleErrors: logs.live.length + logs.stage.length,
            affectedSections: sections.length,
            breakdown: {
                structure: differences.filter(d => d.category === 'structure').length,
                typography: differences.filter(d => d.category === 'typography').length,
                color: differences.filter(d => d.category === 'color').length,
                content: differences.filter(d => d.category === 'content').length,
                spacing: differences.filter(d => d.category === 'spacing').length,
                image: differences.filter(d => d.category === 'image').length
            }
        }
    }

    performSystemicAudit(elements) {
        const issues = []

        // 1. Typography Scale Check
        const typeScale = {}
        elements.forEach(el => {
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].includes(el.tagName)) {
                if (!typeScale[el.tagName]) typeScale[el.tagName] = new Set()
                typeScale[el.tagName].add(el.styles.fontSize)
            }
        })

        for (const [tag, sizes] of Object.entries(typeScale)) {
            if (sizes.size > 1) {
                issues.push({
                    type: 'typography_scale',
                    severity: 'medium',
                    title: `Inconsistent ${tag.toUpperCase()} sizes`,
                    description: `Found ${sizes.size} variations of ${tag} font-size: ${Array.from(sizes).join(', ')}.`,
                    recommendation: 'Standardize typography to a single scale for better hierarchy.'
                })
            }
        }

        // 2. Spacing System Check (Multiple of 4 or 8)
        const ghostMargins = elements.filter(el => {
            const m = parseInt(el.styles.marginTop) || 0
            const p = parseInt(el.styles.paddingTop) || 0
            return (m % 4 !== 0 && m > 0) || (p % 4 !== 0 && p > 0)
        })

        if (ghostMargins.length > (elements.length * 0.2)) {
            issues.push({
                type: 'spacing_system',
                severity: 'low',
                title: 'Irregular Spacing System',
                description: 'Over 20% of elements use margins/paddings that don\'t follow a 4px or 8px grid.',
                recommendation: 'Align spacing to a consistent grid (e.g., 4px, 8px, 16px).'
            })
        }

        // 3. Color Drift (Near-identical colors)
        const colors = elements.map(el => el.styles.color).filter(c => c && c !== 'rgba(0, 0, 0, 0)')
        const uniqueColors = [...new Set(colors)]

        for (let i = 0; i < uniqueColors.length; i++) {
            for (let j = i + 1; j < uniqueColors.length; j++) {
                const dist = calculateColorDistance(uniqueColors[i], uniqueColors[j])
                if (dist > 0 && dist < 10) {
                    issues.push({
                        type: 'color_drift',
                        severity: 'medium',
                        title: 'Color Drift Detected',
                        description: `Found two very similar but different colors: ${uniqueColors[i]} and ${uniqueColors[j]}.`,
                        recommendation: 'Consolidate these into a single design system variable.'
                    })
                    break // Only report once per pair
                }
            }
        }

        return issues
    }
}

export default new LayoutComparatorService()
