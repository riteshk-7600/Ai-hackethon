/**
 * Email Validator Service
 * Validates email HTML for compatibility, errors, and best practices
 */

import { logger } from '../utils/logger.js';
import { JSDOM } from 'jsdom';

class EmailValidatorService {
    /**
     * Validate email HTML comprehensively
     */
    async validateEmail(html) {
        try {
            logger.info('Validating email HTML');

            const issues = [];
            const warnings = [];
            const suggestions = [];

            // Parse HTML
            const dom = new JSDOM(html);
            const document = dom.window.document;

            // Run all validation checks
            issues.push(...this.checkHtmlStructure(document));
            issues.push(...this.checkEmailClientCompatibility(html, document));
            warnings.push(...this.checkBestPractices(document));
            suggestions.push(...this.checkOptimizations(html, document));

            // Calculate scores
            const compatibility = this.calculateCompatibilityScore(issues, warnings);
            const spamScore = this.calculateSpamScore(html, document);
            const fileSize = Buffer.byteLength(html, 'utf8');

            logger.info('Email validation complete', {
                issuesCount: issues.length,
                warningsCount: warnings.length,
                compatibility,
                spamScore
            });

            return {
                valid: issues.filter(i => i.severity === 'error').length === 0,
                issues,
                warnings,
                suggestions,
                scores: {
                    compatibility,
                    spamScore,
                    fileSize,
                    fileSizeFormatted: this.formatFileSize(fileSize)
                }
            };
        } catch (error) {
            logger.error('Error validating email', { error: error.message });
            throw new Error(`Email validation failed: ${error.message}`);
        }
    }

    /**
     * Check HTML structure for errors
     */
    checkHtmlStructure(document) {
        const issues = [];

        // Check for unclosed tags (JSDOM helps with this)
        const allElements = document.querySelectorAll('*');
        allElements.forEach((element, index) => {
            // Check for common issues
            if (element.tagName === 'TABLE') {
                if (!element.hasAttribute('cellspacing')) {
                    issues.push({
                        type: 'html_structure',
                        severity: 'warning',
                        message: 'Table missing cellspacing attribute',
                        line: this.getLineNumber(element),
                        autoFix: true
                    });
                }
            }

            if (element.tagName === 'IMG') {
                if (!element.hasAttribute('alt')) {
                    issues.push({
                        type: 'html_structure',
                        severity: 'error',
                        message: `Image missing alt text`,
                        line: this.getLineNumber(element),
                        autoFix: true
                    });
                }
                if (!element.hasAttribute('width') || !element.hasAttribute('height')) {
                    issues.push({
                        type: 'html_structure',
                        severity: 'warning',
                        message: 'Image missing width/height attributes',
                        line: this.getLineNumber(element),
                        autoFix: true
                    });
                }
            }
        });

        return issues;
    }

    /**
     * Check email client compatibility
     */
    checkEmailClientCompatibility(html, document) {
        const issues = [];

        // Check for unsupported CSS
        const unsupportedCss = [
            { prop: 'flexbox', regex: /display:\s*flex/gi, message: 'Flexbox not supported in email clients' },
            { prop: 'grid', regex: /display:\s*grid/gi, message: 'CSS Grid not supported in email clients' },
            { prop: 'position', regex: /position:\s*(absolute|fixed|sticky)/gi, message: 'CSS position not fully supported' },
            { prop: 'float', regex: /float:\s*(left|right)/gi, message: 'CSS float not recommended for emails' },
            { prop: 'transform', regex: /transform:/gi, message: 'CSS transform not supported in most email clients' }
        ];

        unsupportedCss.forEach(({ prop, regex, message }) => {
            if (regex.test(html)) {
                issues.push({
                    type: 'compatibility',
                    severity: 'error',
                    message: message,
                    property: prop,
                    autoFix: true
                });
            }
        });

        // Check for external stylesheets
        const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
        if (linkTags.length > 0) {
            issues.push({
                type: 'compatibility',
                severity: 'error',
                message: 'External stylesheets not supported - use inline styles only',
                count: linkTags.length,
                autoFix: true
            });
        }

        // Check for embedded style tags (acceptable but inline is better)
        const styleTags = document.querySelectorAll('style');
        const hasResponsiveStyles = Array.from(styleTags).some(
            tag => tag.textContent.includes('@media')
        );

        if (!hasResponsiveStyles) {
            issues.push({
                type: 'compatibility',
                severity: 'info',
                message: 'No responsive media queries found - email may not be mobile-friendly'
            });
        }

        // Check for JavaScript
        const scriptTags = document.querySelectorAll('script');
        if (scriptTags.length > 0) {
            issues.push({
                type: 'compatibility',
                severity: 'error',
                message: 'JavaScript not supported in email clients',
                count: scriptTags.length,
                autoFix: true
            });
        }

        return issues;
    }

    /**
     * Check best practices
     */
    checkBestPractices(document) {
        const warnings = [];

        // Check email width
        const mainTable = document.querySelector('table[width="600"]');
        if (!mainTable) {
            warnings.push({
                type: 'best_practice',
                severity: 'warning',
                message: 'Recommended email width is 600px for desktop compatibility'
            });
        }

        // Check for proper DOCTYPE
        const doctype = document.doctype;
        if (!doctype || !doctype.publicId.includes('XHTML')) {
            warnings.push({
                type: 'best_practice',
                severity: 'warning',
                message: 'Use XHTML DOCTYPE for best email client compatibility',
                autoFix: true
            });
        }

        // Check meta viewport
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            warnings.push({
                type: 'best_practice',
                severity: 'warning',
                message: 'Missing viewport meta tag for mobile responsiveness',
                autoFix: true
            });
        }

        // Check image formats
        const images = document.querySelectorAll('img[src]');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && src.includes('.webp')) {
                warnings.push({
                    type: 'best_practice',
                    severity: 'warning',
                    message: 'WebP images may not display in all email clients - use JPG or PNG'
                });
            }
        });

        return warnings;
    }

    /**
     * Check optimizations
     */
    checkOptimizations(html, document) {
        const suggestions = [];

        // Check file size
        const fileSize = Buffer.byteLength(html, 'utf8');
        if (fileSize > 102400) { // 100KB
            suggestions.push({
                type: 'optimization',
                severity: 'info',
                message: `Email HTML is ${this.formatFileSize(fileSize)}. Consider optimizing to under 100KB.`
            });
        }

        // Check for inline images
        if (html.includes('data:image')) {
            suggestions.push({
                type: 'optimization',
                severity: 'warning',
                message: 'Inline base64 images increase file size. Consider hosting images externally.'
            });
        }

        // Check for minification opportunity
        const whitespaceRatio = (html.match(/\s/g) || []).length / html.length;
        if (whitespaceRatio > 0.3) {
            suggestions.push({
                type: 'optimization',
                severity: 'info',
                message: 'HTML can be minified to reduce file size',
                autoFix: true
            });
        }

        return suggestions;
    }

    /**
     * Calculate professional email spam score
     */
    calculateSpamScore(html, document) {
        let spamScore = 0;
        const spamIssues = [];

        // 1. Spam trigger words (High density)
        const highRiskWords = [
            'FREE', 'WINNER', 'CASH', 'BONUS', 'CLICK HERE',
            '100% OFF', 'ACT NOW', 'LIMITED TIME', 'URGENT',
            'GUARANTEED', 'NO COST', 'INCREASE SALES', 'EARN MONEY'
        ];

        const text = document.body.textContent.toUpperCase();
        highRiskWords.forEach(word => {
            const count = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
            if (count > 0) {
                spamScore += count * 8;
                spamIssues.push(`High-risk spam word "${word}" found ${count} time(s)`);
            }
        });

        // 2. High-density punctuation
        const exclamationCount = (text.match(/!/g) || []).length;
        if (exclamationCount > 3) {
            spamScore += exclamationCount * 2;
            spamIssues.push(`Excessive use of exclamation marks (${exclamationCount})`);
        }

        // 3. Image-to-Text Ratio (Production heuristic)
        const textLength = document.body.textContent.trim().length;
        const images = document.querySelectorAll('img');
        if (images.length > 3 && textLength < 400) {
            spamScore += 25;
            spamIssues.push('Low image-to-text ratio (potential spam trigger)');
        }

        // 4. Broken/Missing Links
        const links = document.querySelectorAll('a');
        const brokenLinks = Array.from(links).filter(a => !a.href || a.href === '#').length;
        if (brokenLinks > 0) {
            spamScore += brokenLinks * 5;
            spamIssues.push(`${brokenLinks} placeholder links found`);
        }

        return {
            score: Math.min(spamScore, 100),
            risk: spamScore < 15 ? 'low' : spamScore < 40 ? 'medium' : 'high',
            issues: spamIssues
        };
    }

    /**
     * Calculate compatibility score
     */
    calculateCompatibilityScore(issues, warnings) {
        let score = 100;

        issues.forEach(issue => {
            if (issue.severity === 'error') score -= 10;
            if (issue.severity === 'warning') score -= 5;
        });

        warnings.forEach(warning => {
            score -= 3;
        });

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Auto-fix common issues (Engine grade)
     */
    async autoFix(html) {
        try {
            logger.info('Running production-grade auto-fix');

            const dom = new JSDOM(html);
            const document = dom.window.document;

            // 1. Enforce role="presentation" on all layout tables
            document.querySelectorAll('table').forEach(table => {
                if (!table.getAttribute('role')) {
                    table.setAttribute('role', 'presentation');
                }
                // Enforce email-safe defaults
                if (!table.getAttribute('cellspacing')) table.setAttribute('cellspacing', '0');
                if (!table.getAttribute('cellpadding')) table.setAttribute('cellpadding', '0');
                if (!table.getAttribute('border')) table.setAttribute('border', '0');
            });

            // 2. Fix missing alt text
            document.querySelectorAll('img').forEach((img, i) => {
                if (!img.getAttribute('alt')) {
                    img.setAttribute('alt', `Email Image ${i + 1}`);
                }
            });

            // 3. Strip incompatible CSS and Scripts
            let fixedHtml = dom.serialize();

            fixedHtml = fixedHtml.replace(/display:\s*flex[^;"]*/gi, '');
            fixedHtml = fixedHtml.replace(/display:\s*grid[^;"]*/gi, '');
            fixedHtml = fixedHtml.replace(/position:\s*(absolute|fixed|sticky)[^;"]*/gi, '');
            fixedHtml = fixedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

            // 4. Ensure XHTML DOCTYPE
            if (!fixedHtml.includes('<!DOCTYPE')) {
                const xhtmlDoctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n';
                fixedHtml = xhtmlDoctype + fixedHtml;
            }

            logger.info('Auto-fix complete');
            return fixedHtml;
        } catch (error) {
            logger.error('Auto-fix failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get line number for element (approximate)
     */
    getLineNumber(element) {
        return 'N/A'; // JSDOM doesn't provide line numbers easily
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / 1048576).toFixed(2)} MB`;
    }
}

export default new EmailValidatorService();
