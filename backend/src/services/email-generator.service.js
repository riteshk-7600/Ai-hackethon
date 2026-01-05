/**
 * Email Generator Service - SENIOR EMAIL ENGINEERING (10y+ Standards)
 * 
 * CRITICAL RULES:
 * - Pixel-perfect reconstruction from AI analysis
 * - Table-based layout ONLY (no flexbox, no grid, no absolute positioning)
 * - Inline CSS exclusively (email-safe)
 * - Outlook, Gmail, Yahoo, Apple Mail compatible
 * - Dark mode safe
 * - WCAG AA accessibility compliant
 * - NO redesign, NO reinterpretation, NO simplification
 * 
 * This service converts AI vision analysis into production-ready email HTML
 * that EXACTLY matches the original design image.
 */

import { EmailTableBuilder } from '../utils/email-templates/table-builder.js';
import { logger } from '../utils/logger.js';

class EmailGeneratorService {
    async generateEmailHtml(analysis, options = {}) {
        try {
            logger.info('Running senior-grade generation pipeline', {
                hasAnalysis: !!analysis,
                confidence: analysis?.matchConfidence
            });

            if (!analysis) throw new Error('No analysis data provided');

            const {
                matchConfidence = 0,
                document = { width: 600, backgroundColor: '#f4f4f4', innerColor: '#ffffff' },
                layout: rawLayout = { sections: [] },
                components = []
            } = analysis;

            const layout = rawLayout || { sections: [] };

            if (matchConfidence < 98) {
                throw new Error('Incomplete analysis');
            }

            // 1. Sort sections (with safety checks for undefined sections)
            logger.info('Sorting sections', { count: layout.sections?.length });
            const sortedSections = (layout.sections || [])
                .filter(s => s && typeof s.y !== 'undefined')
                .sort((a, b) => (a.y || 0) - (b.y || 0));

            // 2. Process sections
            const sectionHtmls = [];
            for (const section of sortedSections) {
                logger.info(`Processing section: ${section.id || 'unnamed'}`, { y: section.y });
                const sectionHtml = this.processSection(section, components);
                if (sectionHtml) sectionHtmls.push(sectionHtml);
            }

            // 3. Finish Email
            return EmailTableBuilder.buildEmail(sectionHtmls, {
                title: analysis.title || 'Email Notification',
                outerBg: document.backgroundColor || '#f4f4f4',
                innerBg: document.innerColor || '#ffffff'
            });
        } catch (error) {
            logger.error('Generator failure', { error: error.message });
            throw error;
        }
    }

    processSection(section, allComponents) {
        try {
            if (!section || !allComponents) {
                logger.warn('processSection called with invalid section or components', { section, allComponents });
                return null;
            }

            logger.info(`Filtering components for section: ${section.id}`, { allCount: allComponents.length });

            const components = allComponents.filter(c => {
                if (!c) return false;
                if (c.sectionId) return String(c.sectionId) === String(section.id);

                // Coordinate-based fallback
                if (!c.coords || typeof c.coords.y === 'undefined') return false;

                const y = parseFloat(c.coords.y);
                const sy = parseFloat(section.y || 0);
                const sh = parseFloat(section.height || 0);

                return (y >= sy && y < sy + sh);
            });

            logger.info(`Components in section ${section.id || 'unnamed'}: ${components.length}`);

            if (components.length === 0) return null;

            // Group into rows
            const rows = [];
            const sorted = (components || [])
                .filter(c => c && c.coords && typeof c.coords.y !== 'undefined')
                .sort((a, b) => (parseFloat(a.coords.y) || 0) - (parseFloat(b.coords.y) || 0));

            let currentRow = [];
            let lastY = -1;

            for (const comp of sorted) {
                const y = parseFloat(comp.coords.y) || 0;
                if (lastY === -1 || Math.abs(y - lastY) < 15) {
                    currentRow.push(comp);
                } else {
                    rows.push(currentRow.sort((a, b) => (parseFloat(a.coords?.x) || 0) - (parseFloat(b.coords?.x) || 0)));
                    currentRow = [comp];
                }
                lastY = y;
            }
            if (currentRow.length > 0) {
                rows.push(currentRow.sort((a, b) => (parseFloat(a.coords?.x) || 0) - (parseFloat(b.coords?.x) || 0)));
            }

            // Render HTML for rows
            let inDataGrid = false;
            const rowContent = rows.map((row, index) => {
                if (!row || row.length === 0) return '';

                const mainComp = row[0] || {};
                const content0 = String(mainComp.content || '');
                const content1 = row[1] ? String(row[1].content || '') : '';

                const isImplicitDataRow = row.length === 2 && (content0.includes(':') || mainComp.styles?.fontWeight === '700');
                const isExplicitDataRow = mainComp.type === 'data-row';

                // Determine if this is the start of a new grid block
                const isGridRow = (isImplicitDataRow || isExplicitDataRow) && !inDataGrid;
                inDataGrid = (isImplicitDataRow || isExplicitDataRow);

                if (row.length === 1) {
                    const comp = row[0];
                    const align = comp.styles?.textAlign || (section.type === 'footer' ? 'center' : 'left');
                    const padding = comp.styles?.padding || (section.type === 'footer' ? '10px 40px' : '15px 40px');

                    const rendered = this.renderComponent(comp);
                    if (rendered.startsWith('<table')) return rendered;

                    return `<table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td align="${align}" style="padding: ${padding};">
                                ${rendered}
                            </td>
                        </tr>
                    </table>`;
                } else if (isImplicitDataRow || isExplicitDataRow) {
                    // FORM DATA ROW
                    return `<table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding: 0 40px;">
                                ${EmailTableBuilder.createDataRow(content0, content1, {
                        labelBg: mainComp.styles?.backgroundColor || (index % 4 === 0 ? '#f9f9f9' : '#ffffff'),
                        labelWidth: (mainComp.coords && mainComp.coords.w) ? mainComp.coords.w : '180',
                        isFirstRow: isGridRow
                    })}
                            </td>
                        </tr>
                    </table>`;
                } else {
                    // Multi-column
                    const cols = row.map(c => this.renderComponent(c));
                    return EmailTableBuilder.createColumns(cols, { padding: '10px 40px' });
                }
            }).filter(h => !!h).join('\n');

            const sectionStyles = {
                'background-color': section.backgroundColor || 'transparent',
                'padding': section.padding || (section.id === 'footer' ? '40px 0' : '20px 0')
            };

            return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="${EmailTableBuilder.stylesToString(sectionStyles)}">
                <tr>
                    <td align="center">
                        ${rowContent}
                    </td>
                </tr>
            </table>`;
        } catch (err) {
            logger.error(`Error in processSection for section ${section?.id}`, { error: err.message });
            return `<!-- Error processing section ${section?.id}: ${err.message} -->`;
        }
    }

    renderComponent(comp) {
        if (!comp) return '';
        const styles = this.normalizeStyles(comp.styles || {});

        try {
            switch (comp.type) {
                case 'text':
                    const fontSize = styles['font-size'] ? parseInt(String(styles['font-size'])) : 16;
                    const fontWeight = styles['font-weight'] || 'normal';

                    if (fontSize >= 20 || fontWeight === 'bold' || fontWeight === '700' || parseInt(String(fontWeight)) >= 700) {
                        return EmailTableBuilder.createHeading(comp.content || '', 2, styles);
                    }
                    return EmailTableBuilder.createText(comp.content || '', styles);

                case 'button':
                    return EmailTableBuilder.createButton(comp.content || 'Click Here', '#', styles);

                case 'image':
                    return EmailTableBuilder.createImage(comp.content || '', comp.altText || '', {
                        width: (comp.coords && comp.coords.w) ? comp.coords.w : '200',
                        align: styles['text-align'] || 'center'
                    });

                case 'divider':
                    return EmailTableBuilder.createDivider(styles['color'] || '#eeeeee', '1px', styles['padding'] || '20px 0');

                case 'data-row':
                    // Handled upstream but here as fallback
                    return EmailTableBuilder.createText(comp.content || '', styles);

                default:
                    if (comp.content) return EmailTableBuilder.createText(comp.content, styles);
                    return `<!-- Unknown component type: ${comp.type} -->`;
            }
        } catch (err) {
            return `<!-- Error rendering component ${comp.type}: ${err.message} -->`;
        }
    }

    async generateBasicTemplate(options = {}) {
        const visionService = (await import('./email-vision.service.js')).default;
        const analysis = visionService.getSeniorConversantRecovery();
        return this.generateEmailHtml(analysis, options);
    }

    normalizeStyles(s) {
        if (!s || typeof s !== 'object') return {};
        const map = { fontSize: 'font-size', fontWeight: 'font-weight', color: 'color', textAlign: 'text-align' };
        const result = {};
        try {
            for (const [k, v] of Object.entries(s)) {
                if (map[k]) result[map[k]] = v;
                else result[k] = v; // Pass through others like padding/border
            }
        } catch (e) {
            logger.warn('Error normalizing styles', { error: e.message });
        }
        return result;
    }
}

export default new EmailGeneratorService();
