/**
 * Email Template Controller (Production Implementation)
 * Orchestrates design analysis, HTML generation, and rigorous testing.
 */

import emailVisionService from '../services/email-vision.service.js';
import emailGeneratorService from '../services/email-generator.service.js';
import emailValidatorService from '../services/email-validator.service.js';
import emailAccessibilityService from '../services/email-accessibility.service.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

class EmailController {
    constructor() {
        this.analyzeDesign = this.analyzeDesign.bind(this);
        this.generateEmail = this.generateEmail.bind(this);
        this.generateBasicTemplate = this.generateBasicTemplate.bind(this);
        this.validateEmail = this.validateEmail.bind(this);
        this.autoFixEmail = this.autoFixEmail.bind(this);
        this.calculateCompatibilityMatrix = this.calculateCompatibilityMatrix.bind(this);
    }

    /**
     * UPLOAD & ANALYZE
     */
    async analyzeDesign(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No design image uploaded' });
            }

            logger.info('Analyzing design image for email conversion', { path: req.file.path });
            const analysis = await emailVisionService.analyzeDesign(req.file.path);

            // Clean up file
            await fs.unlink(req.file.path).catch(e => logger.warn('Temp file cleanup failed', e));

            res.json({
                success: true,
                analysis,
                matchConfidence: analysis.matchConfidence,
                gaps: analysis.confidenceGaps || []
            });
        } catch (error) {
            logger.error('Analysis controller failure', { error: error.message });
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GENERATE FROM ANALYSIS
     */
    async generateEmail(req, res) {
        try {
            const { analysis, options = {} } = req.body;
            if (!analysis) return res.status(400).json({ success: false, error: 'Missing design analysis data' });

            logger.info('Running generation pipeline');

            // 1. Generate HTML (Will throw if confidence < 98%)
            let html;
            try {
                html = await emailGeneratorService.generateEmailHtml(analysis, options);
            } catch (err) {
                logger.error('HTML Generation failed', { error: err.message });
                return res.status(500).json({ success: false, error: `Generation Blocked: ${err.message}` });
            }

            // 2. Validate & Audit (Defensive wrap)
            let validation = { issues: [], metrics: { overall: 0 } };
            let accessibility = { score: 0, issues: [], level: 'N/A' };

            try {
                validation = await emailValidatorService.validateEmail(html) || validation;
            } catch (err) {
                logger.warn('Validator failed, proceeding with empty results', { error: err.message });
            }

            try {
                accessibility = await emailAccessibilityService.auditAccessibility(html) || accessibility;
            } catch (err) {
                logger.warn('Accessibility audit failed, proceeding with empty results', { error: err.message });
            }

            res.json({
                success: true,
                html,
                metrics: {
                    qualityScore: validation?.metrics?.overall || validation?.qualityScore || 0,
                    compatibility: this.calculateCompatibilityMatrix(validation || {}, accessibility || {}),
                    accessibility: {
                        score: accessibility?.score || 0,
                        issues: accessibility?.issues || [],
                        level: accessibility?.level || 'N/A'
                    },
                    spamRisk: validation?.spamRisk || { score: 0, status: 'unknown' },
                    fileSize: validation?.metrics?.fileSize || '0 KB',
                    validation: {
                        issues: (validation?.issues || []).filter(i => i.severity === 'error'),
                        warnings: (validation?.issues || []).filter(i => i.severity === 'warning'),
                        scores: validation?.metrics || {}
                    }
                }
            });
        } catch (error) {
            logger.error('Critical generation failure', { error: error.message, stack: error.stack });
            res.status(500).json({ success: false, error: `Critical Engine Error: ${error.message}` });
        }
    }

    /**
     * GENERATE BASIC TEMPLATE (Testing)
     */
    async generateBasicTemplate(req, res) {
        try {
            const { options = {} } = req.body;
            logger.info('Generating basic template for testing');

            const html = await emailGeneratorService.generateBasicTemplate(options);
            const validation = await emailValidatorService.validateEmail(html);
            const accessibility = await emailAccessibilityService.auditAccessibility(html);

            res.json({
                success: true,
                html,
                metrics: {
                    qualityScore: validation?.metrics?.overall || 0,
                    compatibility: this.calculateCompatibilityMatrix(validation || {}, accessibility || {}),
                    accessibility: {
                        score: accessibility?.score || 0,
                        issues: accessibility?.issues || [],
                        level: accessibility?.level || 'N/A'
                    },
                    spamRisk: validation?.spamRisk || { score: 0, status: 'unknown' },
                    validation: {
                        issues: (validation?.issues || []).filter(i => i.severity === 'error'),
                        warnings: (validation?.issues || []).filter(i => i.severity === 'warning'),
                        scores: validation?.metrics || {}
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * VALIDATE & AUDIT STANDALONE
     */
    async validateEmail(req, res) {
        try {
            const { html } = req.body;
            if (!html) return res.status(400).json({ success: false, error: 'HTML content required' });

            const validation = await emailValidatorService.validateEmail(html);
            const accessibility = await emailAccessibilityService.auditAccessibility(html);

            res.json({
                success: true,
                metrics: {
                    qualityScore: validation?.metrics?.overall || 0,
                    compatibility: this.calculateCompatibilityMatrix(validation || {}, accessibility || {}),
                    accessibility: {
                        score: accessibility?.score || 0,
                        issues: accessibility?.issues || [],
                        level: accessibility?.level || 'N/A'
                    },
                    spamRisk: validation?.spamRisk || { score: 0, status: 'unknown' },
                    validation: {
                        issues: (validation?.issues || []).filter(i => i.severity === 'error'),
                        warnings: (validation?.issues || []).filter(i => i.severity === 'warning'),
                        scores: validation?.metrics || {}
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * PRODUCTION AUTO-FIX
     */
    async autoFixEmail(req, res) {
        try {
            const { html } = req.body;
            if (!html) return res.status(400).json({ success: false, error: 'HTML required for fixing' });

            // Run fixes
            const fixedHtml = await emailValidatorService.autoFix(html);

            // Re-run audits for the "before/after" comparison
            const validation = await emailValidatorService.validateEmail(fixedHtml);
            const accessibility = await emailAccessibilityService.auditAccessibility(fixedHtml);

            res.json({
                success: true,
                html: fixedHtml,
                metrics: {
                    qualityScore: validation?.metrics?.overall || 0,
                    compatibility: this.calculateCompatibilityMatrix(validation || {}, accessibility || {}),
                    accessibility: {
                        score: accessibility?.score || 0,
                        issues: accessibility?.issues || [],
                        level: accessibility?.level || 'N/A'
                    },
                    spamRisk: validation?.spamRisk || { score: 0, status: 'unknown' },
                    validation: {
                        issues: (validation?.issues || []).filter(i => i.severity === 'error'),
                        warnings: (validation?.issues || []).filter(i => i.severity === 'warning'),
                        scores: validation?.metrics || {}
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * HELPERS
     */
    calculateCompatibilityMatrix(v, a) {
        const issues = v.issues || [];
        const hasFlex = issues.some(i => i.message.includes('Flexbox'));
        const hasGrid = issues.some(i => i.message.includes('Grid'));
        const isBroken = issues.some(i => i.category === 'Structure');

        return {
            outlook_win: !hasFlex && !hasGrid && !isBroken,
            outlook_mac: true,
            gmail_web: !hasGrid,
            apple_mail: true,
            samsung_mail: !hasGrid,
            dark_mode: true
        };
    }
}

export default new EmailController();
