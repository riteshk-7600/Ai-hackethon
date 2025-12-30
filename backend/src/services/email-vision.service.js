/**
 * AI Vision Analysis Service
 * Analyzes uploaded email design images using AI vision
 */

import aiService from './ai.service.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

class EmailVisionService {
    /**
     * Analyze email design image using AI vision
     */
    async analyzeDesign(imagePath) {
        try {
            logger.info('Analyzing email design image', { imagePath });

            // Read image file
            const imageBuffer = await fs.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');

            // Create AI vision prompt
            const prompt = this.buildVisionPrompt();

            // Call AI vision API
            const analysis = await aiService.analyzeImageWithVision(base64Image, prompt);

            logger.info('Email design analysis complete');

            return this.parseAnalysisResponse(analysis);
        } catch (error) {
            logger.error('Error analyzing email design', { error: error.message });
            throw new Error(`Failed to analyze email design: ${error.message}`);
        }
    }

    /**
     * Build comprehensive vision analysis prompt
     */
    buildVisionPrompt() {
        return `You are a Senior Email Developer and Vision AI specialist.
Analyze this email design screenshot with PIXEL-LEVEL PRECISION for conversion into a production-grade <table>-based HTML template.

ABSOLUTE REQUIREMENTS for your JSON response:
1.  MATCH CONFIDENCE: You must provide a "matchConfidence" score (0-100). If you are not >= 98% confident in the layout recovery, specify EXACTLY why in "confidenceGaps".
2.  GRID COORDINATES: Every component MUST have precise {x, y, width, height} in pixels based on a 600px desktop width reference.
3.  TYPOGRAPHY: Detect exact font-family (stack), font-size (px), line-height (px), font-weight (numeric), and letter-spacing.
4.  SPACING: Detect exact padding and margin for every container and component. Do NOT guess. Use "0px" if none.
5.  COLORS: Detect exact HEX codes for backgrounds, text, borders, and button states.
6.  BUTTONS: Detect border-radius, border-width, and precise padding.
7.  ASSETS: Identify if an element is a "logo", "hero-image", "icon", or "decorative-graphic".

JSON STRUCTURE:
{
  "matchConfidence": 98,
  "confidenceGaps": [],
  "document": {
    "backgroundColor": "#HEX",
    "width": 600,
    "totalHeight": number
  },
  "layout": {
    "sections": [
      {
        "id": "string",
        "type": "header|hero|body|cta|footer|sidebar",
        "y": number,
        "height": number,
        "backgroundColor": "#HEX",
        "padding": { "top": "px", "right": "px", "bottom": "px", "left": "px" }
      }
    ]
  },
  "components": [
    {
      "type": "text|image|button|divider|spacer",
      "sectionId": "string",
      "coords": { "x": number, "y": number, "w": number, "h": number },
      "styles": {
        "color": "#HEX",
        "backgroundColor": "#HEX",
        "fontSize": "px",
        "fontWeight": "400|700",
        "lineHeight": "px",
        "fontFamily": "string",
        "textAlign": "left|center|right|justify",
        "padding": "px",
        "borderRadius": "px",
        "border": "string"
      },
      "content": "Full text content for labels/paragraphs",
      "altText": "Descriptive alt for images"
    }
  ]
}

STRICT RULE: No dummy text. No placeholders. If you see a logo, describe it as [LOGO]. If you see a hero image, describe it as [HERO].
Your output will directly feed a <table> builder engine. Accuracy is life-or-death for this implementation.`;
    }

    /**
     * Parse AI vision response
     */
    parseAnalysisResponse(response) {
        try {
            // Extract JSON from response
            let jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }

            const analysis = JSON.parse(jsonMatch[0]);

            // Validate required fields
            this.validateAnalysis(analysis);

            return analysis;
        } catch (error) {
            logger.error('Error parsing vision analysis', { error: error.message });

            // Return default structure if parsing fails
            return this.getDefaultAnalysis();
        }
    }

    /**
     * Validate analysis structure
     */
    validateAnalysis(analysis) {
        const required = ['layout', 'components', 'colors', 'typography'];
        for (const field of required) {
            if (!analysis[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
    }

    /**
     * Get default analysis structure (fallback)
     */
    getDefaultAnalysis() {
        return {
            layout: {
                type: 'single-column',
                sections: [
                    { type: 'header', position: 'top', height: 80 },
                    { type: 'hero', position: 'middle', height: 300 },
                    { type: 'content', position: 'middle', height: 400 },
                    { type: 'footer', position: 'bottom', height: 100 }
                ]
            },
            components: [],
            colors: {
                primary: '#007bff',
                secondary: '#6c757d',
                background: '#ffffff',
                text: '#333333',
                accent: '#28a745'
            },
            typography: {
                headingFont: 'Arial, Helvetica, sans-serif',
                headingSize: '32px',
                bodyFont: 'Arial, Helvetica, sans-serif',
                bodySize: '16px',
                lineHeight: '1.5'
            },
            spacing: {
                padding: '20px',
                margin: '10px',
                gaps: '15px'
            },
            buttons: [],
            images: [],
            style: 'professional',
            responsive: {
                mobileLayout: 'stack',
                priorities: ['header', 'hero', 'cta', 'content', 'footer']
            }
        };
    }

    /**
     * Extract text from design (if AI supports OCR)
     */
    async extractText(imagePath) {
        try {
            const imageBuffer = await fs.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');

            const prompt = 'Extract all visible text from this email design. Return as JSON array: [{"text": "...", "type": "heading|body|button|label"}]';

            const response = await aiService.analyzeImageWithVision(base64Image, prompt);

            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return [];
        } catch (error) {
            logger.warn('Could not extract text from design', { error: error.message });
            return [];
        }
    }

    /**
     * Suggest improvements to design for email compatibility
     */
    async suggestImprovements(analysis) {
        const suggestions = [];

        // Check font compatibility
        const emailSafeFonts = [
            'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
            'Courier', 'Verdana', 'Tahoma'
        ];

        if (!emailSafeFonts.some(font => analysis.typography.headingFont.includes(font))) {
            suggestions.push({
                type: 'warning',
                message: `Font "${analysis.typography.headingFont}" may not render consistently. Consider using Arial or Helvetica.`
            });
        }

        // Check image dimensions
        for (const img of analysis.images || []) {
            if (img.dimensions.width > 600) {
                suggestions.push({
                    type: 'warning',
                    message: `Image width ${img.dimensions.width}px exceeds recommended 600px for email clients.`
                });
            }
        }

        // Check color contrast (basic check)
        if (analysis.colors.text && analysis.colors.background) {
            const contrast = this.estimateContrast(analysis.colors.text, analysis.colors.background);
            if (contrast < 4.5) {
                suggestions.push({
                    type: 'error',
                    message: `Low color contrast (${contrast.toFixed(1)}:1). WCAG requires 4.5:1 for normal text.`
                });
            }
        }

        return suggestions;
    }

    /**
     * Estimate color contrast ratio (simplified)
     */
    estimateContrast(color1, color2) {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Calculate relative luminance
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
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }
}

export default new EmailVisionService();
