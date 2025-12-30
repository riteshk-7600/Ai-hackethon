import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../utils/logger.js'

export class AIService {
    constructor() {
        this.provider = process.env.AI_PROVIDER || 'openai'
        this.enabled = false

        if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
            try {
                this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
                this.enabled = true
                logger.info('OpenAI service initialized')
            } catch (err) {
                logger.warn('OpenAI initialization failed:', err.message)
            }
        } else if (this.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
            try {
                this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
                this.enabled = true
                logger.info('Anthropic service initialized')
            } catch (err) {
                logger.warn('Anthropic initialization failed:', err.message)
            }
        } else {
            logger.warn('AI service disabled - no API keys configured')
        }
    }

    isEnabled() {
        return this.enabled
    }

    async explainIssue(issue, context = {}) {
        // Return static explanation if AI is disabled
        if (!this.enabled) {
            return `${issue.description}. ${issue.recommendation || issue.fix || 'Please review and fix this issue.'}`
        }

        const prompt = `You are a frontend quality expert. Explain this issue in simple terms:

Issue: ${issue.description}
Element: ${issue.element || 'N/A'}
Severity: ${issue.severity}

Provide:
1. What this means in plain language
2. Why it matters
3. How to fix it with specific code examples`

        try {
            if (this.provider === 'openai') {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: 'You are a helpful frontend quality expert.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })

                return response.choices[0].message.content
            }

            if (this.provider === 'anthropic') {
                const response = await this.anthropic.messages.create({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 500,
                    messages: [{ role: 'user', content: prompt }]
                })

                return response.content[0].text
            }

            return 'AI provider not configured'

        } catch (error) {
            logger.error('AI explanation error:', error)
            return `${issue.description}. ${issue.recommendation || issue.fix || ''}`
        }
    }

    async generateFix(issue) {
        const prompt = `Generate a code fix for this frontend issue:

Issue: ${issue.description}
Element: ${issue.element || 'N/A'}

Provide ONLY the corrected code snippet, no explanation.`

        try {
            if (this.provider === 'openai') {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: 'You are a code generation expert. Return only code.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 300,
                    temperature: 0.3
                })

                return response.choices[0].message.content
            }

            if (this.provider === 'anthropic') {
                const response = await this.anthropic.messages.create({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 300,
                    messages: [{ role: 'user', content: prompt }]
                })

                return response.content[0].text
            }

            return issue.fix || 'Fix not available'

        } catch (error) {
            logger.error('AI fix generation error:', error)
            return issue.fix || 'Unable to generate fix'
        }
    }

    async generateClientReport(results, type) {
        const prompt = `Generate a client-friendly summary report for this ${type} audit:

Score: ${results.score}/100
Total Issues: ${results.issues?.length || 0}
Critical: ${results.issues?.filter(i => i.severity === 'critical').length || 0}

Create a professional, non-technical summary suitable for clients. Include:
1. Executive summary
2. Key findings (3-5 points)
3. Recommended next steps

Keep it concise and actionable.`

        try {
            if (this.provider === 'openai') {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: 'You are a professional technical writer.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 600,
                    temperature: 0.7
                })

                return response.choices[0].message.content
            }

            if (this.provider === 'anthropic') {
                const response = await this.anthropic.messages.create({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 600,
                    messages: [{ role: 'user', content: prompt }]
                })

                return response.content[0].text
            }

            return 'AI provider not configured'

        } catch (error) {
            logger.error('AI report generation error:', error)
            return 'Unable to generate client report'
        }
    }

    async compareScreenshots(image1Base64, image2Base64) {
        // This would use GPT-4V or Claude Vision
        const prompt = `Compare these two screenshots and identify visual differences, misalignments, and spacing issues.`

        try {
            if (this.provider === 'openai' && this.openai) {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: prompt },
                                { type: 'image_url', image_url: { url: `data:image/png;base64,${image1Base64}` } },
                                { type: 'image_url', image_url: { url: `data:image/png;base64,${image2Base64}` } }
                            ]
                        }
                    ],
                    max_tokens: 500
                })

                return response.choices[0].message.content
            }

            return 'Vision AI not available'

        } catch (error) {
            logger.error('Vision AI error:', error)
            return 'Unable to compare screenshots'
        }
    }

    async analyzeImageWithVision(base64Image, prompt) {
        if (!this.enabled) {
            logger.warn('AI vision analysis requested but AI is disabled')
            return 'AI vision analysis not available - API key not configured'
        }

        try {
            if (this.provider === 'openai' && this.openai) {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4-vision-preview',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: { url: `data:image/png;base64,${base64Image}` }
                            }
                        ]
                    }],
                    max_tokens: 2000,
                    temperature: 0.3
                })

                return response.choices[0].message.content
            }

            if (this.provider === 'anthropic' && this.anthropic) {
                const response = await this.anthropic.messages.create({
                    model: 'claude-3-opus-20240229',
                    max_tokens: 2000,
                    messages: [{
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: 'image/png',
                                    data: base64Image
                                }
                            },
                            { type: 'text', text: prompt }
                        ]
                    }]
                })

                return response.content[0].text
            }

            return 'AI provider not configured'

        } catch (error) {
            logger.error('Vision AI analysis error:', error)
            throw new Error(`Vision analysis failed: ${error.message}`)
        }
    }

    async generateUsageGuide(component) {
        const prompt = `Generate a concise usage guide for this HTML component:

Component Name: ${component.name}
Type: ${component.type}
HTML: ${component.usage}

Provide:
1. Brief description (1-2 sentences)
2. When to use it
3. Key props/attributes
4. Example usage

Keep it concise and practical.`

        try {
            if (this.provider === 'openai' && this.openai) {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: 'You are a technical documentation expert.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 400,
                    temperature: 0.7
                })

                return response.choices[0].message.content
            }

            if (this.provider === 'anthropic' && this.anthropic) {
                const response = await this.anthropic.messages.create({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 400,
                    messages: [{ role: 'user', content: prompt }]
                })

                return response.content[0].text
            }

            return 'AI provider not configured'

        } catch (error) {
            logger.error('AI usage guide generation error:', error)
            return 'A reusable component for your application.'
        }
    }
}

export default new AIService()
