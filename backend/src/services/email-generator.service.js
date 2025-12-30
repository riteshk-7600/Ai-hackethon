/**
 * Email Generator Service (Senior Production Logic)
 * Converts email design analysis into production-ready HTML with <table>-based layouts.
 * Optimized for Polish, Precision, and Responsiveness.
 */

import { EmailTableBuilder } from '../utils/email-templates/table-builder.js';
import { logger } from '../utils/logger.js';

class EmailGeneratorService {
    /**
     * Generate complete email HTML from design analysis
     */
    async generateEmailHtml(analysis, options = {}) {
        try {
            logger.info('Starting senior-grade email generation engine');

            const {
                matchConfidence = 0,
                document = { width: 600, backgroundColor: '#f4f4f4', innerColor: '#ffffff' },
                layout = { sections: [] },
                components = []
            } = analysis;

            // Strict confidence check for production sanity
            if (matchConfidence < 98) {
                logger.error('Match confidence below 98%. Blocking generation.', { matchConfidence });
                throw new Error(`Incomplete Layout Detection (${matchConfidence}%). Insufficient visual data for production-grade HTML.`);
            }

            const outerBg = document.backgroundColor || '#f4f4f4';
            const innerBg = document.innerColor || '#ffffff';

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
            const html = EmailTableBuilder.buildEmail(sectionHtmls, {
                title: analysis.title || 'Email Campaign',
                outerBg: outerBg,
                innerBg: innerBg
            });

            logger.info('Email generation successful with 8y+ experience standards');
            return html;
        } catch (error) {
            logger.error('Generator engine failure', { error: error.message });
            throw error;
        }
    }

    /**
     * Process a section: handles grouping components into logical rows and columns
     */
    processSection(section, allComponents, analysis) {
        const sectionComponents = allComponents.filter(c => {
            if (c.sectionId) return c.sectionId === section.id;
            return (c.coords && c.coords.y >= section.y && c.coords.y < section.y + section.height);
        });

        if (sectionComponents.length === 0) return null;

        // Grouping logic for Rows
        const rows = [];
        const sorted = [...sectionComponents].sort((a, b) => (a.coords.y || 0) - (b.coords.y || 0));

        let currentRow = [];
        let lastY = -1;

        for (const comp of sorted) {
            const compY = comp.coords.y || 0;
            if (lastY === -1 || Math.abs(compY - lastY) < 15) {
                currentRow.push(comp);
            } else {
                rows.push(currentRow.sort((a, b) => (a.coords.x || 0) - (b.coords.x || 0)));
                currentRow = [comp];
            }
            lastY = compY;
        }
        if (currentRow.length > 0) {
            rows.push(currentRow.sort((a, b) => (a.coords.x || 0) - (b.coords.x || 0)));
        }

        // Render rows with polish
        const rowHtmls = rows.map(row => {
            if (row.length === 1) {
                // Full width or centered
                const comp = row[0];
                const align = comp.styles?.textAlign || 'center';

                // Special handling for Images (Logos)
                if (comp.type === 'image') {
                    return EmailTableBuilder.createRow(
                        EmailTableBuilder.createImage(comp.content, comp.altText || '', {
                            width: comp.coords.w,
                            height: comp.coords.h,
                            align: align
                        }),
                        {},
                        { padding: '20px 40px', textAlign: align }
                    );
                }

                return EmailTableBuilder.createRow(
                    this.renderComponent(comp),
                    {},
                    { padding: '10px 40px', textAlign: align }
                );
            } else if (row.length === 2) {
                // Data Grid Detection (Form pairs)
                return EmailTableBuilder.createDataRow(row[0].content, row[1].content, {
                    labelBg: row[0].styles?.backgroundColor || '#f9f9f9',
                    borderColor: '#eeeeee',
                    labelWidth: row[0].coords.w || '180',
                    padding: '12px 20px'
                });
            } else {
                // Responsive Columns
                const columnContents = row.map(comp => this.renderComponent(comp));
                return EmailTableBuilder.createColumns(columnContents, { padding: '10px 40px' });
            }
        });

        // Wrap the entire section
        const sectionStyles = {
            'background-color': section.backgroundColor || 'transparent',
            'padding': this.formatPadding(section.padding) || '0'
        };

        return EmailTableBuilder.wrapInTable(rowHtmls.join('\n'), sectionStyles, { align: 'center' });
    }

    /**
     * Render individual component
     */
    renderComponent(comp) {
        const { type, content, altText, coords = {}, styles = {} } = comp;
        const normalizedStyles = this.normalizeStyles(styles);

        switch (type) {
            case 'text':
                if (parseInt(styles.fontSize) >= 20 || styles.fontWeight === '700' || styles.fontWeight === '800') {
                    return EmailTableBuilder.createHeading(content, 2, normalizedStyles);
                }
                return EmailTableBuilder.createText(content, normalizedStyles);

            case 'image':
                return EmailTableBuilder.createImage(content, altText || 'Graphic', {
                    width: coords.w,
                    height: coords.h,
                    align: styles.textAlign || 'center'
                });

            case 'spacer':
                return EmailTableBuilder.createSpacer(coords.h || 20);

            case 'divider':
                return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="border-top: 1px solid #eeeeee; padding: 10px 0;">&nbsp;</td>
                    </tr>
                </table>`;

            default:
                return `<!-- Unsupported: ${type} -->`;
        }
    }

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
            padding: 'padding'
        };

        const result = {};
        for (const [key, val] of Object.entries(aiStyles)) {
            if (cssMap[key]) result[cssMap[key]] = val;
        }
        return result;
    }

    formatPadding(p) {
        if (!p) return null;
        if (typeof p === 'string') return p;
        return `${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`;
    }
}

export default new EmailGeneratorService();
