import storageService from '../services/storage.service.js'
import { logger } from '../utils/logger.js'

export const getDashboardStats = async (req, res) => {
    try {
        const stats = await storageService.getStats()
        res.json({
            ok: true,
            stats
        })
    } catch (err) {
        logger.error('Error fetching dashboard stats:', err)
        res.status(500).json({ ok: false, error: 'Failed to fetch dashboard stats' })
    }
}

export const getAuditHistory = async (req, res) => {
    try {
        const history = await storageService.getAudits()
        res.json({
            ok: true,
            history
        })
    } catch (err) {
        logger.error('Error fetching audit history:', err)
        res.status(500).json({ ok: false, error: 'Failed to fetch audit history' })
    }
}
