/**
 * Email Accessibility Service
 * WCAG 2.1 AA compliance checker for email templates
 */

import { logger } from '../utils/logger.js';
import { JSDOM } from 'jsdom';

class EmailAccessibilityService {
    /**
     * Run comprehensive accessibility audit
     */
    async auditAccessibility(html) {
        try {
            logger.info('Running accessibility audit on email');

            const dom = new JSDOM(html);
            const document = dom.window.document;

            const issues = [];

            // Run all accessibility checks
            issues.push(...this.checkAltText(document));
            issues.push(...this.checkColorContrast(html, document));
            issues.push(...this.checkFontSizes(document));
            issues.push(...this.checkLinkAccessibility(document));
            issues.push(...this.checkSemanticStructure(document));
            issues.push(...this.checkTableStructure(document));
            issues.push(...this.checkLanguage(document));

            // Calculate compliance score
            const score = this.calculateComplianceScore(issues);
            const level = this.getComplianceLevel(score);

            logger.info('Accessibility audit complete', {
                score,
                level,
                issuesCount: issues.length
            });

            return {
                compliant: score >= 90,
                score,
                level, // 'AAA', 'AA', 'A', or 'Non-compliant'
                issues,
                summary: this.generateSummary(issues, score)
            };
        } catch (error) {
            logger.error('Error running accessibility audit', { error: error.message });
            throw new Error(`Accessibility audit failed: ${error.message}`);
        }
    }

    /**
     * Check alt text for images
     */
    checkAltText(document) {
        const issues = [];
        const images = document.querySelectorAll('img');

        images.forEach((img, index) => {
            const alt = img.getAttribute('alt');
            const src = img.getAttribute('src');

            if (!alt && alt !== '') {
                issues.push({
                    type: 'alt_text',
                    severity: 'error',
                    wcagCriterion: '1.1.1',
                    message: `Image ${index + 1} missing alt attribute`,
                    element: 'img',
                    autoFix: true
                });
            } else if (alt === '') {
                // Empty alt is OK for decorative images
                // But check if it should be decorative
                if (src && src.includes('logo')) {
                    issues.push({
                        type: 'alt_text',
                        severity: 'warning',
                        wcagCriterion: '1.1.1',
                        message: `Logo image has empty alt text - should be descriptive`,
                        element: 'img',
                        autoFix: true
                    });
                }
            } else if (alt.length < 5) {
                issues.push({
                    type: 'alt_text',
                    severity: 'warning',
                    wcagCriterion: '1.1.1',
                    message: `Image ${index + 1} has very short alt text: "${alt}" - consider more descriptive text`,
                    element: 'img'
                });
            }
        });

        return issues;
    }

    /**
     * Check color contrast ratios using real luminance calculations
     */
    checkColorContrast(html, document) {
        const issues = [];
        const elementsWithText = document.querySelectorAll('p, span, div, td, h1, h2, h3, h4, h5, h6, a');

        elementsWithText.forEach((element) => {
            const style = element.getAttribute('style') || '';
            const colorMatch = style.match(/(?:^|;)\s*color:\s*(#[0-9a-f]{3,6})/i);
            const bgMatch = style.match(/background(?:-color)?:\s*(#[0-9a-f]{3,6})/i);

            // Inherit background if not found (simple traversal)
            let bgColor = bgMatch ? bgMatch[1] : null;
            let current = element;
            while (!bgColor && current.parentElement) {
                current = current.parentElement;
                const parentStyle = current.getAttribute('style') || '';
                const pBgMatch = parentStyle.match(/background(?:-color)?:\s*(#[0-9a-f]{3,6})/i);
                if (pBgMatch) bgColor = pBgMatch[1];
            }

            if (colorMatch && bgColor) {
                const normBg = this.normalizeColor(bgColor);
                const normText = this.normalizeColor(colorMatch[1]);
                const contrast = this.calculateContrastRatio(normBg, normText);

                const fontSize = this.getFontSize(element);
                const isBold = style.includes('bold') || style.includes('700');
                const isLargeText = fontSize >= 24 || (fontSize >= 18.5 && isBold);

                const required = isLargeText ? 3.0 : 4.5;

                if (contrast < required) {
                    issues.push({
                        type: 'color_contrast',
                        severity: 'error',
                        wcagCriterion: '1.4.3',
                        message: `Contrast ratio ${contrast.toFixed(2)}:1 is below required ${required}:1 for ${isLargeText ? 'large' : 'normal'} text.`,
                        element: element.tagName.toLowerCase(),
                        colors: { background: normBg, text: normText },
                        suggestedFix: `Increase contrast between ${normText} and ${normBg}`
                    });
                }
            }
        });

        return issues;
    }

    /**
     * Check minimum font sizes
     */
    checkFontSizes(document) {
        const issues = [];
        const textElements = document.querySelectorAll('p, span, div, td, th, h1, h2, h3, h4, h5, h6, a');

        textElements.forEach(element => {
            const fontSize = this.getFontSize(element);

            if (fontSize < 14) {
                issues.push({
                    type: 'font_size',
                    severity: 'warning',
                    wcagCriterion: '1.4.4',
                    message: `Font size ${fontSize}px is below recommended 14px minimum`,
                    element: element.tagName.toLowerCase(),
                    currentSize: fontSize,
                    recommendedSize: 14
                });
            }
        });

        return issues;
    }

    /**
     * Check link accessibility
     */
    checkLinkAccessibility(document) {
        const issues = [];
        const links = document.querySelectorAll('a');

        links.forEach((link, index) => {
            const text = link.textContent.trim();
            const href = link.getAttribute('href');

            // Check for empty links
            if (!text) {
                issues.push({
                    type: 'link_accessibility',
                    severity: 'error',
                    wcagCriterion: '2.4.4',
                    message: `Link ${index + 1} has no text content`,
                    element: 'a'
                });
            }

            // Check for non-descriptive text
            const nonDescriptive = ['click here', 'here', 'read more', 'link', 'more'];
            if (nonDescriptive.includes(text.toLowerCase())) {
                issues.push({
                    type: 'link_accessibility',
                    severity: 'warning',
                    wcagCriterion: '2.4.4',
                    message: `Link text "${text}" is not descriptive - use meaningful text`,
                    element: 'a'
                });
            }

            // Check for missing href
            if (!href || href === '#') {
                issues.push({
                    type: 'link_accessibility',
                    severity: 'warning',
                    wcagCriterion: '2.1.1',
                    message: `Link has placeholder href "#" - update before sending`,
                    element: 'a'
                });
            }

            // Check color contrast for links
            const style = link.getAttribute('style');
            if (style && !style.includes('color')) {
                issues.push({
                    type: 'link_accessibility',
                    severity: 'info',
                    wcagCriterion: '1.4.1',
                    message: `Link should have distinct color from surrounding text`,
                    element: 'a'
                });
            }
        });

        return issues;
    }

    /**
     * Check semantic structure
     */
    checkSemanticStructure(document) {
        const issues = [];

        // Check heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let previousLevel = 0;

        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName[1]);

            if (index === 0 && level !== 1) {
                issues.push({
                    type: 'semantic_structure',
                    severity: 'warning',
                    wcagCriterion: '1.3.1',
                    message: `First heading should be h1, found ${heading.tagName.toLowerCase()}`,
                    element: heading.tagName.toLowerCase()
                });
            }

            if (level > previousLevel + 1 && previousLevel > 0) {
                issues.push({
                    type: 'semantic_structure',
                    severity: 'warning',
                    wcagCriterion: '1.3.1',
                    message: `Heading hierarchy skipped from h${previousLevel} to h${level}`,
                    element: heading.tagName.toLowerCase()
                });
            }

            previousLevel = level;
        });

        return issues;
    }

    /**
     * Check table structure
     */
    checkTableStructure(document) {
        const issues = [];
        const tables = document.querySelectorAll('table');

        tables.forEach((table, index) => {
            // Check for role="presentation" on layout tables
            const role = table.getAttribute('role');

            if (!role) {
                issues.push({
                    type: 'table_structure',
                    severity: 'info',
                    wcagCriterion: '1.3.1',
                    message: `Table ${index + 1} should have role="presentation" if used for layout`,
                    element: 'table',
                    autoFix: true
                });
            }

            // Check for proper table headers (only for data tables)
            if (role !== 'presentation') {
                const headers = table.querySelectorAll('th');
                if (headers.length === 0) {
                    issues.push({
                        type: 'table_structure',
                        severity: 'warning',
                        wcagCriterion: '1.3.1',
                        message: `Data table ${index + 1} missing header cells (th)`,
                        element: 'table'
                    });
                }
            }
        });

        return issues;
    }

    /**
     * Check language attribute
     */
    checkLanguage(document) {
        const issues = [];
        const html = document.documentElement;
        const lang = html.getAttribute('lang');

        if (!lang) {
            issues.push({
                type: 'language',
                severity: 'error',
                wcagCriterion: '3.1.1',
                message: 'HTML element missing lang attribute',
                element: 'html',
                autoFix: true,
                suggestedFix: 'Add lang="en" to html element'
            });
        }

        return issues;
    }

    /**
     * Calculate WCAG compliance score
     */
    calculateComplianceScore(issues) {
        let score = 100;

        issues.forEach(issue => {
            if (issue.severity === 'error') score -= 15;
            else if (issue.severity === 'warning') score -= 7;
            else if (issue.severity === 'info') score -= 3;
        });

        return Math.max(0, score);
    }

    /**
     * Get compliance level
     */
    getComplianceLevel(score) {
        if (score >= 95) return 'AAA';
        if (score >= 90) return 'AA';
        if (score >= 80) return 'A';
        return 'Non-compliant';
    }

    /**
     * Generate summary
     */
    generateSummary(issues, score) {
        const errors = issues.filter(i => i.severity === 'error').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;
        const info = issues.filter(i => i.severity === 'info').length;

        return {
            totalIssues: issues.length,
            errors,
            warnings,
            info,
            score,
            recommendation: score >= 90
                ? 'Email meets WCAG 2.1 AA standards'
                : errors > 0
                    ? 'Fix critical accessibility errors before sending'
                    : 'Consider addressing warnings for better accessibility'
        };
    }

    /**
     * Get font size from element
     */
    getFontSize(element) {
        const style = element.getAttribute('style');
        if (!style) return 16; // Default

        const match = style.match(/font-size:\s*(\d+)px/);
        return match ? parseInt(match[1]) : 16;
    }

    /**
     * Calculate contrast ratio
     */
    calculateContrastRatio(color1, color2) {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Get relative luminance
     */
    getLuminance(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        const [r, g, b] = rgb.map(val => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        return [
            parseInt(hex.substr(0, 2), 16),
            parseInt(hex.substr(2, 2), 16),
            parseInt(hex.substr(4, 2), 16)
        ];
    }

    /**
     * Normalize color to 6-digit hex
     */
    normalizeColor(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        return '#' + hex;
    }

    /**
     * Suggest contrast fix
     */
    suggestContrastFix(bgColor, textColor, requiredRatio) {
        // Simple suggestion: darken or lighten text
        const bgLum = this.getLuminance(bgColor);

        if (bgLum > 0.5) {
            return { suggestion: 'Use darker text color', suggestedColor: '#333333' };
        } else {
            return { suggestion: 'Use lighter text color', suggestedColor: '#ffffff' };
        }
    }
}

export default new EmailAccessibilityService();
