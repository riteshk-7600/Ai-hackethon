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
            const isDataRow = row.length === 2 && (row[0].content.includes(':') || row[0].styles?.fontWeight === '700');

            // Determine if this is the start of a new grid block
            const isFirstRowOfGrid = isDataRow && !inDataGrid;
            inDataGrid = isDataRow;

            if (row.length === 1) {
                const comp = row[0];
                if (comp.type === 'image') {
                    return EmailTableBuilder.createImage(comp.content, comp.altText || '', {
                        width: comp.coords.w || '200',
                        align: comp.styles?.textAlign || 'center'
                    });
                }
                const align = comp.styles?.textAlign || (section.type === 'footer' ? 'center' : 'left');
                const padding = section.type === 'footer' ? '10px 40px' : '15px 40px';
                return `<table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="${align}" style="padding: ${padding};">
                            ${this.renderComponent(comp)}
                        </td>
                    </tr>
                </table>`;
            } else if (isDataRow) {
                // FORM DATA ROW
                return `<table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="padding: 0 40px;">
                            ${EmailTableBuilder.createDataRow(row[0].content, row[1].content, {
                    labelBg: row[0].styles?.backgroundColor || '#f9f9f9',
                    labelWidth: row[0].coords.w || '180',
                    isFirstRow: isFirstRowOfGrid
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
            'padding': section.id === 'f' ? '40px 0' : '20px 0'
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
        if (comp.type === 'text') {
            if (parseInt(styles['font-size']) >= 20 || styles['font-weight'] === 'bold' || styles['font-weight'] >= 700) {
                return EmailTableBuilder.createHeading(comp.content, 2, styles);
            }
            return EmailTableBuilder.createText(comp.content, styles);
        }
        return `<!-- ${comp.type} component -->`;
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
