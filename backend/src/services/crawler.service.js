import puppeteer from 'puppeteer'
import { logger } from '../utils/logger.js'
import browserPool from '../utils/browser-pool.js'

export class CrawlerService {
    async crawlWebsite(url, options = {}) {
        let page = null
        let browser = null

        try {
            logger.info(`Crawling website: ${url}`)

            browser = await browserPool.getBrowser()
            page = await browser.newPage()

            // Set viewport
            await page.setViewport({ width: 1920, height: 1080 })

            // Collect console errors
            const consoleErrors = []
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text())
                }
            })

            // Navigate to URL
            const startTime = Date.now()
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            }).catch(() => {
                return page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 20000
                })
            })
            const loadTime = Date.now() - startTime

            // Capture screenshot
            const screenshot = await page.screenshot({
                fullPage: true,
                encoding: 'base64'
            })

            // Extract HTML
            const html = await page.content()

            // Extract all CSS
            const styles = await page.evaluate(() => {
                const styleSheets = Array.from(document.styleSheets)
                return styleSheets.map(sheet => {
                    try {
                        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\\n')
                    } catch (e) {
                        return ''
                    }
                }).join('\\n')
            })

            // Extract comprehensive DOM data with computed styles
            const domData = await this.extractComprehensiveDOMData(page)

            // Analyze layout issues
            const layoutIssues = await this.analyzeLayout(page, domData.elements)

            // Analyze typography
            const typographyIssues = await this.analyzeTypography(page, domData.elements)

            // Analyze spacing patterns
            const spacingIssues = await this.analyzeSpacing(page, domData.elements)

            // Analyze color palette
            const colorPalette = this.extractColorPalette(domData.elements)

            // Detect platform
            const platform = this.detectPlatform(html)

            await page.close()

            return {
                url,
                loadTime,
                screenshot,
                html,
                styles,
                consoleErrors,
                platform,
                domData,
                layoutIssues,
                typographyIssues,
                spacingIssues,
                colorPalette,
                elementCount: domData.elements.length,
                timestamp: new Date().toISOString()
            }

        } catch (error) {
            logger.error(`Crawl error for ${url}:`, error)
            if (page) await page.close().catch(() => { })
            throw error
        }
    }

    async extractComprehensiveDOMData(page) {
        return await page.evaluate(() => {
            const elements = []
            const allElements = document.querySelectorAll('*')

            // Limit to 1200 elements
            const maxElements = Math.min(allElements.length, 1200)

            for (let i = 0; i < maxElements; i++) {
                const el = allElements[i]
                const style = window.getComputedStyle(el)
                const rect = el.getBoundingClientRect()

                // Only include visible elements
                if (rect.width > 0 && rect.height > 0) {
                    elements.push({
                        tag: el.tagName.toLowerCase(),
                        selector: el.className ? `.${el.className.split(' ').join('.')}` : el.tagName.toLowerCase(),
                        id: el.id || null,

                        // Position and size
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,

                        // Typography
                        fontSize: style.fontSize,
                        fontFamily: style.fontFamily,
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                        letterSpacing: style.letterSpacing,

                        // Colors
                        color: style.color,
                        backgroundColor: style.backgroundColor,

                        // Spacing
                        marginTop: style.marginTop,
                        marginRight: style.marginRight,
                        marginBottom: style.marginBottom,
                        marginLeft: style.marginLeft,
                        paddingTop: style.paddingTop,
                        paddingRight: style.paddingRight,
                        paddingBottom: style.paddingBottom,
                        paddingLeft: style.paddingLeft,

                        // Layout
                        display: style.display,
                        flexDirection: style.flexDirection,
                        justifyContent: style.justifyContent,
                        alignItems: style.alignItems,
                        gap: style.gap,

                        // Borders and shadows
                        borderRadius: style.borderRadius,
                        boxShadow: style.boxShadow,

                        // Text content (truncated)
                        text: el.textContent ? el.textContent.substring(0, 100) : ''
                    })
                }
            }

            return { elements }
        })
    }

    async analyzeLayout(page, elements) {
        const issues = []

        // Check for inconsistent padding
        const paddingValues = new Map()
        elements.forEach(el => {
            const padding = `${el.paddingTop} ${el.paddingRight} ${el.paddingBottom} ${el.paddingLeft}`
            paddingValues.set(padding, (paddingValues.get(padding) || 0) + 1)
        })

        if (paddingValues.size > 15) {
            issues.push({
                severity: 'warning',
                type: 'spacing',
                description: `Too many unique padding values (${paddingValues.size}) detected`,
                element: 'multiple',
                liveValue: `${paddingValues.size} variations`,
                recommendation: 'Standardize padding using a design system (e.g., 8px, 16px, 24px, 32px)'
            })
        }

        // Check for alignment issues (elements extending beyond viewport)
        const overflowElements = elements.filter(el =>
            el.x < 0 || (el.x + el.width) > 1920
        )

        if (overflowElements.length > 0) {
            issues.push({
                severity: 'critical',
                type: 'layout',
                description: `${overflowElements.length} elements extend beyond viewport`,
                element: 'multiple',
                liveValue: overflowElements.map(el => el.selector).slice(0, 3).join(', '),
                recommendation: 'Add max-width and proper margins or use responsive design'
            })
        }

        // Check for very small or very large gaps
        const gapElements = elements.filter(el => el.gap && el.gap !== 'normal')
        gapElements.forEach(el => {
            const gapValue = parseInt(el.gap)
            if (gapValue > 100) {
                issues.push({
                    severity: 'minor',
                    type: 'spacing',
                    description: `Very large gap detected`,
                    element: el.selector,
                    liveValue: el.gap,
                    recommendation: 'Consider reducing gap to < 100px for better visual hierarchy'
                })
            }
        })

        return issues
    }

    async analyzeTypography(page, elements) {
        const issues = []
        const fontFamilies = new Set()
        const fontSizes = new Set()
        const fontWeights = new Set()

        const textElements = elements.filter(el =>
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'div'].includes(el.tag)
        )

        textElements.forEach(el => {
            if (el.fontFamily) fontFamilies.add(el.fontFamily)
            if (el.fontSize) fontSizes.add(el.fontSize)
            if (el.fontWeight) fontWeights.add(el.fontWeight)
        })

        if (fontFamilies.size > 3) {
            issues.push({
                severity: 'warning',
                type: 'typography',
                description: `Too many font families used (${fontFamilies.size})`,
                element: 'multiple',
                liveValue: Array.from(fontFamilies).slice(0, 3).join(', '),
                recommendation: 'Limit to 2-3 font families for consistency'
            })
        }

        if (fontSizes.size > 12) {
            issues.push({
                severity: 'minor',
                type: 'typography',
                description: `Too many font sizes (${fontSizes.size})`,
                element: 'multiple',
                liveValue: `${fontSizes.size} unique sizes`,
                recommendation: 'Use a type scale with 6-8 sizes (e.g., 12px, 14px, 16px, 20px, 24px, 32px, 48px)'
            })
        }

        // Check for very small text
        const smallText = textElements.filter(el => parseFloat(el.fontSize) < 12)
        if (smallText.length > 0) {
            issues.push({
                severity: 'warning',
                type: 'typography',
                description: `${smallText.length} elements with text smaller than 12px`,
                element: 'multiple',
                liveValue: '< 12px',
                recommendation: 'Ensure text is at least 12px for readability'
            })
        }

        return issues
    }

    async analyzeSpacing(page, elements) {
        const issues = []
        const margins = new Set()
        const paddings = new Set()

        elements.forEach(el => {
            margins.add(`${el.marginTop}-${el.marginRight}-${el.marginBottom}-${el.marginLeft}`)
            paddings.add(`${el.paddingTop}-${el.paddingRight}-${el.paddingBottom}-${el.paddingLeft}`)
        })

        if (margins.size > 20) {
            issues.push({
                severity: 'minor',
                type: 'spacing',
                description: `High margin variation (${margins.size} unique combinations)`,
                element: 'multiple',
                liveValue: `${margins.size} variations`,
                recommendation: 'Use consistent margin values from a spacing scale'
            })
        }

        // Check for elements with zero gap that might need spacing
        const flexElements = elements.filter(el =>
            el.display === 'flex' && (!el.gap || el.gap === '0px' || el.gap === 'normal')
        )

        if (flexElements.length > 5) {
            issues.push({
                severity: 'minor',
                type: 'spacing',
                description: `${flexElements.length} flex containers without gap`,
                element: 'multiple',
                liveValue: 'gap: 0 or not set',
                recommendation: 'Consider adding gap property for consistent spacing between flex items'
            })
        }

        return issues
    }

    /**
     * Detect platform (WordPress, Shopify, Webflow, etc.)
     */
    detectPlatform(html) {
        const platforms = {
            wordpress: /wp-content|wp-includes|wordpress/i,
            elementor: /elementor-element|elementor-widget/i,
            gutenberg: /wp-block-|blocks-css/i,
            shopify: /cdn\.shopify\.com|Shopify\.theme/i,
            woocommerce: /woocommerce|wc-block/i,
            webflow: /webflow\.com|class="w-/i,
            squarespace: /squarespace\.com|sqs-/i,
            wix: /wix\.com|wixstatic/i,
            react: /react|__REACT|_reactRoot/i,
            vue: /vue\.js|__vue__|v-app/i,
            next: /_next\/|next\.js/i
        }

        const detected = []
        for (const [platform, pattern] of Object.entries(platforms)) {
            if (pattern.test(html)) {
                detected.push(platform)
            }
        }

        return detected.length > 0 ? detected.join(' + ') : 'Custom HTML'
    }

    extractColorPalette(elements) {
        const colors = new Set()
        const bgColors = new Set()

        elements.forEach(el => {
            if (el.color && el.color !== 'rgba(0, 0, 0, 0)' && el.color !== 'transparent') {
                colors.add(el.color)
            }
            if (el.backgroundColor && el.backgroundColor !== 'rgba(0, 0, 0, 0)' && el.backgroundColor !== 'transparent') {
                bgColors.add(el.backgroundColor)
            }
        })

        return {
            textColors: Array.from(colors).slice(0, 20),
            backgroundColors: Array.from(bgColors).slice(0, 20),
            totalTextColors: colors.size,
            totalBackgroundColors: bgColors.size
        }
    }
}

export default new CrawlerService()
