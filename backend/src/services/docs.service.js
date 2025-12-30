import AdmZip from 'adm-zip'
import { JSDOM } from 'jsdom'
import puppeteer from 'puppeteer'
import aiService from './ai.service.js'
import { logger } from '../utils/logger.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export class DocsService {
    async generateDocs(zipBuffer) {
        let tempDir = null

        try {
            logger.info('Generating comprehensive documentation from ZIP file')

            // Create temp directory
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-'))

            // Extract ZIP
            const zip = new AdmZip(zipBuffer)
            zip.extractAllTo(tempDir, true)

            // Find all files
            const files = await this.findFiles(tempDir)

            // 1. Analyze Design System (from CSS)
            const designSystem = await this.analyzeDesignSystem(files.css)

            // 2. Parse HTML files to identify components and entry points
            const components = []
            const entryPoints = files.html.map(f => path.basename(f))
            const accessibilityIssues = []

            for (const htmlFile of files.html) {
                const content = await fs.readFile(htmlFile, 'utf-8')
                const { parsedComponents, accessibility } = await this.parseHTML(content, htmlFile)
                components.push(...parsedComponents)
                accessibilityIssues.push(...accessibility)
            }

            // 3. Analyze Interactions (from JS)
            const interactions = await this.analyzeJS(files.js)

            // 4. Generate AI summaries and guides
            // Process top 5 components with AI for better documentation
            for (const component of components.slice(0, 5)) {
                try {
                    component.aiGuide = await aiService.generateUsageGuide(component)
                } catch (e) {
                    logger.warn(`AI Guide generation failed for ${component.name}: ${e.message}`)
                }
            }

            const docData = {
                overview: {
                    projectName: 'Analyzed Frontend Project',
                    techStack: this.detectTechStack(files),
                    folderStructure: await this.getFolderStructure(tempDir),
                    entryPoints,
                    totalFiles: files.html.length + files.css.length + files.js.length
                },
                designSystem,
                components: this.deduplicateComponents(components),
                interactions,
                accessibility: {
                    issues: accessibilityIssues,
                    score: this.calculateAccessibilityScore(accessibilityIssues)
                },
                timestamp: new Date().toISOString()
            }

            // 5. Generate Export Formats
            const exports = await this.generateExportFormats(docData)

            // Cleanup
            await fs.rm(tempDir, { recursive: true, force: true })

            return {
                ...docData,
                exports
            }

        } catch (error) {
            logger.error('Documentation generation error:', error)
            if (tempDir) {
                await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { })
            }
            throw error
        }
    }

    async findFiles(dir) {
        const result = { html: [], css: [], js: [], assets: [] }

        async function scan(currentDir) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true })

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name)

                if (entry.isDirectory()) {
                    await scan(fullPath)
                } else {
                    const ext = path.extname(entry.name).toLowerCase()
                    if (ext === '.html') result.html.push(fullPath)
                    else if (ext === '.css') result.css.push(fullPath)
                    else if (ext === '.js') result.js.push(fullPath)
                    else if (['.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext)) {
                        result.assets.push(fullPath)
                    }
                }
            }
        }

        await scan(dir)
        return result
    }

    async analyzeDesignSystem(cssFiles) {
        const system = {
            colors: [],
            typography: { families: [], sizes: [] },
            spacing: new Set(),
            breakpoints: new Set()
        }

        for (const file of cssFiles) {
            const content = await fs.readFile(file, 'utf-8')

            // Colors (HEX, RGB, HSL)
            const colorMatches = content.match(/#(?:[0-9a-fA-F]{3,4}){1,2}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g)
            if (colorMatches) colorMatches.forEach(c => system.colors.push(c))

            // Typography
            const fontMatches = content.match(/font-family:\s*([^;]+)/g)
            if (fontMatches) fontMatches.forEach(f => system.typography.families.push(f.split(':')[1].trim()))

            const fontSizeMatches = content.match(/font-size:\s*([^;]+)/g)
            if (fontSizeMatches) fontSizeMatches.forEach(s => system.typography.sizes.push(s.split(':')[1].trim()))

            // Spacing (margin/padding)
            const spacingMatches = content.match(/(?:margin|padding)(?:-(?:top|bottom|left|right))?:\s*([^;]+)/g)
            if (spacingMatches) spacingMatches.forEach(s => system.spacing.add(s.split(':')[1].trim()))

            // Breakpoints
            const mqMatches = content.match(/@media[^{]+/g)
            if (mqMatches) mqMatches.forEach(m => system.breakpoints.add(m.trim()))
        }

        return {
            colors: [...new Set(system.colors)].filter(c => c.length < 30),
            typography: {
                families: [...new Set(system.typography.families)],
                sizes: [...new Set(system.typography.sizes)].sort()
            },
            spacing: [...system.spacing].sort(),
            breakpoints: [...system.breakpoints]
        }
    }

    async parseHTML(htmlContent, filePath) {
        const components = []
        const accessibility = []

        try {
            const dom = new JSDOM(htmlContent)
            const doc = dom.window.document

            // Analyze components
            const commonSelectors = [
                { selector: 'button, .btn, [class*="button"]', type: 'Button' },
                { selector: '.card, [class*="card"]', type: 'Card' },
                { selector: 'nav, .nav, .navbar, [class*="navigation"]', type: 'Navigation' },
                { selector: 'form, .form', type: 'Form' },
                { selector: '.modal, [class*="modal"]', type: 'Modal' },
                { selector: 'header, .header', type: 'Header' },
                { selector: 'footer, .footer', type: 'Footer' },
                { selector: 'article, section', type: 'Layout Section' }
            ]

            for (const { selector, type } of commonSelectors) {
                const elements = doc.querySelectorAll(selector)
                elements.forEach((el, idx) => {
                    const name = this.generateComponentName(type, el.className, idx)
                    const html = el.outerHTML

                    if (html.length < 5000) { // Avoid huge elements
                        components.push({
                            name,
                            type,
                            html: html.substring(0, 1000),
                            classes: Array.from(el.classList),
                            attributes: Array.from(el.attributes).map(a => ({ name: a.name, value: a.value })),
                            sourceFile: path.basename(filePath)
                        })
                    }
                })
            }

            // Simple Accessibility Check
            const images = doc.querySelectorAll('img')
            images.forEach(img => {
                if (!img.hasAttribute('alt') || img.getAttribute('alt').trim() === '') {
                    accessibility.push({
                        type: 'Issue',
                        severity: 'High',
                        message: `Image missing alt text in ${path.basename(filePath)}`,
                        element: img.outerHTML.substring(0, 100)
                    })
                }
            })

            const inputs = doc.querySelectorAll('input, select, textarea')
            inputs.forEach(input => {
                if (!input.id || !doc.querySelector(`label[for="${input.id}"]`)) {
                    if (!input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
                        accessibility.push({
                            type: 'Warning',
                            severity: 'Medium',
                            message: `Input missing associated label in ${path.basename(filePath)}`,
                            element: input.outerHTML.substring(0, 100)
                        })
                    }
                }
            })

        } catch (error) {
            logger.error('HTML Parsing error:', error)
        }

        return { parsedComponents: components, accessibility }
    }

    async analyzeJS(jsFiles) {
        const interactions = []
        for (const file of jsFiles) {
            const content = await fs.readFile(file, 'utf-8')

            // Look for event listeners
            const listenerMatches = content.match(/\.addEventListener\(['"]([^'"]+)['"]/g)
            if (listenerMatches) {
                listenerMatches.forEach(m => {
                    const event = m.match(/['"]([^'"]+)['"]/)[1]
                    interactions.push({
                        type: 'EventListener',
                        event,
                        file: path.basename(file)
                    })
                })
            }

            // Look for common patterns
            if (content.includes('fetch(') || content.includes('axios.')) {
                interactions.push({ type: 'NetworkAPI', detail: 'External API calls detected', file: path.basename(file) })
            }
            if (content.includes('localStorage') || content.includes('sessionStorage')) {
                interactions.push({ type: 'Storage', detail: 'Browser storage usage', file: path.basename(file) })
            }
        }
        return interactions
    }

    detectTechStack(files) {
        const stack = ['HTML5', 'CSS3', 'JavaScript']

        const allFiles = [...files.html, ...files.css, ...files.js]
        const combinedContent = "" // We'll check filenames for hints

        const filenames = allFiles.map(f => path.basename(f).toLowerCase())

        if (filenames.some(f => f.includes('tailwind'))) stack.push('Tailwind CSS')
        if (filenames.some(f => f.includes('bootstrap'))) stack.push('Bootstrap')
        if (filenames.some(f => f.includes('jquery'))) stack.push('jQuery')

        return stack
    }

    async getFolderStructure(dir) {
        const structure = []
        async function build(currentDir, depth = 0) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true })
            for (const entry of entries) {
                structure.push('  '.repeat(depth) + (entry.isDirectory() ? '📁 ' : '📄 ') + entry.name)
                if (entry.isDirectory()) {
                    await build(path.join(currentDir, entry.name), depth + 1)
                }
            }
        }
        await build(dir)
        return structure.join('\n')
    }

    deduplicateComponents(components) {
        const seen = new Set()
        return components.filter(c => {
            const id = `${c.type}-${c.classes.sort().join('-')}`
            if (seen.has(id)) return false
            seen.add(id)
            return true
        })
    }

    calculateAccessibilityScore(issues) {
        if (issues.length === 0) return 100
        const high = issues.filter(i => i.severity === 'High').length
        const med = issues.filter(i => i.severity === 'Medium').length
        return Math.max(0, 100 - (high * 10) - (med * 5))
    }

    generateComponentName(type, classes, idx) {
        if (!classes) return `${type} ${idx + 1}`
        const classArray = classes.split(/\s+/).filter(c => c.length > 0 && !['btn', 'card', 'modal'].includes(c))
        if (classArray.length > 0) {
            return classArray[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
        }
        return `${type} ${idx + 1}`
    }

    async generateExportFormats(data) {
        const markdown = this.generateMarkdown(data)
        const html = this.generateHTMLDoc(data)

        let pdfBase64 = null
        try {
            pdfBase64 = await this.generatePDFFromHTML(html)
        } catch (e) {
            logger.warn('PDF generation failed:', e.message)
        }

        return {
            json: JSON.stringify(data, null, 2),
            markdown,
            html,
            pdf: pdfBase64
        }
    }

    generateMarkdown(data) {
        let md = `# Project Documentation: ${data.overview.projectName}\n\n`
        md += `## Overview\n`
        md += `- **Tech Stack:** ${data.overview.techStack.join(', ')}\n`
        md += `- **Entry Points:** ${data.overview.entryPoints.join(', ')}\n\n`
        md += `### Folder Structure\n\`\`\`\n${data.overview.folderStructure}\n\`\`\`\n\n`

        md += `## Design System\n`
        md += `### Colors\n${data.designSystem.colors.map(c => `- ${c}`).join('\n')}\n\n`
        md += `### Typography\n- **Families:** ${data.designSystem.typography.families.join(', ')}\n- **Sizes:** ${data.designSystem.typography.sizes.join(', ')}\n\n`

        md += `## Components\n`
        data.components.forEach(c => {
            md += `### ${c.name} (${c.type})\n`
            md += `- **Classes:** \`${c.classes.join(', ')}\`\n`
            md += `- **Source:** ${c.sourceFile}\n\n`
            if (c.aiGuide) md += `#### AI Guide\n${c.aiGuide}\n\n`
        })

        md += `## Accessibility Report\n`
        md += `**Score: ${data.accessibility.score}/100**\n\n`
        data.accessibility.issues.forEach(i => {
            md += `- [${i.severity}] ${i.message}\n`
        })

        return md
    }

    generateHTMLDoc(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Project Docs - ${data.overview.projectName}</title>
            <style>
                body { font-family: system-ui; line-height: 1.5; color: #333; max-width: 1000px; margin: 0 auto; padding: 40px; }
                h1, h2, h3 { color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 5px; }
                pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
                .color-grid { display: flex; flex-wrap: wrap; gap: 10px; }
                .color-box { width: 40px; height: 40px; border-radius: 4px; border: 1px solid #ddd; }
                .component-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
                .tag { font-size: 12px; background: #eee; padding: 2px 8px; border-radius: 10px; margin-right: 5px; }
                .issue-High { color: #d32f2f; font-weight: bold; }
                .issue-Medium { color: #f57c00; }
            </style>
        </head>
        <body>
            <h1>${data.overview.projectName}</h1>
            <p>Generated on ${new Date(data.timestamp).toLocaleString()}</p>
            
            <h2>Overview</h2>
            <p><strong>Tech Stack:</strong> ${data.overview.techStack.join(', ')}</p>
            <pre>${data.overview.folderStructure}</pre>

            <h2>Design System</h2>
            <h3>Colors</h3>
            <div class="color-grid">
                ${data.designSystem.colors.map(c => `
                    <div style="text-align:center">
                        <div class="color-box" style="background:${c}"></div>
                        <span style="font-size:10px">${c}</span>
                    </div>
                `).join('')}
            </div>

            <h2>Components</h2>
            ${data.components.map(c => `
                <div class="component-card">
                    <h3>${c.name} <span class="tag">${c.type}</span></h3>
                    <p>Source file: ${c.sourceFile}</p>
                    <p>Classes: ${c.classes.map(cls => `<span class="tag">${cls}</span>`).join('')}</p>
                    <pre><code>${this.escapeHtml(c.html)}</code></pre>
                </div>
            `).join('')}

            <h2>Accessibility</h2>
            <p>Score: <strong>${data.accessibility.score}/100</strong></p>
            <ul>
                ${data.accessibility.issues.map(i => `
                    <li class="issue-${i.severity}">[${i.severity}] ${i.message}</li>
                `).join('')}
            </ul>
        </body>
        </html>
        `
    }

    async generatePDFFromHTML(html) {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' } })
        await browser.close()
        return pdfBuffer.toString('base64')
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
    }
}

export default new DocsService()
