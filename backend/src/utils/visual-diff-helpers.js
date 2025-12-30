import { logger } from './logger.js'

/**
 * Production-ready Visual Diff Helper Utilities
 * Purpose: Modular functions for element matching, tolerance checking, and visual comparison
 */

/**
 * Build a stable CSS selector for an element with multiple fallback strategies
 * Priority: ID > Unique class combo > Path-based selector
 */
export const buildStableSelector = (element) => {
    // Strategy 1: Use ID if available
    if (element.id) {
        return `#${element.id}`
    }

    // Strategy 2: Try unique class combination
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).filter(c => c)
        if (classes.length > 0) {
            const classSelector = '.' + classes.join('.')
            // Check if this selector is unique
            const matches = document.querySelectorAll(classSelector)
            if (matches.length === 1) {
                return classSelector
            }
        }
    }

    // Strategy 3: Build path from root
    const path = []
    let current = element

    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase()

        if (current.id) {
            selector = `#${current.id}`
            path.unshift(selector)
            break
        }

        if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\s+/).filter(c => c)
            if (classes.length > 0) {
                selector += '.' + classes[0]
            }
        }

        // Add nth-child for uniqueness
        const parent = current.parentElement
        if (parent) {
            const siblings = Array.from(parent.children).filter(
                child => child.tagName === current.tagName
            )
            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1
                selector += `:nth-child(${index})`
            }
        }

        path.unshift(selector)
        current = current.parentElement
    }

    return path.join(' > ')
}

/**
 * Normalize color strings to RGB format for comparison
 * Handles: rgb(a), hex, named colors
 */
export const normalizeColor = (colorString) => {
    if (!colorString || colorString === 'transparent' || colorString === 'rgba(0, 0, 0, 0)') {
        return { r: 0, g: 0, b: 0, a: 0 }
    }

    // Handle rgb/rgba format
    const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3]),
            a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
        }
    }

    // Handle hex format
    const hexMatch = colorString.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    if (hexMatch) {
        let hex = hexMatch[1]
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('')
        }
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16),
            a: 1
        }
    }

    // Fallback: return parsed string as-is
    logger.warn(`Unable to normalize color: ${colorString}`)
    return { r: 0, g: 0, b: 0, a: 1 }
}

/**
 * Calculate Euclidean distance between two RGB colors
 * Returns: numeric distance (0 = identical colors)
 */
export const calculateColorDistance = (color1, color2) => {
    const rgb1 = typeof color1 === 'string' ? normalizeColor(color1) : color1
    const rgb2 = typeof color2 === 'string' ? normalizeColor(color2) : color2

    // If either is transparent, use alpha in comparison
    if (rgb1.a === 0 && rgb2.a === 0) return 0
    if (rgb1.a === 0 || rgb2.a === 0) return 255 // Max difference

    const rDiff = rgb1.r - rgb2.r
    const gDiff = rgb1.g - rgb2.g
    const bDiff = rgb1.b - rgb2.b

    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff)
}

/**
 * Extract numeric value from CSS measurement strings
 * Handles: px, em, rem, %, pt
 */
export const parsePixelValue = (value) => {
    if (!value) return 0
    if (typeof value === 'number') return value

    const match = value.match(/^(-?[\d.]+)(px|em|rem|%|pt)?$/)
    if (match) {
        return parseFloat(match[1])
    }

    return 0
}

/**
 * Determine if a difference should be ignored based on tolerance thresholds
 * @param {string} property - CSS property name
 * @param {string} value1 - First value
 * @param {string} value2 - Second value
 * @param {object} thresholds - Threshold configuration
 * @returns {boolean} - true if difference should be ignored
 */
export const shouldIgnoreDiff = (property, value1, value2, thresholds = {}) => {
    const defaults = {
        pixelThreshold: 1,      // Ignore < 1px differences
        colorThreshold: 15,     // Ignore color distance < 15
        fontSizeThreshold: 1,   // Ignore font size diff < 1px
        layoutThreshold: 2      // Ignore width/height diff < 2px
    }

    const config = { ...defaults, ...thresholds }

    // Exact match - no difference
    if (value1 === value2) return true

    // Color properties
    if (property === 'color' || property === 'backgroundColor') {
        const distance = calculateColorDistance(value1, value2)
        return distance < config.colorThreshold
    }

    // Font size
    if (property === 'fontSize') {
        const diff = Math.abs(parsePixelValue(value1) - parsePixelValue(value2))
        return diff < config.fontSizeThreshold
    }

    // Layout dimensions
    if (property === 'width' || property === 'height') {
        const diff = Math.abs(parsePixelValue(value1) - parsePixelValue(value2))
        return diff < config.layoutThreshold
    }

    // Spacing properties (margin, padding)
    if (property.startsWith('margin') || property.startsWith('padding') || property === 'gap') {
        const diff = Math.abs(parsePixelValue(value1) - parsePixelValue(value2))
        return diff < config.pixelThreshold
    }

    // Other numeric properties
    if (value1.match(/^-?[\d.]+/) && value2.match(/^-?[\d.]+/)) {
        const diff = Math.abs(parsePixelValue(value1) - parsePixelValue(value2))
        return diff < config.pixelThreshold
    }

    return false
}

/**
 * Categorize a CSS property into difference types
 * Returns: 'typography' | 'color' | 'spacing' | 'layout' | 'image' | 'content'
 */
export const categorizeProperty = (propertyName) => {
    const categories = {
        typography: ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration'],
        color: ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'],
        spacing: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gap', 'rowGap', 'columnGap'],
        layout: ['width', 'height', 'display', 'position', 'top', 'right', 'bottom', 'left', 'flexDirection', 'alignItems', 'justifyContent', 'gridTemplateColumns', 'gridTemplateRows'],
        image: ['src', 'backgroundImage'],
        content: ['innerText', 'textContent', 'innerHTML']
    }

    for (const [category, props] of Object.entries(categories)) {
        if (props.includes(propertyName)) {
            return category
        }
    }

    return 'other'
}

/**
 * Capture screenshot of a specific element on the page
 * @param {Page} page - Puppeteer page instance
 * @param {object} boundingRect - Element bounding rectangle {x, y, width, height}
 * @returns {string} - Base64 encoded PNG image
 */
export const captureElementScreenshot = async (page, boundingRect) => {
    try {
        if (!boundingRect || boundingRect.width === 0 || boundingRect.height === 0) {
            return null
        }

        // Add small padding to capture context
        const padding = 5
        const clip = {
            x: Math.max(0, boundingRect.x - padding),
            y: Math.max(0, boundingRect.y - padding),
            width: Math.min(boundingRect.width + padding * 2, 1920),
            height: Math.min(boundingRect.height + padding * 2, 1080)
        }

        const screenshot = await page.screenshot({
            encoding: 'base64',
            clip,
            type: 'png'
        })

        return screenshot
    } catch (error) {
        logger.error('Failed to capture element screenshot:', error.message)
        return null
    }
}

/**
 * Match elements between two arrays using selector-based strategy
 * @param {Array} liveElements - Elements from live environment
 * @param {Array} stageElements - Elements from stage environment
 * @returns {Array} - Array of matched pairs {live, stage, matchType}
 */
export const matchElements = (liveElements, stageElements) => {
    const matches = []
    const usedStageIndices = new Set()

    // First pass: Match by selector
    liveElements.forEach((liveEl, liveIndex) => {
        const stageIndex = stageElements.findIndex((stageEl, idx) =>
            !usedStageIndices.has(idx) && stageEl.selector === liveEl.selector
        )

        if (stageIndex !== -1) {
            matches.push({
                live: liveEl,
                stage: stageElements[stageIndex],
                matchType: 'selector',
                liveIndex,
                stageIndex
            })
            usedStageIndices.add(stageIndex)
        }
    })

    // Second pass: Match remaining by index (fallback)
    liveElements.forEach((liveEl, liveIndex) => {
        const alreadyMatched = matches.some(m => m.liveIndex === liveIndex)
        if (!alreadyMatched && liveIndex < stageElements.length && !usedStageIndices.has(liveIndex)) {
            matches.push({
                live: liveEl,
                stage: stageElements[liveIndex],
                matchType: 'index',
                liveIndex,
                stageIndex: liveIndex
            })
            usedStageIndices.add(liveIndex)
        }
    })

    return matches
}

/**
 * Generate human-readable difference description
 */
export const formatDifferenceMessage = (property, liveValue, stageValue, category) => {
    const categoryEmoji = {
        typography: '📝',
        color: '🎨',
        spacing: '📏',
        layout: '📐',
        image: '🖼️',
        content: '📄'
    }

    const emoji = categoryEmoji[category] || '🔍'
    return `${emoji} ${property}: Live="${liveValue}" vs Stage="${stageValue}"`
}

export default {
    buildStableSelector,
    normalizeColor,
    calculateColorDistance,
    parsePixelValue,
    shouldIgnoreDiff,
    categorizeProperty,
    captureElementScreenshot,
    matchElements,
    formatDifferenceMessage
}
