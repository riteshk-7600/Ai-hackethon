import { Router } from 'express'
import { runLighthouse } from '../controllers/lighthouse.controller.js'

const router = Router()

// GET /api/pagespeed?url=...&device=mobile|desktop
// Compatible with legacy calling pattern but using the enhanced service
router.get('/', (req, res) => {
    // Map query to body for consistency with the new runLighthouse
    req.body = { ...req.body, ...req.query }
    return runLighthouse(req, res)
})

export default router
