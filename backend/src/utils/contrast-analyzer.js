/**
 * Contrast Analyzer Utility
 * Calculates WCAG contrast ratios and suggests accessible colors
 */

/**
 * Convert RGB to relative luminance
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Relative luminance
 */
function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 * @param {number} l1 - Luminance of color 1
 * @param {number} l2 - Luminance of color 2
 * @returns {number} Contrast ratio
 */
function getContrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Parse CSS color to RGB
 * @param {string} color - CSS color (hex, rgb, rgba)
 * @returns {object} {r, g, b} or null
 */
function parseColor(color) {
    if (!color || color === 'transparent') return null

    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.replace('#', '')
        if (hex.length === 3) {
            return {
                r: parseInt(hex[0] + hex[0], 16),
                g: parseInt(hex[1] + hex[1], 16),
                b: parseInt(hex[2] + hex[2], 16)
            }
        }
        if (hex.length === 6) {
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
            }
        }
    }

    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3])
        }
    }

    return null
}

/**
 * Convert RGB to hex
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {string} Hex color
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(c => {
        const hex = Math.round(c).toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }).join('')
}

/**
 * Check WCAG compliance
 * @param {number} ratio - Contrast ratio
 * @param {boolean} isLargeText - Is large text (18pt+ or 14pt+ bold)
 * @returns {object} Compliance levels
 */
function checkWCAGCompliance(ratio, isLargeText = false) {
    const minAA = isLargeText ? 3.0 : 4.5
    const minAAA = isLargeText ? 4.5 : 7.0

    return {
        aa: ratio >= minAA,
        aaa: ratio >= minAAA,
        level: ratio >= minAAA ? 'AAA' : ratio >= minAA ? 'AA' : 'Fail'
    }
}

/**
 * Suggest accessible color
 * Try to preserve hue while adjusting lightness
 * @param {object} foreground - {r, g, b}
 * @param {object} background - {r, g, b}
 * @param {number} targetRatio - Target contrast ratio
 * @param {boolean} adjustForeground - Adjust foreground (true) or background (false)
 * @returns {object} Suggested color {r, g, b, hex}
 */
function suggestAccessibleColor(foreground, background, targetRatio = 4.5, adjustForeground = true) {
    const bgLuminance = getLuminance(background.r, background.g, background.b)

    if (adjustForeground) {
        // Try darkening first
        let suggested = adjustColorForContrast(foreground, bgLuminance, targetRatio, 'darken')
        if (suggested) return suggested

        // Try lightening
        suggested = adjustColorForContrast(foreground, bgLuminance, targetRatio, 'lighten')
        if (suggested) return suggested

        // Fallback: use black or white
        return bgLuminance > 0.5
            ? { r: 0, g: 0, b: 0, hex: '#000000', ratio: getContrastRatio(0, bgLuminance) }
            : { r: 255, g: 255, b: 255, hex: '#FFFFFF', ratio: getContrastRatio(1, bgLuminance) }
    } else {
        // Adjust background
        const fgLuminance = getLuminance(foreground.r, foreground.g, foreground.b)

        let suggested = adjustColorForContrast(background, fgLuminance, targetRatio, 'darken')
        if (suggested) return suggested

        suggested = adjustColorForContrast(background, fgLuminance, targetRatio, 'lighten')
        if (suggested) return suggested

        return fgLuminance > 0.5
            ? { r: 0, g: 0, b: 0, hex: '#000000', ratio: getContrastRatio(0, fgLuminance) }
            : { r: 255, g: 255, b: 255, hex: '#FFFFFF', ratio: getContrastRatio(1, fgLuminance) }
    }
}

/**
 * Adjust color lightness to meet contrast target
 * @param {object} color - {r, g, b}
 * @param {number} targetLuminance - Target contrast luminance
 * @param {number} targetRatio - Target ratio
 * @param {string} direction - 'darken' or 'lighten'
 * @returns {object} Adjusted color or null
 */
function adjustColorForContrast(color, targetLuminance, targetRatio, direction) {
    let { r, g, b } = color
    const step = direction === 'darken' ? -5 : 5
    const limit = direction === 'darken' ? 0 : 255

    for (let i = 0; i < 51; i++) { // Max 51 steps (255/5)
        r = Math.max(0, Math.min(255, r + step))
        g = Math.max(0, Math.min(255, g + step))
        b = Math.max(0, Math.min(255, b + step))

        const luminance = getLuminance(r, g, b)
        const ratio = getContrastRatio(luminance, targetLuminance)

        if (ratio >= targetRatio) {
            return {
                r,
                g,
                b,
                hex: rgbToHex(r, g, b),
                ratio: ratio.toFixed(2)
            }
        }

        // Stop if we've reached the limit
        if ((direction === 'darken' && r === 0 && g === 0 && b === 0) ||
            (direction === 'lighten' && r === 255 && g === 255 && b === 255)) {
            break
        }
    }

    return null
}

/**
 * Analyze contrast for an element
 * @param {object} element - Element with color and backgroundColor
 * @param {boolean} isLargeText - Is large text
 * @returns {object} Analysis result
 */
export function analyzeContrast(element, isLargeText = false) {
    const fg = parseColor(element.color)
    const bg = parseColor(element.backgroundColor)

    if (!fg || !bg) {
        return {
            valid: false,
            reason: 'Unable to parse colors'
        }
    }

    const fgLuminance = getLuminance(fg.r, fg.g, fg.b)
    const bgLuminance = getLuminance(bg.r, bg.g, bg.b)
    const ratio = getContrastRatio(fgLuminance, bgLuminance)
    const compliance = checkWCAGCompliance(ratio, isLargeText)

    const requiredAA = isLargeText ? 3.0 : 4.5
    const requiredAAA = isLargeText ? 4.5 : 7.0

    const result = {
        valid: true,
        foreground: element.color,
        background: element.backgroundColor,
        ratio: ratio.toFixed(2),
        ratioNumber: ratio,
        compliance: compliance.level,
        passAA: compliance.aa,
        passAAA: compliance.aaa,
        requiredAA,
        requiredAAA,
        isLargeText
    }

    // Add suggestions if it fails
    if (!compliance.aa) {
        result.suggestedForeground = suggestAccessibleColor(fg, bg, requiredAA, true)
        result.suggestedBackground = suggestAccessibleColor(fg, bg, requiredAA, false)
    }

    return result
}

/**
 * Get WCAG level from contrast analysis results
 * @param {Array} contrastIssues - Array of contrast issues
 * @returns {string} WCAG level
 */
export function getContrastWCAGLevel(contrastIssues) {
    const failures = contrastIssues.filter(issue => !issue.passAA)
    if (failures.length > 0) return 'Fail'

    const aaaFailures = contrastIssues.filter(issue => !issue.passAAA)
    if (aaaFailures.length > 0) return 'AA'

    return 'AAA'
}

export default {
    analyzeContrast,
    getContrastWCAGLevel,
    parseColor,
    getLuminance,
    getContrastRatio,
    checkWCAGCompliance,
    suggestAccessibleColor
}
