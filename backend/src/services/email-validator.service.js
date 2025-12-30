/**
 * Email Validator & Auto-Fix Service (Production Grade)
 * Validates against industry standards and fixes code for Outlook/Gmail compatibility.
 */

import { logger } from '../utils/logger.js';
import { JSDOM } from 'jsdom';

class EmailValidatorService {
    /**
     * Comprehensive Validation
     */
    async validateEmail(html) {
        try {
            logger.info('Validating email for production readiness');

            const dom = new JSDOM(html);
            const doc = dom.window.document;
            const issues = [];

            // 1. Structural Validation
            issues.push(...this.validateStructure(html, doc));

            // 2. Compatibility Checks
            issues.push(...this.validateCompatibility(html, doc));

            // 3. Spam Trigger Analysis
            const spam = this.analyzeSpamRisk(html, doc);

            // 4. Calculate Scores (Real metrics)
            const scores = this.calculateScores(issues, spam, html.length);

            return {
                valid: issues.filter(i => i.severity === 'error').length === 0,
                issues,
                spamRisk: spam,
                qualityScore: scores.overall,
                metrics: scores
            };
        } catch (error) {
            logger.error('Validator engine failure', { error: error.message });
            throw new Error(`Validation Error: ${error.message}`);
        }
    }

    /**
     * Fix bad HTML and inject Outlook hacks
     */
    async autoFix(html) {
        try {
            logger.info('Running production-grade Auto-Fix engine');

            const dom = new JSDOM(html);
            const doc = dom.window.document;

            // 1. Force table properties for every table
            doc.querySelectorAll('table').forEach(table => {
                table.setAttribute('role', 'presentation');
                table.setAttribute('border', '0');
                table.setAttribute('cellpadding', '0');
                table.setAttribute('cellspacing', '0');

                // Enforce mso-table-lspace/rspace on containers
                const currentStyle = table.getAttribute('style') || '';
                if (!currentStyle.includes('mso-table-lspace')) {
                    table.setAttribute('style', `mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; ${currentStyle}`);
                }
            });

            // 2. Clean illegal attributes and styles
            doc.querySelectorAll('*').forEach(el => {
                const style = el.getAttribute('style') || '';

                // Remove flex/grid
                let fixedStyle = style.replace(/display:\s*(flex|grid)[^;]*/gi, '');

                // Inject mso-line-height-rule: exactly for line-height
                if (fixedStyle.includes('line-height') && !fixedStyle.includes('mso-line-height-rule')) {
                    fixedStyle = fixedStyle.replace(/line-height:\s*([^;"]+)/g, 'line-height: $1; mso-line-height-rule: exactly');
                }

                el.setAttribute('style', fixedStyle);
            });

            // 3. Fix images (alt, display:block)
            doc.querySelectorAll('img').forEach(img => {
                if (!img.getAttribute('alt')) img.setAttribute('alt', '');
                const style = img.getAttribute('style') || '';
                if (!style.includes('display: block') && !style.includes('display:block')) {
                    img.setAttribute('style', `display: block; ${style}`);
                }
            });

            let fixedHtml = dom.serialize();

            // 4. Regex-level global fixes
            // Ensure XHTML doctype
            if (!fixedHtml.includes('<!DOCTYPE')) {
                fixedHtml = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' + fixedHtml;
            }

            // Remove scripts
            fixedHtml = fixedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '<!-- [JS removed for email safety] -->');

            return fixedHtml;
        } catch (error) {
            logger.error('Auto-fix engine failure', { error: error.message });
            throw error;
        }
    }

    validateStructure(html, doc) {
        const issues = [];

        // Check for broken tags (simple heuristic)
        const openTags = (html.match(/<[a-zA-Z]+/g) || []).length;
        const closeTags = (html.match(/<\/[a-zA-Z]+/g) || []).length;
        if (Math.abs(openTags - closeTags) > 5) {
            issues.push({
                severity: 'error',
                category: 'Structure',
                message: 'Significant tag mismatch detected. HTML may be malformed.',
                autoFix: true
            });
        }

        if (!doc.querySelector('table')) {
            issues.push({
                severity: 'error',
                category: 'Structure',
                message: 'No <table> found. Professional emails require table-based layouts for Outlook support.',
                autoFix: true
            });
        }

        return issues;
    }

    validateCompatibility(html, doc) {
        const issues = [];

        // Flex/Grid detection
        if (/display:\s*(flex|grid)/i.test(html)) {
            issues.push({
                severity: 'error',
                category: 'Compatibility',
                message: 'Flexbox or CSS Grid detected. These are NOT supported in Outlook (Windows).',
                autoFix: true
            });
        }

        // Web Fonts without fallback
        const fontStacks = html.match(/font-family:\s*([^;"]+)/g) || [];
        fontStacks.forEach(stack => {
            if (stack.includes('Google') && !stack.includes('sans-serif') && !stack.includes('serif')) {
                issues.push({
                    severity: 'warning',
                    category: 'Compatibility',
                    message: 'Web font used without a generic fallback (sans-serif/serif).',
                    autoFix: false
                });
            }
        });

        return issues;
    }

    analyzeSpamRisk(html, doc) {
        let score = 0;
        const triggers = [];
        const text = doc.body.textContent.toLowerCase();

        const words = ['free', 'winner', 'cash', 'guaranteed', '100% off', 'urgent', 'act now'];
        words.forEach(word => {
            if (text.includes(word)) {
                score += 10;
                triggers.push(`Spam keyword suspect: "${word}"`);
            }
        });

        // Image to text ratio
        const textLength = text.trim().length;
        const images = doc.querySelectorAll('img').length;
        if (images > 2 && textLength < 200) {
            score += 30;
            triggers.push('High image-to-text ratio (often flagged as spam)');
        }

        return {
            score: Math.min(score, 100),
            rating: score < 20 ? 'Low' : score < 50 ? 'Medium' : 'High',
            triggers
        };
    }

    calculateScores(issues, spam, length) {
        let compatibility = 100;
        issues.forEach(i => {
            if (i.severity === 'error') compatibility -= 15;
            else compatibility -= 7;
        });

        const spamQuality = 100 - spam.score;
        const overall = Math.round((compatibility * 0.6) + (spamQuality * 0.4));

        return {
            overall: Math.max(5, Math.min(99, overall)), // Never 0 or 100 as per request
            compatibility: Math.max(10, compatibility),
            spamQuality
        };
    }
}

export default new EmailValidatorService();
