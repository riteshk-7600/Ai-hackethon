import puppeteer from 'puppeteer'
import { logger } from '../utils/logger.js'
import browserPool from '../utils/browser-pool.js'
import { diffLines, diffWords } from 'diff'

export class ComparatorService {
    constructor() {
        this.browser = null
    }

    async getBrowser() {
        return await browserPool.getBrowser()
    }

    async compareEnvironments(liveUrl, stageUrl) {
        try {
            logger.info(`Comparing: ${liveUrl} vs ${stageUrl}`)

            const browser = await this.getBrowser()

            // Crawl both environments with timeout protection
            const crawlPromises = [
                this.crawlPageSafe(browser, liveUrl, 'Live'),
                this.crawlPageSafe(browser, stageUrl, 'Stage')
            ]

            const [liveData, stageData] = await Promise.all(crawlPromises)

            // Perform comparisons
            const differences = []

            // HTML diff
            if (liveData.html && stageData.html) {
                const htmlDiff = this.compareHTML(liveData.html, stageData.html)
                differences.push(...htmlDiff)
            }

            // Image src diff
            if (liveData.images && stageData.images) {
                const imageDiff = this.compareImages(liveData.images, stageData.images)
                differences.push(...imageDiff)
            }

            // Text content diff
            if (liveData.text && stageData.text) {
                const textDiff = this.compareText(liveData.text, stageData.text)
                differences.push(...textDiff)
            }

            // Structure diff (sections)
            if (liveData.structure && stageData.structure) {
                const structureDiff = this.compareStructure(liveData.structure, stageData.structure)
                differences.push(...structureDiff)
            }

            return {
                differences: differences.length > 0 ? differences : [{
                    type: 'info',
                    severity: 'minor',
                    description: 'No significant differences found between environments'
                }],
                screenshots: {
                    live: liveData.screenshot || '',
                    stage: stageData.screenshot || ''
                },
                metadata: {
                    liveUrl,
                    stageUrl,
                    timestamp: new Date().toISOString(),
                    liveSuccess: liveData.success,
                    stageSuccess: stageData.success
                }
            }

        } catch (error) {
            logger.error(`Comparison error:`, error.message)
            throw new Error(`Comparison failed: ${error.message}`)
        }
    }

    async crawlPageSafe(browser, url, label) {
        const maxRetries = 2
        let lastError = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`Crawling ${label} (attempt ${attempt}/${maxRetries}): ${url}`)
                const result = await this.crawlPage(browser, url)
                result.success = true
                return result
            } catch (error) {
                lastError = error
                logger.warn(`${label} crawl attempt ${attempt} failed: ${error.message}`)

                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000))
                }
            }
        }

        // Return partial data if all attempts failed
        logger.error(`All ${label} crawl attempts failed: ${lastError.message}`)
        return {
            html: '',
            screenshot: '',
            images: [],
            text: '',
            structure: [],
            success: false,
            error: lastError.message
        }
    }

    async crawlPage(browser, url) {
        const page = await browser.newPage()

        try {
            // Set user agent to avoid bot detection
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            await page.setViewport({ width: 1920, height: 1080 })

            // Try to load the page with multiple strategies
            let loaded = false

            // Strategy 1: networkidle2 with 45s timeout
            try {
                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 45000
                })
                loaded = true
            } catch (e1) {
                logger.warn(`networkidle2 failed for ${url}, trying domcontentloaded`)

                // Strategy 2: domcontentloaded with 30s timeout
                try {
                    await page.goto(url, {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    })
                    loaded = true
                } catch (e2) {
                    logger.warn(`domcontentloaded failed for ${url}, trying load`)

                    // Strategy 3: just load with 20s timeout
                    await page.goto(url, {
                        waitUntil: 'load',
                        timeout: 20000
                    })
                    loaded = true
                }
            }

            if (!loaded) {
                throw new Error('Failed to load page with all strategies')
            }

            // Wait for page to settle
            await new Promise(resolve => setTimeout(resolve, 1500))

            // Extract data with individual error handling
            const html = await page.content().catch(() => '<html></html>')

            const screenshot = await page.screenshot({
                fullPage: false, // Only visible viewport for speed
                encoding: 'base64',
                type: 'jpeg',
                quality: 60
            }).catch((err) => {
                logger.warn(`Screenshot failed for ${url}: ${err.message}`)
                return ''
            })

            const images = await page.evaluate(() => {
                try {
                    return Array.from(document.querySelectorAll('img')).map(img => ({
                        src: img.src,
                        alt: img.alt || ''
                    }))
                } catch (e) {
                    return []
                }
            }).catch(() => [])

            const text = await page.evaluate(() => {
                try {
                    return document.body.innerText || ''
                } catch (e) {
                    return ''
                }
            }).catch(() => '')

            const structure = await page.evaluate(() => {
                try {
                    const sections = Array.from(document.querySelectorAll('section, header, footer, main, nav, aside'))
                    return sections.map((section, idx) => ({
                        tag: section.tagName.toLowerCase(),
                        id: section.id || `section-${idx}`,
                        classes: section.className || '',
                        childCount: section.children.length
                    }))
                } catch (e) {
                    return []
                }
            }).catch(() => [])

            await page.close()

            return { html, screenshot, images, text, structure }

        } catch (error) {
            logger.error(`Error crawling ${url}:`, error.message)
            await page.close().catch(() => { })
            throw error
        }
    }

    compareHTML(liveHTML, stageHTML) {
        const differences = []

        try {
            const diff = diffLines(liveHTML, stageHTML)

            let addedLines = 0
            let removedLines = 0

            diff.forEach(part => {
                if (part.added) addedLines += part.count || 0
                if (part.removed) removedLines += part.count || 0
            })

            if (addedLines > 0 || removedLines > 0) {
                const totalChanges = addedLines + removedLines
                differences.push({
                    type: 'html',
                    severity: totalChanges > 50 ? 'warning' : 'minor',
                    description: `HTML differences: ${removedLines} lines removed, ${addedLines} lines added`
                })
            }
        } catch (error) {
            logger.error('HTML comparison error:', error.message)
        }

        return differences
    }

    compareImages(liveImages, stageImages) {
        const differences = []

        try {
            const liveSrcs = new Set(liveImages.map(img => img.src))
            const stageSrcs = new Set(stageImages.map(img => img.src))

            // Missing images
            liveImages.forEach(img => {
                if (!stageSrcs.has(img.src)) {
                    differences.push({
                        type: 'image',
                        severity: 'warning',
                        description: `Image missing in stage: ${img.src.substring(0, 100)}...`
                    })
                }
            })

            // Extra images
            stageImages.forEach(img => {
                if (!liveSrcs.has(img.src)) {
                    differences.push({
                        type: 'image',
                        severity: 'minor',
                        description: `Extra image in stage: ${img.src.substring(0, 100)}...`
                    })
                }
            })
        } catch (error) {
            logger.error('Image comparison error:', error.message)
        }

        return differences
    }

    compareText(liveText, stageText) {
        const differences = []

        try {
            const diff = diffWords(liveText, stageText)

            let changedWords = 0
            diff.forEach(part => {
                if (part.added || part.removed) {
                    changedWords += part.count || 0
                }
            })

            if (changedWords > 0) {
                differences.push({
                    type: 'content',
                    severity: changedWords > 100 ? 'warning' : 'minor',
                    description: `Text content changed: approximately ${changedWords} words different`
                })
            }
        } catch (error) {
            logger.error('Text comparison error:', error.message)
        }

        return differences
    }

    compareStructure(liveStructure, stageStructure) {
        const differences = []

        try {
            if (liveStructure.length !== stageStructure.length) {
                differences.push({
                    type: 'structure',
                    severity: 'warning',
                    description: `Section count mismatch: Live has ${liveStructure.length} sections, Stage has ${stageStructure.length}`
                })
            }

            // Compare individual sections
            const minLength = Math.min(liveStructure.length, stageStructure.length)
            for (let i = 0; i < minLength; i++) {
                const live = liveStructure[i]
                const stage = stageStructure[i]

                if (live.tag !== stage.tag) {
                    differences.push({
                        type: 'structure',
                        severity: 'minor',
                        description: `Section ${i}: Tag changed from <${live.tag}> to <${stage.tag}>`
                    })
                }
            }
        } catch (error) {
            logger.error('Structure comparison error:', error.message)
        }

        return differences
    }
}

export default new ComparatorService()
