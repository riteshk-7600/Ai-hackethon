import puppeteer from 'puppeteer'
import { JSDOM } from 'jsdom'
import { logger } from '../utils/logger.js'
import browserPool from '../utils/browser-pool.js'
import storageService from './storage.service.js'

export class NewsletterService {
    constructor() {
        // Compatibility knowledge base
        this.compatibilityRules = {
            'flexbox': {
                clients: { outlook: false, gmail: true, apple: true },
                impact: 'Layout will collapse or stack vertically in Outlook',
                recommendation: 'Use table-based layouts for structure instead of Flexbox'
            },
            'max-width': {
                clients: { outlook: 'partial', gmail: true, apple: true },
                impact: 'Outlook (Desktop) ignores max-width on non-table elements',
                recommendation: 'Wrap content in a table with a fixed width attribute'
            },
            'position:absolute': {
                clients: { outlook: false, gmail: false, apple: 'partial' },
                impact: 'Most email clients ignore absolute positioning',
                recommendation: 'Use nested tables and padding for positioning'
            },
            'background-image': {
                clients: { outlook: 'partial', gmail: true, apple: true },
                impact: 'Outlook requires VML (Vector Markup Language) to show background images',
                recommendation: 'Use a solid background color fallback or VML code'
            },
            'web-fonts': {
                clients: { outlook: false, gmail: 'partial', apple: true },
                impact: 'Outlook will fallback to Times New Roman if your font is not installed locally',
                recommendation: 'Add a robust stack like "font-family: Arial, sans-serif;"'
            },
            'border-radius': {
                clients: { outlook: false, gmail: true, apple: true },
                impact: 'Outlook shows square corners',
                recommendation: 'Minor visual issue, but consider VML if rounded buttons are critical'
            }
        }
    }

    async testNewsletter(emailHtml, options = {}) {
        try {
            logger.info('Professional Newsletter test started')

            const issues = []
            const timestamp = Date.now()

            // 1. Line-to-offset mapping for reporting
            const lines = emailHtml.split('\n')

            // 2. SYNTAX & STRUCTURE ANALYZER (Regex-based for raw HTML)
            this.checkRawSyntax(emailHtml, issues, lines)

            // 3. REAL RENDERING (Visual Proof)
            const browser = await browserPool.getBrowser()
            const page = await browser.newPage()
            await page.setViewport({ width: 600, height: 800 })
            await page.setContent(emailHtml, { waitUntil: 'networkidle0', timeout: 10000 }).catch(() => { })

            const lightBuffer = await page.screenshot({ fullPage: true, encoding: 'binary' })
            const lightPath = await storageService.saveScreenshot(`newsletter-light-${timestamp}.png`, lightBuffer)

            await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
            await new Promise(r => setTimeout(r, 500))
            const darkBuffer = await page.screenshot({ fullPage: true, encoding: 'binary' })
            const darkPath = await storageService.saveScreenshot(`newsletter-dark-${timestamp}.png`, darkBuffer)

            await page.close()

            // 4. DOM-BASED COMPATIBILITY & ADA ANALYSIS
            const dom = new JSDOM(emailHtml)
            const document = dom.window.document

            this.runCompatibilityCheck(emailHtml, document, issues, lines)
            this.runAccessibilityCheck(document, issues, lines)
            this.runSpamScan(emailHtml, issues)

            // Calculate overall score
            const criticalCount = issues.filter(i => i.severity === 'critical').length
            const warningCount = issues.filter(i => i.severity === 'warning').length
            const score = Math.max(0, 100 - (criticalCount * 15) - (warningCount * 5))

            return {
                ok: true,
                score: Math.round(score),
                issues,
                screenshots: {
                    light: lightPath || null,
                    dark: darkPath || null
                },
                metadata: {
                    totalIssues: issues.length,
                    timestamp: new Date().toISOString()
                }
            }

        } catch (error) {
            logger.error('Newsletter test error:', error)
            throw error
        }
    }

    checkRawSyntax(html, issues, lines) {
        // Basic unclosed tag check (e.g. <td without >)
        const unclosedRegex = /<[a-zA-Z0-9]+\s+[^>]*[^\/]($|[^>])/g
        let match
        while ((match = unclosedRegex.exec(html)) !== null) {
            const lineNum = html.substring(0, match.index).split('\n').length
            issues.push({
                type: 'Syntax',
                severity: 'critical',
                description: 'Unclosed HTML tag or missing ">"',
                line: lineNum,
                snippet: lines[lineNum - 1]?.trim() || '',
                impact: 'Gmail/Outlook will break layout or ignore entire content blocks',
                recommendation: 'Ensure all opening tags have a matching closing ">"',
                fix: 'Add the missing ">" character to close the tag'
            })
        }

        // Table structure rules (Emails must follow table > tr > td)
        const tableNestingRegex = /<table>\s*(?!<tr|<tbody|<thead|<tfoot|<caption)/gi
        if (tableNestingRegex.test(html)) {
            const lineInfo = this.getLineInfoForRegex(html, tableNestingRegex, lines)
            issues.push({
                type: 'Structure',
                severity: 'critical',
                description: 'Invalid table structure',
                line: lineInfo.line,
                snippet: lineInfo.snippet,
                impact: 'Outlook (Windows) uses Word as a rendering engine and requires strict table structure',
                recommendation: 'A <table> must be immediately followed by <tr> or <tbody>',
                fix: 'Wrap content inside <tr><td>...</td></tr>'
            })
        }
    }

    runCompatibilityCheck(html, document, issues, lines) {
        // Check for common compatibility killers
        Object.entries(this.compatibilityRules).forEach(([feature, rule]) => {
            if (html.includes(feature)) {
                const regex = new RegExp(feature, 'g')
                const lineInfo = this.getLineInfoForRegex(html, regex, lines)

                issues.push({
                    type: 'Compatibility',
                    severity: 'warning',
                    description: `Unsupported CSS Feature: "${feature}"`,
                    line: lineInfo.line,
                    snippet: lineInfo.snippet,
                    impact: rule.impact,
                    recommendation: rule.recommendation,
                    clients: rule.clients
                })
            }
        })

        // Check for relative paths
        const relativeLinks = document.querySelectorAll('a[href^="/"], img[src^="/"]')
        relativeLinks.forEach(el => {
            const attr = el.tagName === 'A' ? 'href' : 'src'
            const val = el.getAttribute(attr)
            const lineInfo = this.getLineInfoForText(html, val, lines)

            issues.push({
                type: 'Compatibility',
                severity: 'critical',
                description: 'Relative URL detected',
                line: lineInfo.line,
                snippet: lineInfo.snippet,
                impact: 'Images and links will break in all email clients for the recipient',
                recommendation: 'Use absolute URLs starting with https://',
                fix: `Convert "${val}" to a full URL (e.g. "https://yourdomain.com${val}")`
            })
        })
    }

    runAccessibilityCheck(document, issues, lines) {
        const html = document.documentElement.innerHTML
        // Alt text check
        document.querySelectorAll('img').forEach((img, idx) => {
            if (!img.hasAttribute('alt')) {
                const lineInfo = this.getLineInfoForText(html, img.src, lines)
                issues.push({
                    type: 'Accessibility',
                    severity: 'warning',
                    description: 'Image missing alt attribute',
                    line: lineInfo.line || 1,
                    snippet: img.outerHTML.substring(0, 50),
                    impact: 'Screen readers cannot describe this image; some clients show broken icon text',
                    recommendation: 'Add an alt="" attribute. Use empty alt text for decorative images.',
                    fix: 'Add alt="Description of image" to the <img> tag'
                })
            }
        })

        // Table roles
        document.querySelectorAll('table').forEach((table, idx) => {
            if (!table.getAttribute('role')) {
                issues.push({
                    type: 'Accessibility',
                    severity: 'minor',
                    description: 'Table missing role="presentation"',
                    line: 1, // Approximated
                    impact: 'Screen readers might read this as a data table instead of layout',
                    recommendation: 'Add role="presentation" to all layout tables',
                    fix: 'Add role="presentation" to the <table> attribute list'
                })
            }
        })
    }

    runSpamScan(html, issues) {
        const spamTriggers = [
            { word: 'free', impact: 'Promotional filter' },
            { word: 'click here', impact: 'Phishing filter risk' },
            { word: '!!!', impact: 'Aggressive punctuation' }
        ]

        spamTriggers.forEach(trigger => {
            if (html.toLowerCase().includes(trigger.word)) {
                issues.push({
                    type: 'Spam',
                    severity: 'info',
                    description: `Spam-sensitive word: "${trigger.word}"`,
                    impact: trigger.impact,
                    recommendation: 'Consider using more neutral language to avoid spam folders'
                })
            }
        })
    }

    async autoFixHTML(html) {
        try {
            logger.info('Newsletter Auto-Fix Engine: Starting healing process')
            const summary = {
                tagsClosed: 0,
                structuralFixes: 0,
                accessibilityFixes: 0,
                cssNormalizations: 0,
                outlookHardening: 0
            }

            // 1. DEEP RECOVERY (JSDOM auto-closes and balances tags)
            const dom = new JSDOM(html)
            const document = dom.window.document
            summary.tagsClosed = (html.match(/<[a-zA-Z]/g) || []).length - (html.match(/<\/[a-zA-Z]/g) || []).length
            if (summary.tagsClosed < 0) summary.tagsClosed = 0

            // 2. STRUCTURAL RECONSTRUCTION (Tables)
            const tables = document.querySelectorAll('table')
            tables.forEach(table => {
                // Ensure layout tables have role="presentation"
                if (!table.getAttribute('role')) {
                    table.setAttribute('role', 'presentation')
                    summary.structuralFixes++
                }

                // Fix table > (anything but tbody/tr)
                const children = Array.from(table.childNodes)
                let needsTbody = false
                children.forEach(child => {
                    if (child.nodeType === 1 && !['TBODY', 'TR', 'THEAD', 'TFOOT', 'COLGROUP', 'CAPTION'].includes(child.tagName)) {
                        needsTbody = true
                    }
                })

                if (needsTbody) {
                    const tbody = document.createElement('tbody')
                    const tr = document.createElement('tr')
                    const td = document.createElement('td')
                    while (table.firstChild) {
                        td.appendChild(table.firstChild)
                    }
                    tr.appendChild(td)
                    tbody.appendChild(tr)
                    table.appendChild(tbody)
                    summary.structuralFixes++
                }
            })

            // 3. ACCESSIBILITY AUTO-REPAIR
            const images = document.querySelectorAll('img')
            images.forEach(img => {
                if (!img.hasAttribute('alt')) {
                    img.setAttribute('alt', '')
                    summary.accessibilityFixes++
                }
            })

            // 4. CSS NORMALIZATION & OUTLOOK HARDENING
            const allElements = document.querySelectorAll('*')
            allElements.forEach(el => {
                const style = el.getAttribute('style')
                if (style) {
                    let newStyle = style
                    // Fix missing semicolons
                    if (newStyle.trim() && !newStyle.trim().endsWith(';')) {
                        newStyle += ';'
                        summary.cssNormalizations++
                    }

                    // Normalize spacing
                    newStyle = newStyle.replace(/\s*:\s*/g, ': ').replace(/\s*;\s*/g, '; ')

                    // Remove hazardous styles for Gmail/Outlook
                    if (newStyle.includes('position: absolute')) {
                        newStyle = newStyle.replace(/position:\s*absolute;?/g, '')
                        summary.cssNormalizations++
                    }

                    if (newStyle !== style) {
                        el.setAttribute('style', newStyle)
                    }
                }
            })

            // Hardening <html> for Outlook
            const htmlEl = document.documentElement
            if (!htmlEl.getAttribute('xmlns:v')) {
                htmlEl.setAttribute('xmlns:v', 'urn:schemas-microsoft-com:vml')
                htmlEl.setAttribute('xmlns:o', 'urn:schemas-microsoft-com:office:office')
                summary.outlookHardening++
            }

            // 5. BEAUTIFICATION
            const fixedHtml = dom.serialize()

            return {
                ok: true,
                fixedHtml,
                summary,
                message: 'HTML Auto-Fixed Successfully'
            }
        } catch (error) {
            logger.error('Auto-Fix Engine Error:', error)
            throw error
        }
    }

    getLineInfoForRegex(html, regex, lines) {
        const match = regex.exec(html)
        if (!match) return { line: 1, snippet: '' }
        const lineNum = html.substring(0, match.index).split('\n').length
        return { line: lineNum, snippet: lines[lineNum - 1]?.trim() || '' }
    }

    getLineInfoForText(html, text, lines) {
        const index = html.indexOf(text)
        if (index === -1) return { line: 1, snippet: '' }
        const lineNum = html.substring(0, index).split('\n').length
        return { line: lineNum, snippet: lines[lineNum - 1]?.trim() || '' }
    }
}

export default new NewsletterService()
