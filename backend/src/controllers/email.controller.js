/**
 * Email Template Controller
 * Handles all email template generation and testing endpoints
 */

import emailVisionService from '../services/email-vision.service.js';
import emailGeneratorService from '../services/email-generator.service.js';
import emailValidatorService from '../services/email-validator.service.js';
import emailAccessibilityService from '../services/email-accessibility.service.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailController {
    /**
     * Analyze uploaded email design image
     * POST /api/email/analyze
     */
    async analyzeDesign(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No design image uploaded'
                });
            }

            const imagePath = req.file.path;

            // Analyze design with AI vision
            const analysis = await emailVisionService.analyzeDesign(imagePath);

            // Get improvement suggestions
            const suggestions = await emailVisionService.suggestImprovements(analysis);

            // Clean up uploaded file
            await fs.unlink(imagePath);

            res.json({
                success: true,
                analysis,
                suggestions
            });
        } catch (error) {
            logger.error('Error analyzing email design', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Generate email HTML from design analysis
     * POST /api/email/generate
     */
    async generateEmail(req, res) {
        try {
            const { analysis, options } = req.body;

            if (!analysis) {
                return res.status(400).json({
                    success: false,
                    error: 'Design analysis required'
                });
            }

            // Generate email HTML
            const html = await emailGeneratorService.generateEmailHtml(analysis, options);

            // Validate generated HTML
            const validation = await emailValidatorService.validateEmail(html);

            // Run accessibility audit
            const accessibility = await emailAccessibilityService.auditAccessibility(html);

            res.json({
                success: true,
                html,
                validation,
                accessibility,
                preview: {
                    desktop: true,
                    mobile: true,
                    darkMode: options?.includeDarkMode ?? true
                }
            });
        } catch (error) {
            logger.error('Error generating email', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Generate basic email template (no design upload)
     * POST /api/email/generate-basic
     */
    async generateBasicTemplate(req, res) {
        try {
            const { options } = req.body;

            // Generate basic template
            const html = await emailGeneratorService.generateBasicTemplate(options);

            // Validate
            const validation = await emailValidatorService.validateEmail(html);

            // Accessibility audit
            const accessibility = await emailAccessibilityService.auditAccessibility(html);

            res.json({
                success: true,
                html,
                validation,
                accessibility
            });
        } catch (error) {
            logger.error('Error generating basic template', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Validate existing email HTML
     * POST /api/email/validate
     */
    async validateEmail(req, res) {
        try {
            const { html } = req.body;

            if (!html) {
                return res.status(400).json({
                    success: false,
                    error: 'HTML content required'
                });
            }

            // Run validation
            const validation = await emailValidatorService.validateEmail(html);

            // Run accessibility audit
            const accessibility = await emailAccessibilityService.auditAccessibility(html);

            // Calculate email client compatibility
            const compatibility = this.getClientCompatibility(validation, accessibility);

            res.json({
                success: true,
                validation,
                accessibility,
                compatibility,
                qualityScore: this.calculateQualityScore(validation, accessibility)
            });
        } catch (error) {
            logger.error('Error validating email', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Auto-fix email HTML issues
     * POST /api/email/auto-fix
     */
    async autoFixEmail(req, res) {
        try {
            const { html } = req.body;

            if (!html) {
                return res.status(400).json({
                    success: false,
                    error: 'HTML content required'
                });
            }

            // Auto-fix HTML
            const fixedHtml = await emailValidatorService.autoFix(html);

            // Re-validate
            const validation = await emailValidatorService.validateEmail(fixedHtml);

            // Re-audit accessibility
            const accessibility = await emailAccessibilityService.auditAccessibility(fixedHtml);

            res.json({
                success: true,
                html: fixedHtml,
                validation,
                accessibility,
                improvements: {
                    issuesFixed: this.countFixedIssues(html, fixedHtml)
                }
            });
        } catch (error) {
            logger.error('Error auto-fixing email', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Run accessibility audit only
     * POST /api/email/accessibility
     */
    async checkAccessibility(req, res) {
        try {
            const { html } = req.body;

            if (!html) {
                return res.status(400).json({
                    success: false,
                    error: 'HTML content required'
                });
            }

            const accessibility = await emailAccessibilityService.auditAccessibility(html);

            res.json({
                success: true,
                accessibility
            });
        } catch (error) {
            logger.error('Error checking accessibility', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get preview data for different modes
     * POST /api/email/preview
     */
    async getPreview(req, res) {
        try {
            const { html, mode } = req.body;

            if (!html) {
                return res.status(400).json({
                    success: false,
                    error: 'HTML content required'
                });
            }

            // Mode can be: 'desktop-light', 'desktop-dark', 'mobile-light', 'mobile-dark'
            const previewHtml = this.wrapForPreview(html, mode);

            res.json({
                success: true,
                preview: previewHtml,
                mode
            });
        } catch (error) {
            logger.error('Error generating preview', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Download email HTML file
     * POST /api/email/download
     */
    async downloadEmail(req, res) {
        try {
            const { html, filename } = req.body;

            if (!html) {
                return res.status(400).json({
                    success: false,
                    error: 'HTML content required'
                });
            }

            const finalFilename = filename || 'email-template.html';

            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
            res.send(html);
        } catch (error) {
            logger.error('Error downloading email', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Helper methods

    /**
     * Get email client compatibility matrix
     */
    getClientCompatibility(validation, accessibility) {
        const hasFlexbox = validation.issues.some(i => i.property === 'flexbox');
        const hasGrid = validation.issues.some(i => i.property === 'grid');
        const hasMediaQueries = !validation.issues.some(i => i.message.includes('responsive'));
        const darkModeSupport = !validation.issues.some(i => i.message.includes('dark mode'));
        const wcagCompliant = accessibility.score >= 90;

        return {
            gmail: {
                web: !hasFlexbox && !hasGrid,
                android: !hasFlexbox && !hasGrid,
                ios: !hasFlexbox && !hasGrid
            },
            outlook: {
                windows: true, // Tables always work
                mac: !hasFlexbox && !hasGrid,
                web: !hasFlexbox && !hasGrid
            },
            appleMail: {
                desktop: true,
                ios: true,
                darkMode: darkModeSupport
            },
            yahoo: !hasFlexbox && !hasGrid,
            samsung: !hasFlexbox && !hasGrid,
            responsive: hasMediaQueries,
            darkMode: darkModeSupport,
            accessible: wcagCompliant
        };
    }

    /**
     * Calculate overall quality score
     */
    calculateQualityScore(validation, accessibility) {
        const compatibilityScore = validation.scores.compatibility;
        const accessibilityScore = accessibility.score;
        const spamScore = 100 - validation.scores.spamScore.score;

        // Weighted average
        const overall = Math.round(
            (compatibilityScore * 0.4) +
            (accessibilityScore * 0.4) +
            (spamScore * 0.2)
        );

        return {
            overall,
            compatibility: compatibilityScore,
            accessibility: accessibilityScore,
            spam: spamScore,
            grade: overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : 'D'
        };
    }

    /**
     * Count fixed issues
     */
    countFixedIssues(originalHtml, fixedHtml) {
        // Simple count based on common fixes
        let count = 0;

        if (originalHtml.includes('display: flex') && !fixedHtml.includes('display: flex')) count++;
        if (originalHtml.includes('display: grid') && !fixedHtml.includes('display: grid')) count++;
        if (!originalHtml.includes('cellspacing') && fixedHtml.includes('cellspacing')) count++;

        return count;
    }

    /**
     * Wrap HTML for preview
     */
    wrapForPreview(html, mode) {
        const isDark = mode.includes('dark');
        const isMobile = mode.includes('mobile');

        let wrapped = html;

        // Add dark mode class if needed
        if (isDark) {
            wrapped = `<div style="background-color: #1a1a1a; padding: 20px;">
        ${html}
      </div>`;
        }

        // Add mobile viewport if needed
        if (isMobile) {
            wrapped = `<div style="max-width: 375px; margin: 0 auto;">
        ${wrapped}
      </div>`;
        }

        return wrapped;
    }
}

export default new EmailController();
