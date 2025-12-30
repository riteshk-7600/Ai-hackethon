import { OpenAI } from 'openai'
import dotenv from 'dotenv'
import { logger } from '../utils/logger.js'

dotenv.config()

class AINamingService {
    constructor() {
        constructor() {
            if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'test-key') {
                try {
                    this.openai = new OpenAI({
                        apiKey: process.env.OPENAI_API_KEY
                    })
                } catch (e) {
                    logger.warn('Failed to initialize OpenAI client', e);
                }
            }
        }
    }

    /**
     * Analyze image and generate SEO filename
     * @param {string} imagePath - Absolute path to the image file
     * @param {string} currentFilename - Original filename for context
     */
    async analyzeAndName(imagePath, currentFilename, base64Image) {
        try {
            const apiKey = process.env.OPENAI_API_KEY
            if (!apiKey || apiKey === 'PLACE_YOUR_OPEN_AI_KEY_HERE' || apiKey.includes('your_openai_key')) {
                logger.warn('No valid OpenAI API Key found. Returning structured mock analysis.')
                return this.getMockAnalysis(currentFilename)
            }

            const prompt = `
            You are a highly accurate Computer Vision classifier and SEO expert. 
            Your FIRST priority is to correctly identify the image type before describing content.

            =============================================================
            🔥 STEP 1 — CLASSIFY THE IMAGE TYPE (MANDATORY)
            =============================================================
            Identify the category correctly:
            - map (geographical, political, regional, country boundaries)
            - chart / graph (data visualizations, bar charts, pie charts)
            - icon / illustration / vector (drawn artwork, non-photo)
            - logo (brand, company identity)
            - text-only document / form / certificate
            - ui (software screenshot, app window, login screen, settings)
            - code (terminal, code editor, code snippet)
            - photo (real objects, people, buildings, nature)
            - landscape (mountains, beaches, parks)

            =============================================================
            🔥 STEP 2 — CATEGORY-SPECIFIC LOGIC
            =============================================================
            - IF MAP: Identify Country/Region and Map Type (political, outline, colored).
              Format: <country-or-region>-<map-type>-map
            - IF UI/CODE: Identify the app/system and the specific screen/language.
              Format: <primary-system>-<screen-or-language>-<purpose>
            - IF PHOTO/LANDSCAPE: Detect Objects, Scene, and Action.
              Format: <primary-subject>-<scene-or-action>-<descriptive-keyword>

            =============================================================
            🔥 FILENAME RULES (STRICT COMPLIANCE)
            =============================================================
            - Formula: <primary>-<category-or-type>-<keyword>
            - Lowercase ONLY.
            - Hyphen-separated (kebab-case) ONLY.
            - Max 60 characters.
            - NO generic words like "image", "photo", "pic", "screenshot", "img".
            - NO original filename influence.
            - MUST be highly accurate and descriptive.

            =============================================================
            🔥 GROUND TRUTH EXAMPLES (FOLLOW THESE PATTERNS)
            =============================================================
            - Garden photo -> colorful-flower-garden-landscape
            - USA Map -> united-states-political-map
            - USA Map Colored -> usa-colored-region-map
            - World Map Outline -> world-map-continents-outline
            - Dog in park -> running-dog-in-park
            - Dentist -> dentist-checkup-patient-treatment
            - Login screen -> macos-login-authentication-screen
            - Code Editor -> developer-code-editor-dark-theme
            - Settings -> system-preferences-settings-window
            - Building -> modern-office-building-exterior

            Return ONLY a valid JSON object:
            {
                "type": "map | chart | logo | ui | code | photo | landscape | illustration | document | other",
                "objects": ["string"],
                "scene": "string (accurate classification)",
                "confidenceScore": 0.0 to 1.0,
                "caption": "string (accurate summary)",
                "finalFilename": "string (strictly keyword1-keyword2-context format)"
            }
            `

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    "url": `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                response_format: { type: "json_object" }
            })

            const content = JSON.parse(response.choices[0].message.content)

            // Validate and Sanitize
            if (!content.finalFilename || content.finalFilename === 'undefined') {
                content.finalFilename = `${content.type || 'image'}-${Date.now()}`
            }

            content.finalFilename = this.sanitizeFilename(content.finalFilename)
            content.type = content.type || 'other'
            content.confidenceScore = content.confidenceScore || 0.75

            return content

        } catch (error) {
            logger.error('AI Analysis failed:', error)
            return {
                type: "other",
                objects: [],
                scene: "unknown",
                caption: "Analysis service failure",
                finalFilename: `safe-fallback-image-${Date.now()}`
            }
        }
    }

    sanitizeFilename(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 60)
    }

    getMockAnalysis(filename) {
        return {
            type: "landscape",
            objects: ["flowers", "garden", "trees"],
            scene: "outdoor garden",
            caption: "A bright colorful garden filled with vibrant flowers.",
            finalFilename: "colorful-flower-garden-landscape",
            isMock: true
        }
    }
}

export default new AINamingService()
