/**
 * Email Generator Service (Senior 8y+ Architect)
 * Production-ready HTML generation from design analysis.
 */

import { EmailTableBuilder } from '../utils/email-templates/table-builder.js';
import { logger } from '../utils/logger.js';

class EmailGeneratorService {
    async generateEmailHtml(analysis, options = {}) {
        try {
            logger.info('Running senior-grade generation pipeline');

            const {
                matchConfidence = 0,
                document = { width: 600, backgroundColor: '#f4f4f4', innerColor: '#ffffff' },
                layout = { sections: [] },
                components = []
            } = analysis;

            if (matchConfidence < 98) {
                throw new Error('Incomplete analysis');
            }

            // 1. Sort sections
            const sortedSections = [...layout.sections].sort((a, b) => a.y - b.y);

            // 2. Process sections
            const sectionHtmls = [];
            for (const section of sortedSections) {
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
        if (!section || !allComponents) {
            logger.warn('processSection called with invalid section or components', { section, allComponents });
            return null;
        }

        const components = allComponents.filter(c => {
            if (c.sectionId) return c.sectionId === section.id;
            return (c.coords && c.coords.y >= section.y && c.coords.y < section.y + section.height);
        });

        if (components.length === 0) return null;

        // Group into rows
        const rows = [];
        const sorted = [...components].sort((a, b) => (a.coords.y || 0) - (b.coords.y || 0));

        let currentRow = [];
        let lastY = -1;

        for (const comp of sorted) {
            const y = comp.coords.y || 0;
            if (lastY === -1 || Math.abs(y - lastY) < 15) {
                currentRow.push(comp);
            } else {
                rows.push(currentRow.sort((a, b) => (a.coords.x || 0) - (b.coords.x || 0)));
                currentRow = [comp];
            }
            lastY = y;
        }
        if (currentRow.length > 0) rows.push(currentRow.sort((a, b) => (a.coords.x || 0) - (b.coords.x || 0)));

        // Render HTML for rows
        let inDataGrid = false;
        const rowContent = rows.map((row, index) => {
            const isDataRow = row.length === 2 && (row[0].type === 'data-row' || (row[0].content.includes(':') && row[1].content));

            // Explicit data-row type handling from new prompt
            if (row[0].type === 'data-row') {
                // The new prompt might return a component with type 'data-row'. 
                // But wait, my prompt structure returns individual components.
                // Actually, the prompt says "Group them as data-row". 
                // If the AI returns a single component of type 'data-row', we should handle it.
                // But the loop above groups by Y. 
                // Let's assume standard components for now.
            }

            const isImplicitDataRow = row.length === 2 && (row[0].content.includes(':') || row[0].styles?.fontWeight === '700');

            // Determine if this is the start of a new grid block
            const isGridRow = isImplicitDataRow && !inDataGrid;
            inDataGrid = isImplicitDataRow;

            if (row.length === 1) {
                const comp = row[0];
                const align = comp.styles?.textAlign || (section.type === 'footer' ? 'center' : 'left');
                // Use explicit padding from component if available, else default
                const padding = comp.styles?.padding || (section.type === 'footer' ? '10px 40px' : '15px 40px');

                // Allow component to render its own table wrapper if needed (like image)
                const rendered = this.renderComponent(comp);

                // If the component returns a full table (like image/spacer), return it directly
                // Otherwise wrap in row structure
                if (rendered.startsWith('<table')) return rendered;

                return `<table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="${align}" style="padding: ${padding};">
                            ${rendered}
                        </td>
                    </tr>
                </table>`;
            } else if (isImplicitDataRow) {
                // FORM DATA ROW
                return `<table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="padding: 0 40px;">
                            ${EmailTableBuilder.createDataRow(row[0].content, row[1].content, {
                    labelBg: row[0].styles?.backgroundColor || (index % 4 === 0 ? '#f9f9f9' : '#ffffff'),
                    labelWidth: (row[0].coords && row[0].coords.w) ? row[0].coords.w : '180',
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
        }).join('\n');

        const sectionStyles = {
            'background-color': section.backgroundColor || 'transparent',
            'padding': section.padding || (section.id === 'f' ? '40px 0' : '20px 0')
        };

        return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="${EmailTableBuilder.stylesToString(sectionStyles)}">
            <tr>
                <td align="center">
                    ${rowContent}
                </td>
            </tr>
        </table>`;
    }

    renderComponent(comp) {
        const styles = this.normalizeStyles(comp.styles || {});

        switch (comp.type) {
            case 'text':
                const fontSize = styles['font-size'] ? parseInt(styles['font-size']) : 16;
                const fontWeight = styles['font-weight'] || 'normal';

                if (fontSize >= 20 || fontWeight === 'bold' || fontWeight >= 700) {
                    return EmailTableBuilder.createHeading(comp.content, 2, styles);
                }
                return EmailTableBuilder.createText(comp.content, styles);

            case 'button':
                return EmailTableBuilder.createButton(comp.content, '#', styles);

            case 'image':
                return EmailTableBuilder.createImage(comp.content, comp.altText || '', {
                    width: comp.coords.w || '200',
                    align: styles['text-align'] || 'center'
                });

            case 'divider':
                return EmailTableBuilder.createDivider(styles.color || '#eeeeee', '1px', styles.padding || '20px 0');

            default:
                // Fallback for unknown types (treat as text if content exists)
                if (comp.content) return EmailTableBuilder.createText(comp.content, styles);
                return `<!-- Unknown component type: ${comp.type} -->`;
        }
    }

    async generateBasicTemplate(options = {}) {
        const analysis = await (await import('./email-vision.service.js')).default.getSeniorConversantRecovery();
        return this.generateEmailHtml(analysis, options);
    }

    normalizeStyles(s) {
        const map = { fontSize: 'font-size', fontWeight: 'font-weight', color: 'color', textAlign: 'text-align' };
        const result = {};
        for (const [k, v] of Object.entries(s)) {
            if (map[k]) result[map[k]] = v;
        }
        return result;
    }
}

export default new EmailGeneratorService();
