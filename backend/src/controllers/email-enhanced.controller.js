/**
 * Enhanced Email Controller with Visual Editor Support
 * Provides smart structure detection, image slot management, and interactive editing
 */

import emailVisionService from '../services/email-vision.service.js';
import emailGeneratorService from '../services/email-generator.service.js';
import emailValidatorService from '../services/email-validator.service.js';
import emailAccessibilityService from '../services/email-accessibility.service.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

class EmailEnhancedController {
    constructor() {
        this.generateEnhanced = this.generateEnhanced.bind(this);
    }

    /**
     * Generate email with enhanced features:
     * - Image slots with data attributes
     * - Pattern detection (sliders, galleries)
     * - Asset mapping
     */
    async generateEnhanced(req, res) {
        try {
            const { analysis, options = {} } = req.body;

            if (!analysis) {
                return res.status(400).json({ error: 'Analysis required' });
            }

            // Detect repeating patterns for sliders/galleries
            const patterns = this.detectPatterns(analysis);

            // Generate HTML with image slots
            const htmlWithSlots = await this.generateWithImageSlots(analysis, options, patterns);

            // Run validation and accessibility checks
            const validation = await emailValidatorService.validateEmail(htmlWithSlots);
            const accessibility = await emailAccessibilityService.auditAccessibility(htmlWithSlots);

            // Calculate quality metrics
            const metrics = {
                qualityScore: this.calculateQualityScore(validation, accessibility),
                validation,
                accessibility,
                compatibility: this.calculateCompatibilityMatrix(validation, accessibility),
                spamRisk: validation.spamRisk || { score: 0 },
                patterns: patterns // Return detected patterns
            };

            res.json({
                html: htmlWithSlots,
                metrics,
                imageSlots: this.extractImageSlots(analysis),
                patterns
            });

        } catch (error) {
            logger.error('Enhanced generation failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Detect repeating patterns like sliders, galleries, product grids
     */
    detectPatterns(analysis) {
        const patterns = {
            sliders: [],
            galleries: [],
            productGrids: [],
            columns: []
        };

        const components = analysis.components || [];

        // Group components by vertical position
        const rows = this.groupByRows(components);

        // Detect horizontal patterns in each row
        rows.forEach((row, rowIndex) => {
            const images = row.filter(c => c.type === 'image');
            const buttons = row.filter(c => c.type === 'button');

            // Slider detection: multiple images in same row with similar dimensions
            if (images.length >= 2) {
                const isSimilarSize = this.checkSimilarSizes(images);
                const isEquallySpaced = this.checkEqualSpacing(images);

                if (isSimilarSize && isEquallySpaced) {
                    patterns.sliders.push({
                        type: 'slider',
                        rowIndex,
                        items: images.length,
                        components: images,
                        autoDetected: true
                    });
                }
            }

            // Gallery detection: 3+ images in grid layout
            if (images.length >= 3) {
                const isGridLayout = this.checkGridLayout(images);
                if (isGridLayout) {
                    patterns.galleries.push({
                        type: 'gallery',
                        rowIndex,
                        items: images.length,
                        columns: this.detectColumnCount(images),
                        components: images
                    });
                }
            }

            // Column detection: multiple sections side by side
            const columns = this.detectColumns(row);
            if (columns.length > 1) {
                patterns.columns.push({
                    type: 'columns',
                    rowIndex,
                    columnCount: columns.length,
                    columns
                });
            }
        });

        return patterns;
    }

    /**
     * Group components into rows based on Y position
     */
    groupByRows(components, tolerance = 20) {
        const rows = [];
        const sorted = [...components].sort((a, b) => (a.coords?.y || 0) - (b.coords?.y || 0));

        sorted.forEach(comp => {
            const y = comp.coords?.y || 0;
            const existingRow = rows.find(row => {
                const rowY = row[0].coords?.y || 0;
                return Math.abs(y - rowY) < tolerance;
            });

            if (existingRow) {
                existingRow.push(comp);
            } else {
                rows.push([comp]);
            }
        });

        return rows;
    }

    /**
     * Check if images have similar dimensions
     */
    checkSimilarSizes(images, tolerance = 0.15) {
        if (images.length < 2) return false;

        const widths = images.map(img => img.coords?.w || 0);
        const heights = images.map(img => img.coords?.h || 0);

        const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;

        return widths.every(w => Math.abs(w - avgWidth) / avgWidth < tolerance) &&
            heights.every(h => Math.abs(h - avgHeight) / avgHeight < tolerance);
    }

    /**
     * Check if images are equally spaced
     */
    checkEqualSpacing(images, tolerance = 0.2) {
        if (images.length < 2) return false;

        const sorted = images.sort((a, b) => (a.coords?.x || 0) - (b.coords?.x || 0));
        const gaps = [];

        for (let i = 1; i < sorted.length; i++) {
            const gap = (sorted[i].coords?.x || 0) - ((sorted[i - 1].coords?.x || 0) + (sorted[i - 1].coords?.w || 0));
            gaps.push(gap);
        }

        if (gaps.length === 0) return false;

        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        return gaps.every(gap => Math.abs(gap - avgGap) / (avgGap || 1) < tolerance);
    }

    /**
     * Check if images form a grid layout
     */
    checkGridLayout(images) {
        const rows = this.groupByRows(images);
        return rows.length >= 2 && rows.every(row => row.length === rows[0].length);
    }

    /**
     * Detect number of columns in a grid
     */
    detectColumnCount(images) {
        const xPositions = [...new Set(images.map(img => Math.round((img.coords?.x || 0) / 10) * 10))];
        return xPositions.length;
    }

    /**
     * Detect column structure in a row
     */
    detectColumns(row) {
        const sorted = row.sort((a, b) => (a.coords?.x || 0) - (b.coords?.x || 0));
        const columns = [];

        sorted.forEach(comp => {
            const x = comp.coords?.x || 0;
            const existing = columns.find(col => {
                const colX = col[0].coords?.x || 0;
                return Math.abs(x - colX) < 30;
            });

            if (existing) {
                existing.push(comp);
            } else {
                columns.push([comp]);
            }
        });

        return columns;
    }

    /**
     * Generate HTML with editable image slots
     */
    async generateWithImageSlots(analysis, options, patterns) {
        // First generate standard HTML
        let html = await emailGeneratorService.generateEmailHtml(analysis, options);

        // Add data attributes to images for slot identification
        const imageComponents = analysis.components?.filter(c => c.type === 'image') || [];

        imageComponents.forEach((img, index) => {
            const slotId = `slot-${index}`;
            const placeholder = img.content || 'https://via.placeholder.com/600x400/f0f0f0/666666?text=Image+Slot';

            // Find the image in HTML and add data-slot-id
            const imgRegex = new RegExp(`<img([^>]*)src="${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*)>`, 'g');
            html = html.replace(imgRegex, `<img$1src="${placeholder}"$2 data-slot-id="${slotId}" data-editable="true">`);
        });

        // Add slider structure if detected
        if (patterns.sliders.length > 0) {
            patterns.sliders.forEach(slider => {
                // Wrap slider items with container
                html = this.wrapSliderStructure(html, slider);
            });
        }

        return html;
    }

    /**
     * Wrap slider items in proper email-safe slider structure
     */
    wrapSliderStructure(html, slider) {
        // For email, sliders need to be horizontal scrollable tables
        // This is a simplified version - real implementation would be more complex
        return html; // TODO: Implement actual slider wrapping
    }

    /**
     * Extract image slot information
     */
    extractImageSlots(analysis) {
        const imageComponents = analysis.components?.filter(c => c.type === 'image') || [];

        return imageComponents.map((img, index) => ({
            slotId: `slot-${index}`,
            name: img.altText || `Image ${index + 1}`,
            type: this.detectImageType(img),
            dimensions: img.coords || { w: 600, h: 400 },
            placeholder: img.content || 'https://via.placeholder.com/600x400'
        }));
    }

    /**
     * Detect image type (logo, hero, content, etc.)
     */
    detectImageType(img) {
        const height = img.coords?.h || 0;
        const width = img.coords?.w || 0;
        const y = img.coords?.y || 0;

        // Logo detection: small, at top
        if (height < 80 && y < 100) return 'logo';

        // Hero detection: large, near top
        if (height > 200 && width > 400 && y < 300) return 'hero';

        // Icon detection: small square
        if (height < 100 && width < 100 && Math.abs(height - width) < 20) return 'icon';

        return 'content';
    }

    /**
     * Calculate overall quality score
     */
    calculateQualityScore(validation, accessibility) {
        const valScore = Math.max(0, 100 - (validation.issues?.length || 0) * 5);
        const a11yScore = accessibility.score || 100;
        return Math.round((valScore + a11yScore) / 2);
    }

    /**
     * Calculate compatibility matrix
     */
    calculateCompatibilityMatrix(validation, accessibility) {
        const hasTableLayout = !validation.issues?.some(i => i.message?.includes('flexbox') || i.message?.includes('grid'));
        const hasInlineCSS = !validation.issues?.some(i => i.message?.includes('external CSS'));
        const hasGoodContrast = accessibility.score >= 80;

        return {
            'Gmail': hasTableLayout && hasInlineCSS,
            'Outlook': hasTableLayout && hasInlineCSS,
            'Yahoo': hasTableLayout,
            'Apple_Mail': true,
            'Mobile': hasGoodContrast
        };
    }
}

export default new EmailEnhancedController();
