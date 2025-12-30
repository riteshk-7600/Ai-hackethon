import fs from 'fs/promises'
import path from 'path'
import { logger } from '../utils/logger.js'

class StorageService {
    constructor() {
        this.baseDir = './data'
        this.historyFile = path.join(this.baseDir, 'audit-history.json')
        this.ensureStorage()
    }

    async ensureStorage() {
        try {
            await fs.mkdir(this.baseDir, { recursive: true })
            try {
                await fs.access(this.historyFile)
            } catch {
                await fs.writeFile(this.historyFile, JSON.stringify([], null, 2))
            }
            logger.info('Storage service initialized')
        } catch (err) {
            logger.error('Failed to initialize storage:', err)
        }
    }

    /**
     * Log a completed audit
     */
    async addAudit(auditData) {
        try {
            const history = await this.getAudits()
            const newAudit = {
                id: Date.now(),
                date: new Date().toISOString(),
                ...auditData
            }
            history.unshift(newAudit)

            // Keep only last 100 audits
            const trimmedHistory = history.slice(0, 100)
            await fs.writeFile(this.historyFile, JSON.stringify(trimmedHistory, null, 2))
            return newAudit
        } catch (err) {
            logger.error('Error adding audit to history:', err)
            return null
        }
    }

    async getAudits() {
        try {
            const data = await fs.readFile(this.historyFile, 'utf8')
            return JSON.parse(data)
        } catch (err) {
            logger.error('Error reading audit history:', err)
            return []
        }
    }

    async getStats() {
        const audits = await this.getAudits()
        if (audits.length === 0) {
            return {
                totalAudits: 0,
                avgScore: 0,
                issuesFound: 0,
                criticalIssues: 0,
                timeSaved: 0
            }
        }

        const totalScore = audits.reduce((sum, a) => sum + (a.score || 0), 0)
        const totalIssues = audits.reduce((sum, a) => sum + (a.issuesFound || 0), 0)
        const totalCritical = audits.reduce((sum, a) => sum + (a.criticalIssues || 0), 0)

        return {
            totalAudits: audits.length,
            avgScore: parseFloat((totalScore / audits.length).toFixed(1)),
            issuesFound: totalIssues,
            criticalIssues: totalCritical,
            timeSaved: audits.length * 0.5 // Hypothetical 30m saved per audit
        }
    }

    async saveScreenshot(filename, buffer) {
        try {
            const screenshotsDir = './uploads/screenshots'
            await fs.mkdir(screenshotsDir, { recursive: true })
            const filePath = path.join(screenshotsDir, filename)
            await fs.writeFile(filePath, buffer)
            return `/uploads/screenshots/${filename}`
        } catch (err) {
            logger.error('Error saving screenshot:', err)
            return null
        }
    }
}

export default new StorageService()
