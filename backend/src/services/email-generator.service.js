/**
 * Email Generator Service (Production Logic)
 * Converts email design analysis into production-ready HTML with <table>-based layouts.
 */

import { EmailTableBuilder } from '../utils/email-templates/table-builder.js';
import { OutlookFixes } from '../utils/email-templates/outlook-fixes.js';
import { DarkModeSupport } from '../utils/email-templates/dark-mode.js';
import { logger } from '../utils/logger.js';

class EmailGeneratorService {
    /**
     * Generate complete email HTML from design analysis
     */
    async generateEmailHtml(analysis, options = {}) {
        try {
            logger.info('Starting production-grade email generation engine');

            const {
                matchConfidence = 0,
                confidenceGaps = [],
                document = { width: 600, backgroundColor: '#ffffff' },
                layout = { sections: [] },
                components = []
            } = analysis;

            // ABSOLUTE GOAL: Strict confidence check
            if (matchConfidence < 98) {
                logger.error('Match confidence below 98%. Blocking generation.', { matchConfidence, confidenceGaps });
                throw new Error(`Incomplete Layout Detection (${matchConfidence}%). Gaps: ${confidenceGaps.join(', ') || 'Insufficient visual data'}. Generation blocked to prevent broken HTML.`);
            }

            const width = document.width || 600;
            const bgColor = document.backgroundColor || '#ffffff';

            // 1. Sort sections by vertical position
            const sortedSections = [...layout.sections].sort((a, b) => a.y - b.y);

            // 2. Process each section into structured HTML
            const sectionHtmls = [];
            for (const section of sortedSections) {
                const sectionHtml = this.processSection(section, components, analysis);
                if (sectionHtml) {
                    sectionHtmls.push(sectionHtml);
                }
            }

            // 3. Assemble using Table Builder
            let html = EmailTableBuilder.buildEmail(
                sectionHtmls,
                bgColor,
                bgColor, // Inner/Outer matching for clean transition
                width
            );

            // 4. Apply Outlook & Dark Mode Enhancements
            html = this.applyEnhancements(html, analysis);

            logger.info('Email generation successful');
            return html;
        } catch (error) {
            logger.error('Generator engine failure', { error: error.message });
            throw error; // Rethrow to let controller handle it
        }
    }

    /**
     * Process a section: handles grouping components into logical rows and columns
     */
    processSection(section, allComponents, analysis) {
        // Filter components belonging to this section
        const sectionComponents = allComponents.filter(c =>
            c.sectionId === section.id ||
            (c.coords && c.coords.y >= section.y && c.coords.y < section.y + section.height)
        );

        if (sectionComponents.length === 0) return null;

        // PRODUCTION GRID DETECTION
        // Group components by Y-coordinate variance (approx rows)
        const rows = [];
        const sorted = [...sectionComponents].sort((a, b) => a.coords.y - b.coords.y);

        let currentRow = [];
        let lastY = -1;

        for (const comp of sorted) {
            if (lastY === -1 || Math.abs(comp.coords.y - lastY) < 15) {
                currentRow.push(comp);
            } else {
                rows.push(currentRow.sort((a, b) => a.coords.x - b.coords.x));
                currentRow = [comp];
            }
            lastY = comp.coords.y;
        }
        if (currentRow.length > 0) {
            rows.push(currentRow.sort((a, b) => a.coords.x - b.coords.x));
        }

        // Render rows
        const rowHtmls = rows.map(row => {
            if (row.length === 1) {
                // Full width row
                return EmailTableBuilder.createRow(this.renderComponent(row[0]), {}, {
                    padding: this.calculateComponentPadding(row[0], section)
                });
            } else {
                // Multi-column row
                const columnContents = row.map(comp => this.renderComponent(comp));
                return EmailTableBuilder.createColumns(columnContents, {
                    padding: '0 10px'
                });
            }
        });

        // Wrap the entire section
        return EmailTableBuilder.wrapInTable(rowHtmls.join('\n'), {
            'background-color': section.backgroundColor || 'transparent',
            'padding': this.formatPadding(section.padding)
        });
    }

    /**
     * Render individual component
     */
    renderComponent(comp) {
        const { type, content, altText, coords = {}, styles = {} } = comp;
        const normalizedStyles = this.normalizeStyles(styles);

        switch (type) {
            case 'text':
                if (parseInt(styles.fontSize) >= 20 || styles.fontWeight === '700') {
                    return EmailTableBuilder.createHeading(content, 2, normalizedStyles);
                }
                return EmailTableBuilder.createText(content, normalizedStyles);

            case 'image':
                // In production, we'd use the actual asset URL from analysis
                const imageUrl = styles.imageUrl || `https://via.placeholder.com/${coords.w}x${coords.h}?text=${encodeURIComponent(altText || 'Image')}`;
                return EmailTableBuilder.createImage(imageUrl, altText || 'Email graphic', coords.w, coords.h, normalizedStyles);

            case 'button':
                return EmailTableBuilder.createButton(
                    content || 'Action',
                    styles.linkUrl || '#',
                    normalizedStyles,
                    { width: coords.w, height: coords.h }
                );

            case 'spacer':
                return EmailTableBuilder.createSpacer(coords.h || 20);

            case 'divider':
                return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="border-top: ${styles.border || '1px solid #eeeeee'}; padding: 10px 0;">&nbsp;</td>
                    </tr>
                </table>`;

            default:
                return `<!-- [Component Type Not Supported: ${type}] -->`;
        }
    }

    /**
     * Normalize AI styles to standard CSS
     */
    normalizeStyles(aiStyles) {
        const cssMap = {
            fontSize: 'font-size',
            fontWeight: 'font-weight',
            fontFamily: 'font-family',
            color: 'color',
            backgroundColor: 'background-color',
            textAlign: 'text-align',
            lineHeight: 'line-height',
            borderRadius: 'border-radius',
            padding: 'padding',
            margin: 'margin'
        };

        const result = {};
        for (const [key, val] of Object.entries(aiStyles)) {
            if (cssMap[key]) {
                result[cssMap[key]] = val;
            }
        }
        return result;
    }

    /**
     * Calculate padding for component relative to container
     */
    calculateComponentPadding(comp, section) {
        // Simple logic: if x > 0, assume left padding
        const left = comp.coords.x > 0 ? `${comp.coords.x}px` : '0';
        return `10px ${left} 10px ${left}`;
    }

    /**
     * Format padding objects
     */
    formatPadding(p) {
        if (!p) return '0';
        if (typeof p === 'string') return p;
        return `${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`;
    }

    /**
     * Apply Outlook line-height and Dark Mode support
     */
    applyEnhancements(html, analysis) {
        // Outlook mso-line-height-rule: exactly
        html = html.replace(/line-height:\s*([^;"]+)/g, 'line-height: $1; mso-line-height-rule: exactly');

        // Dark Mode injection
        const dmStyles = DarkModeSupport.generateDarkModeImplementation({
            background: analysis.document?.backgroundColor || '#ffffff',
            text: '#333333'
        });

        html = html.replace('</head>', `  ${dmStyles.metaTags}\n  ${dmStyles.styles}\n</head>`);

        return html;
    }

    /**
     * Basic starter template for testing
     */
    async generateBasicTemplate(options = {}) {
        const testAnalysis = {
            matchConfidence: 100,
            document: { width: 600, backgroundColor: '#ffffff' },
            layout: {
                sections: [
                    { id: '1', type: 'header', y: 0, height: 80, backgroundColor: '#ffffff', padding: '20px' },
                    { id: '2', type: 'body', y: 80, height: 200, backgroundColor: '#ffffff', padding: '20px' }
                ]
            },
            components: [
                { type: 'text', sectionId: '1', content: 'Production Ready', coords: { x: 0, y: 20, w: 600, h: 40 }, styles: { fontSize: '24px', fontWeight: '700', textAlign: 'center' } },
                { type: 'text', sectionId: '2', content: 'This template was generated by the production engine.', coords: { x: 0, y: 100, w: 600, h: 40 }, styles: { fontSize: '16px', textAlign: 'left' } }
            ]
        };
        return this.generateEmailHtml(testAnalysis, options);
    }
}

export default new EmailGeneratorService();
