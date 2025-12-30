/**
 * Email Accessibility Service (Production Auditor)
 * Performs semantic and visual accessibility analysis based on WCAG 2.1 AA standards.
 */

import { logger } from '../utils/logger.js';
import { JSDOM } from 'jsdom';

class EmailAccessibilityService {
    /**
     * Run high-fidelity accessibility audit
     */
    async auditAccessibility(html) {
        try {
            logger.info('Starting production accessibility audit');

            const dom = new JSDOM(html);
            const { document } = dom.window;
            const issues = [];

            // 1. Semantic Checks
            issues.push(...this.checkAltText(document));
            issues.push(...this.checkHeadings(document));
            issues.push(...this.checkLanguage(document));
            issues.push(...this.checkTables(document));

            // 2. Visual Checks
            issues.push(...this.checkColorContrast(document));
            issues.push(...this.checkFontReadability(document));

            // 3. User Interaction Checks
            issues.push(...this.checkLinks(document));

            const score = this.calculateScore(issues);

            return {
                compliant: score >= 90,
                score,
                level: this.determineLevel(score),
                issues,
                summary: this.generateSummary(issues, score)
            };
        } catch (error) {
            logger.error('Accessibility audit crashed', { error: error.message });
            throw new Error(`Audit Failure: ${error.message}`);
        }
    }

    /**
     * WCAG 1.1.1: Non-text Content (Alt Text)
     */
    checkAltText(doc) {
        const issues = [];
        const imgs = doc.querySelectorAll('img');

        imgs.forEach((img, i) => {
            const alt = img.getAttribute('alt');
            const src = img.getAttribute('src') || '';

            if (alt === null) {
                issues.push({
                    type: 'Critical Error',
                    wcag: '1.1.1',
                    message: `Image ${i + 1} is missing the "alt" attribute completely. Screen readers will read the filename.`,
                    impact: 'High',
                    element: `<img src="${src.substring(0, 30)}...">`,
                    fix: 'Add alt="" for decorative images or descriptive text for content images.'
                });
            } else if (alt.trim() === '' && (src.includes('logo') || src.includes('icon'))) {
                issues.push({
                    type: 'Warning',
                    wcag: '1.1.1',
                    message: 'Potential informative image has empty alt text.',
                    impact: 'Medium',
                    element: `<img src="${src.substring(0, 30)}...">`,
                    fix: 'Add descriptive text (e.g., "Company Logo") instead of leaving it empty.'
                });
            }
        });
        return issues;
    }

    /**
     * WCAG 1.4.3: Contrast (Minimum)
     */
    checkColorContrast(doc) {
        const issues = [];
        const textElements = doc.querySelectorAll('p, span, td, div, h1, h2, h3, a');

        textElements.forEach(el => {
            const style = el.getAttribute('style') || '';
            const colorMatch = style.match(/color:\s*(#[0-9a-f]{3,6})/i);
            const bgMatch = style.match(/background-color:\s*(#[0-9a-f]{3,6})/i);

            // Simple inheritance check
            let bgColor = bgMatch ? bgMatch[1] : '#ffffff';
            if (!bgMatch) {
                let parent = el.parentElement;
                while (parent) {
                    const ps = parent.getAttribute('style') || '';
                    const pbg = ps.match(/background-color:\s*(#[0-9a-f]{3,6})/i);
                    if (pbg) {
                        bgColor = pbg[1];
                        break;
                    }
                    parent = parent.parentElement;
                }
            }

            if (colorMatch) {
                const textColor = colorMatch[1];
                const ratio = this.getContrastRatio(textColor, bgColor);

                // WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text
                const fontSize = parseInt(style.match(/font-size:\s*(\d+)px/)?.[1] || '16');
                const isLarge = fontSize >= 18;
                const threshold = isLarge ? 3 : 4.5;

                if (ratio < threshold) {
                    issues.push({
                        type: 'Contrast Error',
                        wcag: '1.4.3',
                        message: `Low contrast ratio (${ratio.toFixed(2)}:1). Required: ${threshold}:1 for ${isLarge ? 'large' : 'normal'} text.`,
                        impact: 'High',
                        colors: { text: textColor, background: bgColor },
                        element: el.tagName.toLowerCase(),
                        fix: `Change text color to a darker or lighter shade to meet ${threshold}:1 ratio.`
                    });
                }
            }
        });
        return issues;
    }

    /**
     * WCAG 1.3.1: Info and Relationships (Headings & Tables)
     */
    checkHeadings(doc) {
        const issues = [];
        const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));

        let lastLevel = 0;
        headings.forEach(h => {
            const level = parseInt(h.tagName[1]);
            if (level > lastLevel + 1 && lastLevel !== 0) {
                issues.push({
                    type: 'Structure Error',
                    wcag: '1.3.1',
                    message: `Skipped heading level from H${lastLevel} to H${level}.`,
                    impact: 'Medium',
                    element: h.tagName.toLowerCase(),
                    fix: `Ensure headings follow a logical sequence (H1 -> H2 -> H3).`
                });
            }
            lastLevel = level;
        });

        if (headings.length > 0 && headings[0].tagName !== 'H1') {
            issues.push({
                type: 'Warning',
                wcag: '1.3.1',
                message: 'First heading is not an H1.',
                impact: 'Low',
                fix: 'Use H1 for the main title of the email.'
            });
        }
        return issues;
    }

    /**
     * WCAG 3.1.1: Language of Page
     */
    checkLanguage(doc) {
        const issues = [];
        const html = doc.querySelector('html');
        if (!html || !html.getAttribute('lang')) {
            issues.push({
                type: 'Critical Error',
                wcag: '3.1.1',
                message: 'Missing "lang" attribute on <html> tag.',
                impact: 'High',
                fix: 'Add lang="en" (or appropriate language code) to the <html> tag.'
            });
        }
        return issues;
    }

    /**
     * Email Best Practice: Table Roles
     */
    checkTables(doc) {
        const issues = [];
        const tables = doc.querySelectorAll('table');
        tables.forEach((t, i) => {
            if (!t.getAttribute('role')) {
                issues.push({
                    type: 'Technical Warning',
                    wcag: '1.3.1',
                    message: `Table ${i + 1} is missing role="presentation".`,
                    impact: 'Medium',
                    fix: 'Add role="presentation" to layout tables so screen readers ignore the table structure.'
                });
            }
        });
        return issues;
    }

    /**
     * WCAG 2.4.4: Link Purpose
     */
    checkLinks(doc) {
        const issues = [];
        const links = doc.querySelectorAll('a');
        const vague = ['click here', 'read more', 'learn more', 'here', 'link'];

        links.forEach(a => {
            const text = a.textContent.trim().toLowerCase();
            if (vague.includes(text)) {
                issues.push({
                    type: 'Usability Issue',
                    wcag: '2.4.4',
                    message: `Non-descriptive link text: "${a.textContent.trim()}".`,
                    impact: 'Medium',
                    fix: 'Use descriptive text that explains the destination (e.g., "Download Annual Report").'
                });
            }
        });
        return issues;
    }

    /**
     * Check font size readability
     */
    checkFontReadability(doc) {
        const issues = [];
        const elements = doc.querySelectorAll('p, td, span, div');
        elements.forEach(el => {
            const style = el.getAttribute('style') || '';
            const sizeMatch = style.match(/font-size:\s*(\d+)px/);
            if (sizeMatch && parseInt(sizeMatch[1]) < 13) {
                issues.push({
                    type: 'Warning',
                    wcag: '1.4.4',
                    message: `Small font size (${sizeMatch[1]}px) detected.`,
                    impact: 'Medium',
                    fix: 'Increase font size to at least 14px for better readability on mobile.'
                });
            }
        });
        return issues;
    }

    /**
     * Contrast Ratio Calculator (Luminance based)
     */
    getContrastRatio(c1, c2) {
        const l1 = this.getRelativeLuminance(c1);
        const l2 = this.getRelativeLuminance(c2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    getRelativeLuminance(hex) {
        let r = parseInt(hex.substring(1, 3), 16) / 255;
        let g = parseInt(hex.substring(3, 5), 16) / 255;
        let b = parseInt(hex.substring(5, 7), 16) / 255;

        [r, g, b] = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    calculateScore(issues) {
        let score = 100;
        issues.forEach(i => {
            if (i.type.includes('Critical')) score -= 15;
            else if (i.type.includes('Error')) score -= 10;
            else score -= 4;
        });
        return Math.max(0, score);
    }

    determineLevel(score) {
        if (score >= 98) return 'AAA';
        if (score >= 90) return 'AA';
        if (score >= 80) return 'A';
        return 'Non-compliant';
    }

    generateSummary(issues, score) {
        return {
            total: issues.length,
            critical: issues.filter(i => i.type.includes('Critical')).length,
            errors: issues.filter(i => i.type.includes('Error')).length,
            warnings: issues.filter(i => i.type === 'Warning' || i.type.includes('Usability')).length,
            recommendation: score < 90 ? 'Critical fixes required for WCAG compliance.' : 'Design is accessible. Minor improvements possible.'
        };
    }
}

export default new EmailAccessibilityService();
