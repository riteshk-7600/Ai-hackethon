import { Router } from 'express'
import { auditWebsite } from '../controllers/website.controller.js'
import { checkAccessibility } from '../controllers/accessibility.controller.js'
import { analyzePerformance } from '../controllers/performance.controller.js'
import { optimizeImages, analyzeUploadedImages, optimizeAndDownload, uploadMiddleware as imageUploadMiddleware } from '../controllers/image.controller.js'
import { compareEnvironments } from '../controllers/comparator.controller.js'
import { generateDocs, uploadMiddleware } from '../controllers/docs.controller.js'
import { testNewsletter, autoFixNewsletter } from '../controllers/newsletter.controller.js'
import { compareLayout, getExampleResponse } from '../controllers/layout-comparator.controller.js'
import { optimizeImages as batchOptimizeImages, uploadMiddleware as optimizerUploadMiddleware, generateAINames, applyAINames } from '../controllers/image-optimizer.controller.js'
import { runLighthouse } from '../controllers/lighthouse.controller.js'
import { getDashboardStats, getAuditHistory } from '../controllers/dashboard.controller.js'

const router = Router()

// Website Auditor
router.post('/website', auditWebsite)

// Accessibility Checker
router.post('/accessibility', checkAccessibility)

// Performance Analyzer
router.post('/performance', analyzePerformance)

// Image Optimizer (Legacy - Analysis only)
router.post('/images/analyze', optimizeImages)  // Analysis only
router.post('/images/optimize', optimizeAndDownload)  // Full optimization with download
router.post('/images/upload', imageUploadMiddleware, analyzeUploadedImages)

// Image Optimizer (NEW - TinyPNG-level batch optimization)
router.post('/image-optimizer', optimizerUploadMiddleware, batchOptimizeImages)
// AI Naming Routes
router.post('/image-optimizer/ai-names/generate', generateAINames)
router.post('/image-optimizer/ai-names/apply', applyAINames)

// Live vs Stage Comparator
router.post('/compare', compareEnvironments)

// Layout Comparator (CSS/Visual differences) - Production Ready
router.post('/compare-layout', compareLayout)
router.get('/compare-layout/example', getExampleResponse)

// Auto Documentation Generator (with file upload)
router.post('/docs', uploadMiddleware, generateDocs)

// Newsletter Tester
router.post('/newsletter', testNewsletter)
router.post('/newsletter/fix', autoFixNewsletter)

// Lighthouse
router.post('/lighthouse', runLighthouse)

// Dashboard & Stats
router.get('/dashboard/stats', getDashboardStats)
router.get('/dashboard/history', getAuditHistory)

export default router
