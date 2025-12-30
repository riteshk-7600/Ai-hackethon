import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { JSDOM } from 'jsdom'

const app = express()
const PORT = 5000

// Middleware
app.use(cors())
app.use(express.json())

// Root endpoint - simple health check
app.get('/', (req, res) => {
    res.send('API is running! Use POST /api/compare to compare URLs.')
})

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Main comparison endpoint
app.post('/api/compare', async (req, res) => {
    console.log('\n=== NEW COMPARISON REQUEST ===')
    console.log('Request body:', req.body)

    try {
        const { liveUrl, stageUrl } = req.body

        // Validate inputs
        if (!liveUrl || !stageUrl) {
            console.error('❌ Validation failed: Missing URLs')
            return res.status(400).json({
                ok: false,
                error: 'Both liveUrl and stageUrl are required'
            })
        }

        console.log(`📥 Fetching Live URL: ${liveUrl}`)
        console.log(`📥 Fetching Stage URL: ${stageUrl}`)

        // Fetch both URLs
        const [liveResponse, stageResponse] = await Promise.all([
            axios.get(liveUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            }).catch(err => {
                console.error(`❌ Failed to fetch Live URL: ${err.message}`)
                throw new Error(`Failed to fetch Live URL: ${err.message}`)
            }),
            axios.get(stageUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            }).catch(err => {
                console.error(`❌ Failed to fetch Stage URL: ${err.message}`)
                throw new Error(`Failed to fetch Stage URL: ${err.message}`)
            })
        ])

        console.log('✅ Both URLs fetched successfully')

        // Parse HTML with JSDOM
        console.log('🔍 Parsing HTML with JSDOM...')
        const liveDom = new JSDOM(liveResponse.data)
        const stageDom = new JSDOM(stageResponse.data)

        const liveDoc = liveDom.window.document
        const stageDoc = stageDom.window.document

        // Extract data from Live
        console.log('📊 Extracting data from Live...')
        const liveData = extractPageData(liveDoc, 'Live')

        // Extract data from Stage
        console.log('📊 Extracting data from Stage...')
        const stageData = extractPageData(stageDoc, 'Stage')

        // Compare the data
        console.log('🔄 Comparing data...')
        const comparison = compareData(liveData, stageData)

        console.log('✅ Comparison complete!')
        console.log('Results:', {
            textChanged: comparison.textChanged,
            imagesOnlyInLive: comparison.images.onlyInLive.length,
            imagesOnlyInStage: comparison.images.onlyInStage.length,
            sectionsOnlyInLive: comparison.sections.onlyInLive.length,
            sectionsOnlyInStage: comparison.sections.onlyInStage.length
        })

        res.json({
            ok: true,
            ...comparison,
            metadata: {
                liveUrl,
                stageUrl,
                timestamp: new Date().toISOString()
            }
        })

    } catch (error) {
        console.error('\n❌ ERROR in /api/compare:')
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)

        res.status(500).json({
            ok: false,
            error: 'Comparison failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
})

// Helper function to extract data from a document
function extractPageData(doc, label) {
    console.log(`  - Extracting text from ${label}...`)
    const bodyText = doc.body ? doc.body.textContent.trim() : ''

    console.log(`  - Extracting images from ${label}...`)
    const images = Array.from(doc.querySelectorAll('img')).map(img => ({
        src: img.src || img.getAttribute('src') || '',
        alt: img.alt || ''
    }))

    console.log(`  - Extracting sections from ${label}...`)
    const sections = Array.from(doc.querySelectorAll('section, div[id], div[class]')).map((el, idx) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || `element-${idx}`,
        classes: el.className || ''
    }))

    console.log(`  ✓ ${label}: ${bodyText.length} chars, ${images.length} images, ${sections.length} sections`)

    return { bodyText, images, sections }
}

// Helper function to compare two datasets
function compareData(liveData, stageData) {
    // Compare text
    const textChanged = liveData.bodyText !== stageData.bodyText

    // Compare images
    const liveImageSrcs = new Set(liveData.images.map(img => img.src))
    const stageImageSrcs = new Set(stageData.images.map(img => img.src))

    const imagesOnlyInLive = liveData.images.filter(img => !stageImageSrcs.has(img.src))
    const imagesOnlyInStage = stageData.images.filter(img => !liveImageSrcs.has(img.src))

    // Compare sections
    const liveSectionIds = new Set(liveData.sections.map(s => `${s.tag}-${s.id}-${s.classes}`))
    const stageSectionIds = new Set(stageData.sections.map(s => `${s.tag}-${s.id}-${s.classes}`))

    const sectionsOnlyInLive = liveData.sections.filter(s =>
        !stageSectionIds.has(`${s.tag}-${s.id}-${s.classes}`)
    )
    const sectionsOnlyInStage = stageData.sections.filter(s =>
        !liveSectionIds.has(`${s.tag}-${s.id}-${s.classes}`)
    )

    return {
        textChanged,
        images: {
            onlyInLive: imagesOnlyInLive,
            onlyInStage: imagesOnlyInStage,
            totalLive: liveData.images.length,
            totalStage: stageData.images.length
        },
        sections: {
            onlyInLive: sectionsOnlyInLive,
            onlyInStage: sectionsOnlyInStage,
            totalLive: liveData.sections.length,
            totalStage: stageData.sections.length
        }
    }
}

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 ================================')
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🚀 Health check: http://localhost:${PORT}/health`)
    console.log(`🚀 Compare API: POST http://localhost:${PORT}/api/compare`)
    console.log('🚀 ================================\n')
})

export default app
