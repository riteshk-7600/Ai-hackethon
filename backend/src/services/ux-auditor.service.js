import { logger } from '../utils/logger.js'

/**
 * World-Class Frontend & UX Auditor Service
 * Performs deep, pixel-perfect analysis of webpages
 */
export class UXAuditorService {

    /**
     * Perform full UX audit on crawled data
     */
    async performFullAudit(crawlData, elements) {
        logger.info('Starting comprehensive UX audit')

        const results = {
            platform: this.detectPlatform(crawlData.html),
            pageSummary: this.generatePageSummary(elements),
            layoutIssues: this.detectLayoutIssues(elements),
            spacingIssues: this.detectSpacingIssues(elements),
            typographyIssues: this.detectTypographyIssues(elements),
            colorIssues: this.detectColorIssues(elements),
            componentIssues: this.detectComponentIssues(elements),
            responsiveIssues: this.detectResponsiveIssues(elements),
            criticalViolations: [],
            recommendedFixes: [],
            finalCSSPatch: ''
        }

        // Identify critical violations
        results.criticalViolations = this.identifyCriticalViolations(results)

        // Generate recommended fixes
        results.recommendedFixes = this.generateRecommendedFixes(results)

        // Generate final CSS patch
        results.finalCSSPatch = this.generateCSSPatch(results)

        return results
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
            wix: /wix\.com|wixstatic/i
        }

        const detected = []
        for (const [platform, pattern] of Object.entries(platforms)) {
            if (pattern.test(html)) {
                detected.push(platform)
            }
        }

        return detected.length > 0 ? detected.join(' + ') : 'Custom HTML'
    }

    /**
     * Generate page summary
     */
    generatePageSummary(elements) {
        return {
            totalElements: elements.length,
            uniqueTags: new Set(elements.map(el => el.tag)).size,
            hasHeader: elements.some(el => el.tag === 'header' || el.tag === 'nav'),
            hasFooter: elements.some(el => el.tag === 'footer'),
            hasSidebar: elements.some(el => (el.selector || '').includes('sidebar')),
            mainSections: elements.filter(el => el.tag === 'section').length
        }
    }

    /**
     * Detect layout issues
     */
    detectLayoutIssues(elements) {
        const issues = []

        // Check for uneven column widths in grids
        const gridContainers = elements.filter(el =>
            el.display === 'grid' || el.display === 'flex'
        )

        gridContainers.forEach(grid => {
            const children = this.findChildren(elements, grid)
            if (children.length > 1) {
                const widths = children.map(c => c.width)
                const variance = this.calculateVariance(widths)

                if (variance > 50 && grid.justifyContent !== 'space-between') {
                    issues.push({
                        severity: 'warning',
                        type: 'layout',
                        category: 'Uneven Columns',
                        description: `Grid/Flex container has children with inconsistent widths (variance: ${variance.toFixed(0)}px)`,
                        element: grid.selector || grid.tag,
                        liveValue: `Widths: ${widths.slice(0, 3).map(w => `${w.toFixed(0)}px`).join(', ')}`,
                        recommendation: 'Use CSS Grid with equal column fractions or Flexbox with flex: 1',
                        cssSelector: grid.selector || grid.tag,
                        cssFix: `${grid.selector || grid.tag} {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 24px;\n}`,
                        coordinates: { x: grid.x, y: grid.y, width: grid.width, height: grid.height }
                    })
                }
            }
        })

        // Check for misaligned elements
        const sections = elements.filter(el =>
            el.tag === 'section' || el.tag === 'div' && el.height > 200
        )

        const containerWidths = sections.map(s => s.width)
        const uniqueWidths = [...new Set(containerWidths.map(w => Math.round(w)))]

        if (uniqueWidths.length > 3) {
            issues.push({
                severity: 'warning',
                type: 'layout',
                category: 'Inconsistent Container Width',
                description: `${uniqueWidths.length} different container widths detected`,
                element: 'multiple sections',
                liveValue: `${uniqueWidths.slice(0, 3).join('px, ')}px`,
                recommendation: 'Standardize max-width for all main containers (e.g., 1200px or 1440px)',
                cssSelector: 'section, .container, main',
                cssFix: `.container, section, main {\n  max-width: 1200px;\n  margin-inline: auto;\n  padding-inline: 24px;\n}`,
                coordinates: sections.length > 0 ? { x: sections[0].x, y: sections[0].y, width: sections[0].width, height: sections[0].height } : null
            })
        }

        // Check for horizontal overflow
        const overflowElements = elements.filter(el =>
            el.x < 0 || (el.x + el.width) > 1920
        )

        if (overflowElements.length > 0) {
            issues.push({
                severity: 'critical',
                type: 'layout',
                category: 'Horizontal Overflow',
                description: `${overflowElements.length} elements extend beyond viewport`,
                element: overflowElements.slice(0, 3).map(el => el.selector || el.tag).join(', '),
                liveValue: 'Elements exceed 1920px width',
                recommendation: 'Add overflow-x: hidden to body and ensure all elements have max-width',
                cssSelector: 'body',
                cssFix: `body {\n  overflow-x: hidden;\n}\n\n* {\n  max-width: 100%;\n}`,
                coordinates: { x: overflowElements[0].x, y: overflowElements[0].y, width: overflowElements[0].width, height: overflowElements[0].height }
            })
        }

        return issues
    }

    /**
     * Detect spacing issues with pixel-perfect precision
     */
    detectSpacingIssues(elements) {
        const issues = []

        // Analyze margins
        const margins = {
            top: elements.map(el => this.parsePixels(el.marginTop)).filter(v => v > 0),
            bottom: elements.map(el => this.parsePixels(el.marginBottom)).filter(v => v > 0),
            left: elements.map(el => this.parsePixels(el.marginLeft)).filter(v => v > 0),
            right: elements.map(el => this.parsePixels(el.marginRight)).filter(v => v > 0)
        }

        // Analyze paddings
        const paddings = {
            top: elements.map(el => this.parsePixels(el.paddingTop)).filter(v => v > 0),
            bottom: elements.map(el => this.parsePixels(el.paddingBottom)).filter(v => v > 0),
            left: elements.map(el => this.parsePixels(el.paddingLeft)).filter(v => v > 0),
            right: elements.map(el => this.parsePixels(el.paddingRight)).filter(v => v > 0)
        }

        // Check for inconsistent spacing values
        const allSpacingValues = [
            ...margins.top, ...margins.bottom,
            ...paddings.top, ...paddings.bottom
        ]

        const uniqueValues = [...new Set(allSpacingValues.map(v => Math.round(v)))]
        const nonStandardValues = uniqueValues.filter(v => v % 8 !== 0 && v % 4 !== 0)

        if (nonStandardValues.length > 5) {
            issues.push({
                severity: 'warning',
                type: 'spacing',
                category: 'Inconsistent Spacing',
                description: `${nonStandardValues.length} spacing values don't follow 4px/8px grid system`,
                element: 'multiple',
                liveValue: `Non-standard: ${nonStandardValues.slice(0, 5).join('px, ')}px`,
                recommendation: 'Use 8px base spacing scale: 8, 16, 24, 32, 48, 64, 96px',
                cssSelector: ':root',
                cssFix: `:root {\n  --space-xs: 8px;\n  --space-sm: 16px;\n  --space-md: 24px;\n  --space-lg: 32px;\n  --space-xl: 48px;\n  --space-2xl: 64px;\n}`
            })
        }

        // Check for mixed spacing patterns
        const sections = elements.filter(el => el.tag === 'section')
        if (sections.length > 1) {
            const sectionPaddings = sections.map(s => ({
                selector: s.selector || s.tag,
                top: this.parsePixels(s.paddingTop),
                bottom: this.parsePixels(s.paddingBottom)
            }))

            const topPaddings = sectionPaddings.map(s => s.top)
            const topVariance = this.calculateVariance(topPaddings)

            if (topVariance > 20) {
                const differences = sectionPaddings.map((s, i) =>
                    `Section ${i + 1}: ${s.top}px top`
                ).join(', ')

                issues.push({
                    severity: 'warning',
                    type: 'spacing',
                    category: 'Vertical Rhythm',
                    description: 'Inconsistent section padding disrupts vertical rhythm',
                    element: 'sections',
                    liveValue: differences,
                    recommendation: 'Standardize section padding to 64px or 80px top/bottom',
                    cssSelector: 'section',
                    cssFix: `section {\n  padding-block: 64px;\n}\n\nsection.hero {\n  padding-block: 96px;\n}`,
                    coordinates: sections.length > 0 ? { x: sections[0].x, y: sections[0].y, width: sections[0].width, height: sections[0].height } : null
                })
            }
        }

        // Check for elements with zero gap in flex containers
        const flexContainers = elements.filter(el =>
            el.display === 'flex' && (!el.gap || el.gap === '0px' || el.gap === 'normal')
        )

        if (flexContainers.length > 5) {
            issues.push({
                severity: 'minor',
                type: 'spacing',
                category: 'Missing Gaps',
                description: `${flexContainers.length} flex containers without gap property`,
                element: 'flex containers',
                liveValue: 'gap: 0 or unset',
                recommendation: 'Use gap property for consistent spacing: 16px or 24px',
                cssSelector: '.flex, [style*="display: flex"]',
                cssFix: `.flex {\n  gap: 16px;\n}\n\n.flex-lg {\n  gap: 24px;\n}`
            })
        }

        return issues
    }

    /**
     * Detect typography issues
     */
    detectTypographyIssues(elements) {
        const issues = []

        const textElements = elements.filter(el =>
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'li'].includes(el.tag)
        )

        // Font family analysis
        const fontFamilies = new Set(textElements.map(el => el.fontFamily))
        if (fontFamilies.size > 3) {
            issues.push({
                severity: 'warning',
                type: 'typography',
                category: 'Font Family Inconsistency',
                description: `Too many font families: ${fontFamilies.size} different fonts`,
                element: 'text elements',
                liveValue: Array.from(fontFamilies).slice(0, 3).join(', '),
                recommendation: 'Limit to 2 fonts: one for headings, one for body',
                cssSelector: ':root',
                cssFix: `:root {\n  --font-heading: 'Inter', system-ui, sans-serif;\n  --font-body: 'Inter', system-ui, sans-serif;\n}\n\nh1, h2, h3, h4, h5, h6 {\n  font-family: var(--font-heading);\n}\n\nbody {\n  font-family: var(--font-body);\n}`
            })
        }

        // Font size analysis
        const fontSizes = textElements.map(el => this.parsePixels(el.fontSize))
        const uniqueSizes = [...new Set(fontSizes.map(s => Math.round(s)))].sort((a, b) => a - b)

        if (uniqueSizes.length > 10) {
            issues.push({
                severity: 'warning',
                type: 'typography',
                category: 'Font Size Inconsistency',
                description: `Too many font sizes: ${uniqueSizes.length} unique sizes`,
                element: 'text elements',
                liveValue: `${uniqueSizes.slice(0, 5).join('px, ')}px...`,
                recommendation: 'Use type scale with 6-8 sizes',
                cssSelector: ':root',
                cssFix: `:root {\n  --text-xs: 12px;\n  --text-sm: 14px;\n  --text-base: 16px;\n  --text-lg: 18px;\n  --text-xl: 20px;\n  --text-2xl: 24px;\n  --text-3xl: 32px;\n  --text-4xl: 48px;\n}`
            })
        }

        // Check heading hierarchy
        const headings = {
            h1: elements.filter(el => el.tag === 'h1'),
            h2: elements.filter(el => el.tag === 'h2'),
            h3: elements.filter(el => el.tag === 'h3')
        }

        if (headings.h1.length > 0 && headings.h2.length > 0) {
            const h1Size = this.parsePixels(headings.h1[0].fontSize)
            const h2Size = this.parsePixels(headings.h2[0].fontSize)

            if (h2Size >= h1Size) {
                issues.push({
                    severity: 'critical',
                    type: 'typography',
                    category: 'Heading Hierarchy',
                    description: 'H2 is larger than or equal to H1 - reversed hierarchy',
                    element: 'h1, h2',
                    liveValue: `H1: ${h1Size}px, H2: ${h2Size}px`,
                    recommendation: 'Ensure H1 > H2 > H3 in size',
                    cssSelector: 'h1, h2, h3',
                    cssFix: `h1 { font-size: 48px; font-weight: 700; }\nh2 { font-size: 32px; font-weight: 600; }\nh3 { font-size: 24px; font-weight: 600; }`,
                    coordinates: { x: headings.h2[0].x, y: headings.h2[0].y, width: headings.h2[0].width, height: headings.h2[0].height }
                })
            }
        }

        // Check for very small text
        const smallText = textElements.filter(el => this.parsePixels(el.fontSize) < 12)
        if (smallText.length > 0) {
            issues.push({
                severity: 'warning',
                type: 'typography',
                category: 'Readability',
                description: `${smallText.length} elements with text smaller than 12px`,
                element: 'small text',
                liveValue: '< 12px',
                recommendation: 'Minimum 12px for body text, 14-16px preferred',
                cssSelector: 'p, span, li',
                cssFix: `body {\n  font-size: 16px;\n  line-height: 1.6;\n}\n\nsmall {\n  font-size: 14px;\n}`
            })
        }

        // Line-height consistency
        const lineHeights = textElements
            .filter(el => el.tag === 'p')
            .map(el => {
                const lh = el.lineHeight
                return lh === 'normal' ? 1.2 : parseFloat(lh)
            })
            .filter(lh => !isNaN(lh))

        const avgLineHeight = lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length
        if (avgLineHeight < 1.4) {
            issues.push({
                severity: 'minor',
                type: 'typography',
                category: 'Line Height',
                description: 'Line-height too tight for comfortable reading',
                element: 'paragraphs',
                liveValue: `Average: ${avgLineHeight.toFixed(2)}`,
                recommendation: 'Use line-height: 1.6 for body text',
                cssSelector: 'p, li',
                cssFix: `p, li {\n  line-height: 1.6;\n}`
            })
        }

        return issues
    }

    /**
     * Detect color issues
     */
    detectColorIssues(elements) {
        const issues = []

        // Extract all colors
        const textColors = new Set()
        const bgColors = new Set()

        elements.forEach(el => {
            if (el.color && el.color !== 'rgba(0, 0, 0, 0)' && el.color !== 'transparent') {
                textColors.add(el.color)
            }
            if (el.backgroundColor && el.backgroundColor !== 'rgba(0, 0, 0, 0)' && el.backgroundColor !== 'transparent') {
                bgColors.add(el.backgroundColor)
            }
        })

        if (textColors.size > 8) {
            issues.push({
                severity: 'warning',
                type: 'color',
                category: 'Color Palette',
                description: `Too many text colors: ${textColors.size} unique colors`,
                element: 'text elements',
                liveValue: `${textColors.size} colors`,
                recommendation: 'Define a consistent color palette with 4-6 colors',
                cssSelector: ':root',
                cssFix: `:root {\n  --color-text-primary: #1a1a1a;\n  --color-text-secondary: #666666;\n  --color-text-accent: #0066cc;\n  --color-text-muted: #999999;\n}`
            })
        }

        if (bgColors.size > 12) {
            issues.push({
                severity: 'minor',
                type: 'color',
                category: 'Background Colors',
                description: `Too many background colors: ${bgColors.size} unique colors`,
                element: 'elements',
                liveValue: `${bgColors.size} different backgrounds`,
                recommendation: 'Limit backgrounds to primary palette and neutral shades',
                cssSelector: ':root',
                cssFix: `:root {\n  --bg-primary: #ffffff;\n  --bg-secondary: #f5f5f5;\n  --bg-accent: #0066cc;\n  --bg-dark: #1a1a1a;\n}`
            })
        }

        // Check for potential contrast issues (simplified)
        const darkBgs = elements.filter(el =>
            el.backgroundColor && this.isDarkColor(el.backgroundColor)
        )

        darkBgs.forEach(el => {
            if (el.color && this.isDarkColor(el.color)) {
                issues.push({
                    severity: 'critical',
                    type: 'color',
                    category: 'Contrast Ratio',
                    description: 'Dark text on dark background - WCAG fail',
                    element: el.selector || el.tag,
                    liveValue: `text: ${el.color}, bg: ${el.backgroundColor}`,
                    recommendation: 'Ensure 4.5:1 contrast ratio for normal text',
                    cssSelector: el.selector || el.tag,
                    cssFix: `${el.selector || el.tag} {\n  color: #ffffff;\n  /* Or use a lighter background */\n}`,
                    coordinates: { x: el.x, y: el.y, width: el.width, height: el.height }
                })
            }
        })

        return issues
    }

    /**
     * Detect component issues
     */
    detectComponentIssues(elements) {
        const issues = []

        // Button analysis
        const buttons = elements.filter(el =>
            el.tag === 'button' || el.tag === 'a' && (el.selector || '').includes('btn')
        )

        if (buttons.length > 0) {
            const radii = buttons.map(b => b.borderRadius).filter(r => r && r !== '0px')
            const uniqueRadii = [...new Set(radii)]

            if (uniqueRadii.length > 3) {
                issues.push({
                    severity: 'warning',
                    type: 'component',
                    category: 'Button Radius',
                    description: `Inconsistent button border-radius: ${uniqueRadii.length} different values`,
                    element: 'buttons',
                    liveValue: uniqueRadii.slice(0, 3).join(', '),
                    recommendation: 'Standardize to one value: 4px, 6px, or 8px',
                    cssSelector: 'button, .btn',
                    cssFix: `button, .btn, a.button {\n  border-radius: 8px;\n  padding: 12px 24px;\n  transition: all 0.2s ease;\n}`
                })
            }

            // Check shadows
            const shadows = buttons.map(b => b.boxShadow).filter(s => s && s !== 'none')
            const uniqueShadows = [...new Set(shadows)]

            if (uniqueShadows.length > 2) {
                issues.push({
                    severity: 'minor',
                    type: 'component',
                    category: 'Button Shadow',
                    description: `${uniqueShadows.length} different shadow styles on buttons`,
                    element: 'buttons',
                    liveValue: `${uniqueShadows.length} variations`,
                    recommendation: 'Use consistent shadow: none, subtle, or medium',
                    cssSelector: 'button, .btn',
                    cssFix: `button, .btn {\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n\nbutton:hover, .btn:hover {\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n}`
                })
            }
        }

        // Card/Container analysis
        const cards = elements.filter(el =>
            (el.selector || '').match(/card|box|container/) ||
            (el.borderRadius && el.borderRadius !== '0px' && el.backgroundColor)
        )

        if (cards.length > 3) {
            const cardRadii = cards.map(c => c.borderRadius)
            const uniqueCardRadii = [...new Set(cardRadii)]

            if (uniqueCardRadii.length > 2) {
                issues.push({
                    severity: 'minor',
                    type: 'component',
                    category: 'Card Radius',
                    description: 'Inconsistent card border-radius',
                    element: 'cards',
                    liveValue: uniqueCardRadii.slice(0, 3).join(', '),
                    recommendation: 'Standardize card radius to 8px or 12px',
                    cssSelector: '.card',
                    cssFix: `.card {\n  border-radius: 12px;\n  padding: 24px;\n  background: white;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);\n}`
                })
            }
        }

        return issues
    }

    /**
     * Detect responsive issues
     */
    detectResponsiveIssues(elements) {
        const issues = []

        // Check for fixed widths that might break on mobile
        const fixedWidthElements = elements.filter(el =>
            el.width > 768 && !el.selector?.includes('container')
        )

        if (fixedWidthElements.length > 10) {
            issues.push({
                severity: 'warning',
                type: 'responsive',
                category: 'Fixed Widths',
                description: `${fixedWidthElements.length} elements with potentially problematic fixed widths`,
                element: 'various',
                liveValue: '> 768px width',
                recommendation: 'Use max-width: 100% and flexible units',
                cssSelector: '*',
                cssFix: `img, video, iframe {\n  max-width: 100%;\n  height: auto;\n}\n\n.container {\n  width: 100%;\n  max-width: 1200px;\n}`
            })
        }

        return issues
    }

    /**
     * Identify critical violations
     */
    identifyCriticalViolations(results) {
        const critical = []

        const allIssues = [
            ...results.layoutIssues,
            ...results.spacingIssues,
            ...results.typographyIssues,
            ...results.colorIssues,
            ...results.componentIssues,
            ...results.responsiveIssues
        ]

        critical.push(...allIssues.filter(issue => issue.severity === 'critical'))

        return critical
    }

    /**
     * Generate recommended fixes
     */
    generateRecommendedFixes(results) {
        const fixes = []

        const allIssues = [
            ...results.layoutIssues,
            ...results.spacingIssues,
            ...results.typographyIssues,
            ...results.colorIssues,
            ...results.componentIssues,
            ...results.responsiveIssues
        ]

        // Group by category
        const byCategory = {}
        allIssues.forEach(issue => {
            if (!byCategory[issue.category]) {
                byCategory[issue.category] = []
            }
            byCategory[issue.category].push(issue)
        })

        // Create fix recommendations
        Object.entries(byCategory).forEach(([category, issues]) => {
            fixes.push({
                category,
                issueCount: issues.length,
                severity: issues.some(i => i.severity === 'critical') ? 'critical' :
                    issues.some(i => i.severity === 'warning') ? 'warning' : 'minor',
                description: `Fix ${issues.length} ${category} issue(s)`,
                cssFix: issues.map(i => i.cssFix).filter(Boolean).join('\n\n')
            })
        })

        return fixes
    }

    /**
     * Generate final CSS patch
     */
    generateCSSPatch(results) {
        const allIssues = [
            ...results.layoutIssues,
            ...results.spacingIssues,
            ...results.typographyIssues,
            ...results.colorIssues,
            ...results.componentIssues,
            ...results.responsiveIssues
        ]

        let css = `/* ========================================\n   Frontend & UX Auditor - CSS Fix Patch\n   Auto-generated fixes for detected issues\n   ======================================== */\n\n`

        // Add design tokens first
        css += `/* Design Tokens */\n:root {\n`
        css += `  /* Spacing Scale (8px base) */\n`
        css += `  --space-xs: 8px;\n  --space-sm: 16px;\n  --space-md: 24px;\n  --space-lg: 32px;\n  --space-xl: 48px;\n  --space-2xl: 64px;\n\n`

        css += `  /* Typography Scale */\n`
        css += `  --text-xs: 12px;\n  --text-sm: 14px;\n  --text-base: 16px;\n  --text-lg: 18px;\n  --text-xl: 20px;\n  --text-2xl: 24px;\n  --text-3xl: 32px;\n  --text-4xl: 48px;\n\n`

        css += `  /* Font Families */\n`
        css += `  --font-heading: 'Inter', system-ui, sans-serif;\n  --font-body: 'Inter', system-ui, sans-serif;\n`
        css += `}\n\n`

        // Add specific fixes by category
        const criticalIssues = allIssues.filter(i => i.severity === 'critical')
        if (criticalIssues.length > 0) {
            css += `/* Critical Fixes */\n`
            criticalIssues.forEach(issue => {
                if (issue.cssFix) {
                    css += `/* ${issue.description} */\n${issue.cssFix}\n\n`
                }
            })
        }

        const warningIssues = allIssues.filter(i => i.severity === 'warning')
        if (warningIssues.length > 0) {
            css += `/* Important Fixes */\n`
            warningIssues.forEach(issue => {
                if (issue.cssFix) {
                    css += `/* ${issue.description} */\n${issue.cssFix}\n\n`
                }
            })
        }

        return css
    }

    // Helper methods
    parsePixels(value) {
        if (!value || value === 'auto' || value === 'normal') return 0
        return parseFloat(value)
    }

    calculateVariance(values) {
        if (values.length === 0) return 0
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const squareDiffs = values.map(v => Math.pow(v - mean, 2))
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length)
    }

    findChildren(elements, parent) {
        return elements.filter(el =>
            el.x >= parent.x &&
            el.y >= parent.y &&
            el.x + el.width <= parent.x + parent.width &&
            el.y + el.height <= parent.y + parent.height &&
            el !== parent
        )
    }

    isDarkColor(color) {
        // Simple check for dark colors
        const rgb = color.match(/\d+/g)
        if (!rgb) return false
        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000
        return brightness < 128
    }
}

export default new UXAuditorService()
