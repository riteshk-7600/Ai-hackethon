import puppeteer from 'puppeteer'
import path from 'path'
import { logger } from '../utils/logger.js'
import storageService from './storage.service.js'
import browserPool from '../utils/browser-pool.js'
import contrastAnalyzer from '../utils/contrast-analyzer.js'
import fixGenerator from '../utils/fix-generator.js'

export class AccessibilityService {
    async checkAccessibility(url) {
        let page = null

        try {
            logger.info(`WAVE-style accessibility check for: ${url}`)

            const browser = await browserPool.getBrowser()
            page = await browser.newPage()

            await page.setViewport({ width: 1440, height: 900 })

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 60000
            }).catch(() => {
                return page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                })
            })

            // Stabilize page
            await new Promise(r => setTimeout(r, 2000))

            // Inject axe-core
            try {
                await page.addScriptTag({
                    path: path.resolve(process.cwd(), 'node_modules/axe-core/axe.js')
                })
            } catch (err) {
                logger.warn('Loading axe from CDN...')
                await page.addScriptTag({
                    url: 'https://cdn.jsdelivr.net/npm/axe-core@4.8.0/axe.min.js'
                })
            }

            // Capture Full Page Screenshot
            const fullPageScreenshot = await page.screenshot({ fullPage: true })
            const screenshotFilename = `accessibility-full-${Date.now()}.png`
            const screenshotUrl = await storageService.saveScreenshot(screenshotFilename, fullPageScreenshot)

            // Run axe analysis
            const axeResults = await page.evaluate(() => {
                return new Promise((resolve) => {
                    axe.run((err, results) => {
                        if (err) throw err
                        resolve(results)
                    })
                })
            })

            // Extract comprehensive DOM data for custom checks
            const domData = await this.extractDOMData(page)

            // Perform custom accessibility checks
            const contrastIssues = await this.checkColorContrast(page, domData.elements)
            const imageIssues = this.checkImages(domData.elements)
            const formIssues = this.checkForms(domData.elements)
            const keyboardIssues = await this.checkKeyboardAccessibility(page, domData.elements)
            const structureIssues = this.checkStructure(domData.elements, domData.structure)
            const ariaIssues = this.checkARIA(domData.elements)
            const navigationIssues = this.checkNavigation(domData.structure)
            const linkIssues = this.checkLinks(domData.elements)

            // Process axe violations
            const axeViolations = this.processAxeResults(axeResults)

            // Merge all issues
            const allIssues = [
                ...axeViolations,
                ...contrastIssues,
                ...imageIssues,
                ...formIssues,
                ...keyboardIssues,
                ...structureIssues,
                ...ariaIssues,
                ...navigationIssues,
                ...linkIssues
            ]

            // Highlight and capture elements for critical issues
            const issuesWithScreenshots = await this.captureIssueScreenshots(page, allIssues)

            // Categorize by severity
            const errors = issuesWithScreenshots.filter(i => i.severity === 'error')
            const alerts = issuesWithScreenshots.filter(i => i.severity === 'alert')
            const features = this.detectFeatures(domData.elements, domData.structure)
            const passes = axeResults.passes.map(p => ({
                rule: p.help,
                type: 'pass',
                wcag: p.tags.filter(t => t.startsWith('wcag')).join(', ')
            }))

            // Calculate score and WCAG level
            const score = this.calculateScore(errors, alerts)
            const wcagLevel = this.calculateWCAGLevel(errors, axeResults)

            // Group by category
            const categorized = {
                colorContrastIssues: issuesWithScreenshots.filter(i => i.category === 'contrast'),
                keyboardIssues: issuesWithScreenshots.filter(i => i.category === 'keyboard'),
                ariaIssues: issuesWithScreenshots.filter(i => i.category === 'aria'),
                imageIssues: issuesWithScreenshots.filter(i => i.category === 'image'),
                formIssues: issuesWithScreenshots.filter(i => i.category === 'form'),
                structureIssues: issuesWithScreenshots.filter(i => i.category === 'structure'),
                navigationIssues: issuesWithScreenshots.filter(i => i.category === 'navigation'),
                linkIssues: issuesWithScreenshots.filter(i => i.category === 'link'),
                tableIssues: issuesWithScreenshots.filter(i => i.category === 'table'),
                motionIssues: issuesWithScreenshots.filter(i => i.category === 'motion')
            }

            const result = {
                score,
                wcagLevel,
                screenshotUrl,
                errors,
                alerts,
                features,
                passes: passes.slice(0, 10),
                ...categorized,
                summary: this.generateSummary(score, wcagLevel, errors, alerts),
                nextSteps: this.generateNextSteps(errors, alerts),
                metadata: {
                    url,
                    totalIssues: issuesWithScreenshots.length,
                    errorCount: errors.length,
                    alertCount: alerts.length,
                    featureCount: features.length,
                    timestamp: new Date().toISOString()
                }
            }

            // Log to history
            await storageService.addAudit({
                url: result.metadata.url,
                type: 'Accessibility',
                score: result.score,
                status: result.wcagLevel === 'Fail' ? 'error' : result.wcagLevel === 'A' ? 'warning' : 'pass',
                issuesFound: result.metadata.totalIssues,
                criticalIssues: result.metadata.errorCount
            })

            await page.close()
            return result

        } catch (error) {
            logger.error(`Accessibility check error for ${url}:`, error)
            if (page) await page.close().catch(() => { })
            throw error
        }
    }

    /**
     * Extract comprehensive DOM data
     */
    async extractDOMData(page) {
        return await page.evaluate(() => {
            const elements = []
            const allElements = Array.from(document.querySelectorAll('*'))

            allElements.slice(0, 1000).forEach(el => {
                const style = window.getComputedStyle(el)
                const rect = el.getBoundingClientRect()

                if (rect.width > 0 && rect.height > 0) {
                    // Handle className for both HTML and SVG elements
                    let classNameStr = ''
                    if (typeof el.className === 'string') {
                        classNameStr = el.className
                    } else if (el.className && el.className.baseVal !== undefined) {
                        // SVG element with SVGAnimatedString
                        classNameStr = el.className.baseVal || ''
                    }

                    elements.push({
                        tag: el.tagName.toLowerCase(),
                        id: el.id || null,
                        className: classNameStr,
                        selector: el.id ? `#${el.id}` : classNameStr ? `.${classNameStr.split(' ')[0]}` : el.tagName.toLowerCase(),

                        // Style
                        color: style.color,
                        backgroundColor: style.backgroundColor,
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,

                        // Attributes
                        href: el.href || null,
                        src: el.src || null,
                        alt: el.alt !== undefined ? el.alt : null,
                        title: el.title || null,
                        role: el.getAttribute('role'),
                        ariaLabel: el.getAttribute('aria-label'),
                        ariaLabelledby: el.getAttribute('aria-labelledby'),
                        ariaDescribedby: el.getAttribute('aria-describedby'),
                        ariaHidden: el.getAttribute('aria-hidden'),
                        ariaLive: el.getAttribute('aria-live'),
                        ariaExpanded: el.getAttribute('aria-expanded'),
                        tabindex: el.getAttribute('tabindex'),

                        // Form fields
                        type: el.type || null,
                        name: el.name || null,
                        required: el.required || false,
                        disabled: el.disabled || false,

                        // Text content
                        text: (el.textContent || '').trim().substring(0, 100),
                        innerHTML: (el.innerHTML || '').substring(0, 200),

                        // Position
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    })
                }
            })

            // Get document structure
            const structure = {
                title: document.title,
                lang: document.documentElement.lang || null,
                headings: {
                    h1: document.querySelectorAll('h1').length,
                    h2: document.querySelectorAll('h2').length,
                    h3: document.querySelectorAll('h3').length,
                    h4: document.querySelectorAll('h4').length,
                    h5: document.querySelectorAll('h5').length,
                    h6: document.querySelectorAll('h6').length
                },
                landmarks: {
                    main: document.querySelectorAll('main').length,
                    nav: document.querySelectorAll('nav').length,
                    header: document.querySelectorAll('header').length,
                    footer: document.querySelectorAll('footer').length,
                    aside: document.querySelectorAll('aside').length
                },
                skipLink: !!document.querySelector('a[href^="#"][href*="main"], a[href^="#"][href*="content"]')
            }

            return { elements, structure }
        })
    }

    /**
     * Check color contrast issues
     */
    async checkColorContrast(page, elements) {
        const issues = []

        const textElements = elements.filter(el =>
            ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'button', 'li', 'td', 'th', 'label'].includes(el.tag) &&
            el.text.length > 0
        )

        textElements.forEach(el => {
            const isLargeText = (parseFloat(el.fontSize) >= 18) ||
                (parseFloat(el.fontSize) >= 14 && parseInt(el.fontWeight) >= 700)

            const analysis = contrastAnalyzer.analyzeContrast(el, isLargeText)

            if (analysis.valid && !analysis.passAA) {
                issues.push({
                    severity: 'error',
                    category: 'contrast',
                    wcag: '1.4.3',
                    rule: 'color-contrast',
                    description: `Insufficient color contrast ratio (${analysis.ratio}:1)`,
                    element: el.selector,
                    target: el.selector,
                    fix: fixGenerator.generateFix({
                        id: 'color-contrast',
                        contrastRatio: analysis.ratio,
                        requiredRatio: `${analysis.requiredAA}:1`,
                        foreground: analysis.foreground,
                        suggestedForeground: analysis.suggestedForeground
                    }),
                    currentRatio: analysis.ratio,
                    requiredRatio: `${analysis.requiredAA}:1`,
                    suggestedColor: analysis.suggestedForeground?.hex,
                    impact: 'critical'
                })
            }
        })

        return issues
    }

    /**
     * Check images for alt text
     */
    checkImages(elements) {
        const issues = []
        const images = elements.filter(el => el.tag === 'img')

        images.forEach(img => {
            // Missing alt attribute
            if (img.alt === null) {
                issues.push({
                    severity: 'error',
                    category: 'image',
                    wcag: '1.1.1',
                    rule: 'image-alt',
                    description: 'Image missing alt attribute',
                    element: img.selector,
                    target: img.selector,
                    fix: fixGenerator.generateFix({ id: 'image-alt', html: img.innerHTML }),
                    impact: 'critical'
                })
            }
            // Alt text too long
            else if (img.alt && img.alt.length > 150) {
                issues.push({
                    severity: 'alert',
                    category: 'image',
                    wcag: '1.1.1',
                    rule: 'image-alt-too-long',
                    description: 'Alt text is longer than recommended (>150 chars)',
                    element: img.selector,
                    target: img.selector,
                    fix: {
                        what: 'Alt text is too long',
                        why: 'Screenreaders may struggle with very long alt text',
                        guideline: '1.1.1',
                        code: '<img src="..." alt="Concise description">',
                        example: 'Keep alt text under 150 characters. Use aria-describedby for longer descriptions.',
                        required: false
                    },
                    impact: 'moderate'
                })
            }
        })

        return images.length > 0 ? issues : []
    }

    /**
     * Check form accessibility
     */
    checkForms(elements) {
        const issues = []
        const inputs = elements.filter(el => ['input', 'select', 'textarea'].includes(el.tag) && !el.disabled)

        inputs.forEach(input => {
            const hasLabel = elements.some(el =>
                el.tag === 'label' &&
                (el.innerHTML.includes(input.id) || el.innerHTML.includes(input.name))
            )

            if (!hasLabel && !input.ariaLabel && !input.ariaLabelledby && input.type !== 'hidden' && input.type !== 'submit') {
                issues.push({
                    severity: 'error',
                    category: 'form',
                    wcag: '1.3.1',
                    rule: 'label',
                    description: 'Form input is missing a label',
                    element: input.selector,
                    target: input.selector,
                    fix: fixGenerator.generateFix({ id: 'label', html: input.innerHTML }),
                    impact: 'critical'
                })
            }
        })

        return issues
    }

    /**
     * Check keyboard accessibility
     */
    async checkKeyboardAccessibility(page, elements) {
        const issues = []

        // Check for positive tabindex
        elements.forEach(el => {
            const tabindex = parseInt(el.tabindex)
            if (tabindex > 0) {
                issues.push({
                    severity: 'alert',
                    category: 'keyboard',
                    wcag: '2.4.3',
                    rule: 'tabindex',
                    description: 'Element has positive tabindex, disrupting natural tab order',
                    element: el.selector,
                    target: el.selector,
                    fix: fixGenerator.generateFix({ id: 'tabindex' }),
                    impact: 'serious'
                })
            }
        })

        return issues
    }

    /**
     * Check document structure
     */
    checkStructure(elements, structure) {
        const issues = []

        // Check for multiple H1
        if (structure.headings.h1 > 1) {
            issues.push({
                severity: 'alert',
                category: 'structure',
                wcag: '1.3.1',
                rule: 'multiple-h1',
                description: `Page has ${structure.headings.h1} H1 headings (should have only 1)`,
                element: 'h1',
                target: 'h1',
                fix: {
                    what: 'Page has multiple H1 headings',
                    why: 'Best practice is one H1 per page for clear hierarchy',
                    guideline: '1.3.1',
                    code: '<h1>Main Page Title</h1>\n<!-- Other headings should be H2-H6 -->',
                    example: 'Use only one H1 for the main page title',
                    required: false
                },
                impact: 'moderate'
            })
        }

        // Check for skipped heading levels
        const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        for (let i = 0; i < headingLevels.length - 1; i++) {
            if (structure.headings[headingLevels[i]] > 0 && structure.headings[headingLevels[i + 1]] === 0) {
                if (i < headingLevels.length - 2 && structure.headings[headingLevels[i + 2]] > 0) {
                    issues.push({
                        severity: 'alert',
                        category: 'structure',
                        wcag: '1.3.1',
                        rule: 'heading-order',
                        description: `Heading level skipped from ${headingLevels[i].toUpperCase()} to ${headingLevels[i + 2].toUpperCase()}`,
                        element: headingLevels[i + 2],
                        target: headingLevels[i + 2],
                        fix: fixGenerator.generateFix({ id: 'heading-order' }),
                        impact: 'moderate'
                    })
                }
            }
        }

        return issues
    }

    /**
     * Check ARIA usage
     */
    checkARIA(elements) {
        const issues = []

        // Check for aria-hidden on interactive elements
        elements.forEach(el => {
            if (el.ariaHidden === 'true' && ['a', 'button', 'input', 'select', 'textarea'].includes(el.tag)) {
                issues.push({
                    severity: 'error',
                    category: 'aria',
                    wcag: '4.1.2',
                    rule: 'aria-hidden-focus',
                    description: 'Interactive element is aria-hidden',
                    element: el.selector,
                    target: el.selector,
                    fix: {
                        what: 'Focusable element has aria-hidden="true"',
                        why: 'Screen readers will ignore this interactive element',
                        guideline: '4.1.2',
                        code: '<!-- Remove aria-hidden from interactive elements -->',
                        example: 'Never use aria-hidden on buttons, links, or form fields',
                        required: true
                    },
                    impact: 'critical'
                })
            }
        })

        return issues
    }

    /**
     * Check navigation
     */
    checkNavigation(structure) {
        const issues = []

        // Check for missing main landmark
        if (structure.landmarks.main === 0) {
            issues.push({
                severity: 'error',
                category: 'navigation',
                wcag: '1.3.1',
                rule: 'landmark-one-main',
                description: 'Page is missing main landmark',
                element: 'body',
                target: 'body',
                fix: fixGenerator.generateFix({ id: 'landmark-one-main' }),
                impact: 'serious'
            })
        }

        // Check for skip link
        if (!structure.skipLink) {
            issues.push({
                severity: 'alert',
                category: 'navigation',
                wcag: '2.4.1',
                rule: 'skip-link',
                description: 'Missing skip-to-content link',
                element: 'body',
                target: 'body',
                fix: fixGenerator.generateFix({ id: 'skip-link' }),
                impact: 'moderate'
            })
        }

        return issues
    }

    /**
     * Check links
     */
    checkLinks(elements) {
        const issues = []
        const links = elements.filter(el => el.tag === 'a' && el.href)

        links.forEach(link => {
            // Empty link text
            if (!link.text && !link.ariaLabel && !link.title) {
                issues.push({
                    severity: 'error',
                    category: 'link',
                    wcag: '2.4.4',
                    rule: 'link-name',
                    description: 'Link has no accessible text',
                    element: link.selector,
                    target: link.selector,
                    fix: fixGenerator.generateFix({ id: 'link-name' }),
                    impact: 'critical'
                })
            }
            // Generic link text
            else if (link.text && ['click here', 'read more', 'more', 'link'].includes(link.text.toLowerCase().trim())) {
                issues.push({
                    severity: 'alert',
                    category: 'link',
                    wcag: '2.4.4',
                    rule: 'link-name-generic',
                    description: `Link has generic text: "${link.text}"`,
                    element: link.selector,
                    target: link.selector,
                    fix: fixGenerator.generateFix({ id: 'link-name' }),
                    impact: 'moderate'
                })
            }
        })

        return issues
    }

    /**
     * Process axe results
     */
    processAxeResults(axeResults) {
        const issues = []

        axeResults.violations.forEach(violation => {
            violation.nodes.forEach(node => {
                issues.push({
                    severity: this.mapImpactToSeverity(violation.impact),
                    category: this.categorizeAxeRule(violation.id),
                    wcag: violation.tags.filter(tag => tag.startsWith('wcag')).join(', ').toUpperCase(),
                    rule: violation.id,
                    description: violation.help,
                    element: node.target.join(' > '),
                    target: node.target.join(' > '),
                    fix: fixGenerator.generateFix({
                        id: violation.id,
                        description: violation.description,
                        help: violation.help,
                        tags: violation.tags,
                        html: node.html
                    }),
                    impact: violation.impact
                })
            })
        })

        return issues
    }

    /**
     * Detect accessibility features
     */
    detectFeatures(elements, structure) {
        const features = []

        if (structure.landmarks.main === 1) {
            features.push({ type: 'landmark', description: 'Main landmark present', wcag: '1.3.1' })
        }
        if (structure.skipLink) {
            features.push({ type: 'navigation', description: 'Skip-to-content link', wcag: '2.4.1' })
        }
        if (structure.lang) {
            features.push({ type: 'structure', description: 'Page language specified', wcag: '3.1.1' })
        }

        const labelsCount = elements.filter(el => el.tag === 'label').length
        if (labelsCount > 0) {
            features.push({ type: 'form', description: `${labelsCount} form labels`, wcag: '1.3.1' })
        }

        return features
    }

    /**
     * Calculate score
     */
    calculateScore(errors, alerts) {
        const deductions = (errors.length * 8) + (alerts.length * 3)
        return Math.max(0, 100 - deductions)
    }

    /**
     * Calculate WCAG level
     */
    calculateWCAGLevel(errors, axeResults) {
        if (errors.length > 0) return 'Fail'

        const seriousIssues = axeResults.violations.filter(v =>
            v.impact === 'critical' || v.impact === 'serious'
        )

        if (seriousIssues.length > 0) return 'Fail'

        const moderateIssues = axeResults.violations.filter(v => v.impact === 'moderate')
        if (moderateIssues.length > 0) return 'A'

        const minorIssues = axeResults.violations.filter(v => v.impact === 'minor')
        if (minorIssues.length > 0) return 'AA'

        return 'AAA'
    }

    /**
     * Generate summary
     */
    generateSummary(score, wcagLevel, errors, alerts) {
        if (wcagLevel === 'AAA') {
            return 'Excellent! Page meets WCAG AAA standards.'
        } else if (wcagLevel === 'AA') {
            return `Good. Page meets WCAG AA with score ${score}/100.`
        } else if (wcagLevel === 'A') {
            return `Page has ${alerts.length} issues needing attention.`
        } else {
            return `Found ${errors.length} critical errors. WCAG compliance requires fixing all errors.`
        }
    }

    /**
     * Generate next steps
     */
    generateNextSteps(errors, alerts) {
        if (errors.length === 0 && alerts.length === 0) {
            return 'No action needed. Continue monitoring for accessibility.'
        }

        const priorities = []
        const contrastErrors = errors.filter(e => e.category === 'contrast')
        const imageErrors = errors.filter(e => e.category === 'image')
        const formErrors = errors.filter(e => e.category === 'form')

        if (contrastErrors.length > 0) {
            priorities.push(`Fix ${contrastErrors.length} color contrast issues`)
        }
        if (imageErrors.length > 0) {
            priorities.push(`Add alt text to ${imageErrors.length} images`)
        }
        if (formErrors.length > 0) {
            priorities.push(`Add labels to ${formErrors.length} form fields`)
        }

        return `Priority: ${priorities.join(', ')}`
    }

    /**
     * Map impact to severity
     */
    mapImpactToSeverity(impact) {
        const mapping = {
            'critical': 'error',
            'serious': 'error',
            'moderate': 'alert',
            'minor': 'alert'
        }
        return mapping[impact] || 'alert'
    }

    /**
     * Categorize axe rule
     */
    categorizeAxeRule(ruleId) {
        const categories = {
            'color-contrast': 'contrast',
            'image-alt': 'image',
            'label': 'form',
            'button-name': 'form',
            'link-name': 'link',
            'heading-order': 'structure',
            'landmark': 'navigation',
            'aria-': 'aria',
            'tabindex': 'keyboard',
            'table': 'table'
        }

        for (const [key, category] of Object.entries(categories)) {
            if (ruleId.includes(key)) return category
        }

        return 'other'
    }

    /**
     * Capture screenshots for critical issues
     */
    async captureIssueScreenshots(page, issues) {
        const enrichedIssues = []

        // Limit to first 20 critical issues to avoid performance hits
        const criticalIssues = issues.filter(i => i.severity === 'error').slice(0, 20)
        const otherIssues = issues.filter(i => i.severity !== 'error')
        const remainingCritical = issues.filter(i => i.severity === 'error').slice(20)

        for (const issue of criticalIssues) {
            try {
                if (issue.target) {
                    // Axe target is often an array or a CSS path
                    const selector = typeof issue.target === 'string' ? issue.target.split(' > ').pop() : issue.target[0]
                    const element = await page.$(selector).catch(() => null)

                    if (element) {
                        const box = await element.boundingBox()
                        if (box && box.width > 0 && box.height > 0) {
                            // Add some padding to the crop
                            const viewport = await page.viewport()
                            const clip = {
                                x: Math.max(0, box.x - 50),
                                y: Math.max(0, box.y - 50),
                                width: Math.min(box.width + 100, viewport.width - Math.max(0, box.x - 50)),
                                height: Math.min(box.height + 100, (await page.evaluate(() => document.documentElement.scrollHeight)) - Math.max(0, box.y - 50))
                            }

                            const buffer = await page.screenshot({ clip })
                            const filename = `issue-${Date.now()}-${Math.random().toString(36).substring(7)}.png`
                            issue.screenshotUrl = await storageService.saveScreenshot(filename, buffer)

                            // Also add coordinates for visual overlay
                            issue.coordinates = {
                                x: box.x,
                                y: box.y,
                                width: box.width,
                                height: box.height
                            }
                        }
                    }
                }
            } catch (err) {
                logger.warn(`Failed to capture screenshot for issue: ${issue.rule}`, err.message)
            }
            enrichedIssues.push(issue)
        }

        return [...enrichedIssues, ...remainingCritical, ...otherIssues]
    }
}

export default new AccessibilityService()
