import axios from 'axios'
import { logger } from '../utils/logger.js'
import browserPool from '../utils/browser-pool.js'

export class PerformanceService {
    async analyzePerformance(url) {
        // Try PageSpeed API first
        if (process.env.PAGESPEED_API_KEY) {
            try {
                return await this.analyzeWithPageSpeed(url)
            } catch (error) {
                logger.warn('PageSpeed API failed, falling back to Puppeteer:', error.message)
                return await this.analyzeWithPuppeteer(url)
            }
        } else {
            logger.info('PageSpeed API key not configured, using Puppeteer fallback')
            return await this.analyzeWithPuppeteer(url)
        }
    }

    async analyzeWithPageSpeed(url) {
        logger.info(`Analyzing performance with PageSpeed API for: ${url}`)

        const apiKey = process.env.PAGESPEED_API_KEY
        const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
            params: {
                url,
                key: apiKey,
                category: ['performance', 'accessibility', 'best-practices', 'seo']
            },
            timeout: 60000
        })

        const data = response.data
        const lighthouseResult = data.lighthouseResult

        // Extract Core Web Vitals
        const metrics = {
            fcp: {
                value: (lighthouseResult.audits['first-contentful-paint'].numericValue / 1000).toFixed(2),
                rating: lighthouseResult.audits['first-contentful-paint'].score >= 0.9 ? 'good' :
                    lighthouseResult.audits['first-contentful-paint'].score >= 0.5 ? 'needs-improvement' : 'poor'
            },
            lcp: {
                value: (lighthouseResult.audits['largest-contentful-paint'].numericValue / 1000).toFixed(2),
                rating: lighthouseResult.audits['largest-contentful-paint'].score >= 0.9 ? 'good' :
                    lighthouseResult.audits['largest-contentful-paint'].score >= 0.5 ? 'needs-improvement' : 'poor'
            },
            cls: {
                value: lighthouseResult.audits['cumulative-layout-shift'].numericValue.toFixed(3),
                rating: lighthouseResult.audits['cumulative-layout-shift'].score >= 0.9 ? 'good' :
                    lighthouseResult.audits['cumulative-layout-shift'].score >= 0.5 ? 'needs-improvement' : 'poor'
            },
            tbt: {
                value: (lighthouseResult.audits['total-blocking-time']?.numericValue || 0).toFixed(0),
                rating: lighthouseResult.audits['total-blocking-time']?.score >= 0.9 ? 'good' :
                    lighthouseResult.audits['total-blocking-time']?.score >= 0.5 ? 'needs-improvement' : 'poor'
            },
            si: {
                value: (lighthouseResult.audits['speed-index']?.numericValue / 1000 || 0).toFixed(2),
                rating: lighthouseResult.audits['speed-index']?.score >= 0.9 ? 'good' :
                    lighthouseResult.audits['speed-index']?.score >= 0.5 ? 'needs-improvement' : 'poor'
            }
        }

        // Extract opportunities (issues)
        const issues = []
        const opportunities = lighthouseResult.audits

        Object.values(opportunities).forEach(audit => {
            if (audit.score !== null && audit.score < 0.9 && audit.details?.overallSavingsMs > 100) {
                issues.push({
                    severity: audit.score < 0.5 ? 'warning' : 'minor',
                    description: audit.title,
                    fix: audit.displayValue || audit.description,
                    impact: `Could save ${(audit.details.overallSavingsMs / 1000).toFixed(2)}s`,
                    type: 'performance'
                })
            }
        })

        // Category scores
        const categories = {
            performance: Math.round(lighthouseResult.categories.performance.score * 100),
            accessibility: Math.round(lighthouseResult.categories.accessibility.score * 100),
            bestPractices: Math.round(lighthouseResult.categories['best-practices'].score * 100),
            seo: Math.round(lighthouseResult.categories.seo.score * 100)
        }

        return {
            score: categories.performance,
            metrics,
            issues: issues.slice(0, 15),
            categories,
            method: 'pagespeed',
            metadata: {
                url,
                timestamp: new Date().toISOString()
            }
        }
    }

    async analyzeWithPuppeteer(url) {
        logger.info(`Analyzing performance with Puppeteer for: ${url}`)

        const browser = await browserPool.getBrowser()
        const page = await browser.newPage()

        try {
            // Enable performance metrics
            await page.evaluateOnNewDocument(() => {
                window.performanceMetrics = {
                    resources: [],
                    marks: []
                }
            })

            const startTime = Date.now()

            // Navigate and collect metrics
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            })

            const loadTime = Date.now() - startTime

            // Collect performance metrics
            const metrics = await page.evaluate(() => {
                const perfData = window.performance.getEntriesByType('navigation')[0]
                const paintMetrics = window.performance.getEntriesByType('paint')

                const fcp = paintMetrics.find(m => m.name === 'first-contentful-paint')
                const lcp = window.performance.getEntriesByType('largest-contentful-paint')[0]

                return {
                    fcp: fcp ? (fcp.startTime / 1000).toFixed(2) : '0',
                    lcp: lcp ? (lcp.startTime / 1000).toFixed(2) : '0',
                    domContentLoaded: perfData ? (perfData.domContentLoadedEventEnd / 1000).toFixed(2) : '0',
                    loadComplete: perfData ? (perfData.loadEventEnd / 1000).toFixed(2) : '0'
                }
            })

            // Collect resource information
            const resources = await page.evaluate(() => {
                const resources = window.performance.getEntriesByType('resource')
                return resources.map(r => ({
                    name: r.name,
                    type: r.initiatorType,
                    size: r.transferSize || 0,
                    duration: r.duration
                }))
            })

            // Analyze issues
            const issues = []

            // Large resources
            const largeResources = resources.filter(r => r.size > 500000)
            if (largeResources.length > 0) {
                issues.push({
                    severity: 'warning',
                    description: `${largeResources.length} large resources detected (> 500KB)`,
                    fix: 'Consider code splitting, lazy loading, or compression',
                    type: 'performance'
                })
            }

            // Slow resources
            const slowResources = resources.filter(r => r.duration > 1000)
            if (slowResources.length > 0) {
                issues.push({
                    severity: 'warning',
                    description: `${slowResources.length} slow-loading resources (> 1s)`,
                    fix: 'Optimize server response time or use CDN',
                    type: 'performance'
                })
            }

            // Convert metrics to expected format
            const formattedMetrics = {
                fcp: {
                    value: metrics.fcp,
                    rating: parseFloat(metrics.fcp) < 1.8 ? 'good' : parseFloat(metrics.fcp) < 3 ? 'needs-improvement' : 'poor'
                },
                lcp: {
                    value: metrics.lcp,
                    rating: parseFloat(metrics.lcp) < 2.5 ? 'good' : parseFloat(metrics.lcp) < 4 ? 'needs-improvement' : 'poor'
                },
                loadTime: {
                    value: (loadTime / 1000).toFixed(2),
                    rating: loadTime < 3000 ? 'good' : loadTime < 5000 ? 'needs-improvement' : 'poor'
                }
            }

            // Calculate score
            const score = this.calculatePuppeteerScore(formattedMetrics, issues)

            await page.close()

            return {
                score,
                metrics: formattedMetrics,
                issues,
                categories: {
                    performance: score,
                    resources: Math.max(0, 100 - (largeResources.length * 10))
                },
                method: 'puppeteer',
                resourceCount: resources.length,
                totalSize: resources.reduce((sum, r) => sum + r.size, 0),
                metadata: {
                    url,
                    timestamp: new Date().toISOString()
                }
            }

        } catch (error) {
            await page.close().catch(() => { })
            throw error
        }
    }

    calculatePuppeteerScore(metrics, issues) {
        let score = 100

        // Deduct for slow metrics
        if (metrics.fcp.rating === 'poor') score -= 20
        else if (metrics.fcp.rating === 'needs-improvement') score -= 10

        if (metrics.lcp.rating === 'poor') score -= 20
        else if (metrics.lcp.rating === 'needs-improvement') score -= 10

        if (metrics.loadTime.rating === 'poor') score -= 15
        else if (metrics.loadTime.rating === 'needs-improvement') score -= 8

        // Deduct for issues
        issues.forEach(issue => {
            if (issue.severity === 'warning') score -= 5
            else if (issue.severity === 'critical') score -= 10
        })

        return Math.max(0, Math.round(score))
    }
}

export default new PerformanceService()
