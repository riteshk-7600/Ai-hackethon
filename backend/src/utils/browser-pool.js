import puppeteer from 'puppeteer'
import { logger } from '../utils/logger.js'

class BrowserPool {
    constructor() {
        this.browser = null
        this.isLaunching = false
        this.launchPromise = null
    }

    async getBrowser() {
        // If browser exists and is connected, return it
        if (this.browser && this.browser.isConnected()) {
            return this.browser
        }

        // If already launching, wait for that launch to complete
        if (this.isLaunching && this.launchPromise) {
            return await this.launchPromise
        }

        // Launch new browser
        this.isLaunching = true
        this.launchPromise = this.launchBrowser()

        try {
            this.browser = await this.launchPromise
            return this.browser
        } finally {
            this.isLaunching = false
            this.launchPromise = null
        }
    }

    async launchBrowser() {
        try {
            logger.info('Launching Puppeteer browser...')

            // Try to use system Chrome first, fall back to bundled Chromium
            const launchOptions = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=1920,1080'
                ],
                timeout: 30000,
                defaultViewport: {
                    width: 1920,
                    height: 1080
                }
            }

            // Try to find Chrome executable (works cross-platform)
            const possiblePaths = [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows 32-bit
                '/usr/bin/google-chrome', // Linux
                '/usr/bin/chromium-browser' // Linux Chromium
            ]

            let browser
            let launchError

            // Try each path
            for (const chromePath of possiblePaths) {
                try {
                    const fs = await import('fs')
                    if (fs.existsSync(chromePath)) {
                        logger.info(`Found Chrome at: ${chromePath}`)
                        browser = await puppeteer.launch({
                            ...launchOptions,
                            executablePath: chromePath
                        })
                        break
                    }
                } catch (err) {
                    launchError = err
                    continue
                }
            }

            // If no Chrome found, use bundled Chromium
            if (!browser) {
                logger.info('Using bundled Chromium')
                browser = await puppeteer.launch(launchOptions)
            }

            logger.info('✅ Browser launched successfully')

            // Handle browser disconnect
            browser.on('disconnected', () => {
                logger.warn('Browser disconnected')
                this.browser = null
            })

            return browser
        } catch (error) {
            logger.error('Failed to launch browser:', error.message)
            throw new Error(`Browser launch failed: ${error.message}`)
        }
    }

    async closeBrowser() {
        if (this.browser) {
            try {
                await this.browser.close()
                this.browser = null
                logger.info('Browser closed')
            } catch (error) {
                logger.error('Error closing browser:', error.message)
            }
        }
    }
}

// Export singleton instance
export default new BrowserPool()
