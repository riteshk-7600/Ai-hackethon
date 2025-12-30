/**
 * Email Vision Service (Production Recovery)
 * High-fidelity layout detection and coordinate mapping.
 */

import aiService from './ai.service.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

class EmailVisionService {
    /**
     * Primary entry point for design recovery
     */
    async analyzeDesign(imagePath) {
        try {
            logger.info('Performing high-fidelity vision analysis', { imagePath });

            const imageBuffer = await fs.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');

            const prompt = this.buildVisionPrompt();
            const response = await aiService.analyzeImageWithVision(base64Image, prompt);

            return this.parseAnalysisResponse(response);
        } catch (error) {
            logger.error('Vision analysis failed critical path', { error: error.message });
            throw new Error(`Vision Engine Failure: ${error.message}`);
        }
    }

    buildVisionPrompt() {
        return `You are a Senior Email Developer and Vision AI specialist.
Analyze this email design screenshot with PIXEL-LEVEL PRECISION for conversion into a production-grade <table>-based HTML template.

ABSOLUTE REQUIREMENTS for your JSON response:
1.  MATCH CONFIDENCE: You must provide a "matchConfidence" score (0-100). If you are not >= 98% confident in the layout recovery, specify EXACTLY why in "confidenceGaps".
2.  GRID COORDINATES: Every component MUST have precise {x, y, w, h} in pixels based on a 600px desktop width reference.
3.  TYPOGRAPHY: Detect exact font-size (px), line-height (px), font-weight (numeric), and color.
4.  SECTIONS: Break the email into logical sections (header, hero, content, footer) with exact backgrounds.

JSON OUTPUT ONLY:
{
  "matchConfidence": 98,
  "confidenceGaps": [],
  "style": "clean",
  "colors": { "background": "#HEX", "primary": "#HEX" },
  "layout": {
    "sections": [
      { "id": "sec1", "type": "header", "y": 0, "height": 80, "backgroundColor": "#HEX" }
    ]
  },
  "components": [
    {
      "type": "text|image|button",
      "sectionId": "sec1",
      "coords": { "x": 20, "y": 20, "w": 560, "h": 40 },
      "styles": {
        "fontSize": "16px",
        "lineHeight": "24px",
        "color": "#333333",
        "textAlign": "center"
      },
      "content": "Full text here",
      "altText": "Alt for images"
    }
  ]
}`;
    }

    parseAnalysisResponse(response) {
        try {
            const jsonPart = response.match(/\{[\s\S]*\}/);
            if (!jsonPart) throw new Error('No JSON payload detected in AI response');

            const data = JSON.parse(jsonPart[0]);

            // Enforce structure
            if (typeof data.matchConfidence === 'undefined') data.matchConfidence = 95;
            if (!data.confidenceGaps) data.confidenceGaps = [];
            if (!data.components) data.components = [];
            if (!data.layout || !data.layout.sections) data.layout = { sections: [] };

            return data;
        } catch (error) {
            logger.error('Parse failure', { response: response.substring(0, 500) });
            return this.getDefaultAnalysis();
        }
    }

    getDefaultAnalysis() {
        return {
            matchConfidence: 85,
            confidenceGaps: ['Vision parse failed, using structural fallback'],
            style: 'professional',
            colors: { background: '#f8fafc', primary: '#2563eb' },
            layout: {
                sections: [
                    { id: 'h1', type: 'header', y: 0, height: 100, backgroundColor: '#ffffff' },
                    { id: 'b1', type: 'body', y: 100, height: 400, backgroundColor: '#ffffff' }
                ]
            },
            components: [
                {
                    type: 'text',
                    sectionId: 'h1',
                    coords: { x: 200, y: 30, w: 200, h: 40 },
                    styles: { fontSize: '24px', color: '#1e293b', textAlign: 'center' },
                    content: 'Design Recovery Active'
                }
            ]
        };
    }
}

export default new EmailVisionService();
