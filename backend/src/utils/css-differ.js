import { logger } from './logger.js'

export class CSSDiffer {
    /**
     * Compare CSS properties between two elements
     */
    compareProperties(liveProps, stageProps, significantProps = []) {
        const differences = []

        // Default significant properties if none specified
        const propsToCheck = significantProps.length > 0 ? significantProps : [
            'fontSize',
            'fontFamily',
            'fontWeight',
            'color',
            'backgroundColor',
            'width',
            'height',
            'marginTop',
            'marginRight',
            'marginBottom',
            'marginLeft',
            'paddingTop',
            'paddingRight',
            'paddingBottom',
            'paddingLeft',
            'display',
            'flexDirection',
            'justifyContent',
            'alignItems',
            'gap',
            'borderRadius',
            'boxShadow'
        ]

        propsToCheck.forEach(prop => {
            if (liveProps[prop] !== stageProps[prop]) {
                differences.push({
                    property: prop,
                    liveValue: liveProps[prop],
                    stageValue: stageProps[prop],
                    type: this.categorizeProperty(prop)
                })
            }
        })

        return differences
    }

    /**
     * Categorize CSS property into types
     */
    categorizeProperty(property) {
        const categories = {
            typography: ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing'],
            color: ['color', 'backgroundColor', 'borderColor'],
            spacing: ['margin', 'padding', 'gap', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
            layout: ['width', 'height', 'display', 'flexDirection', 'justifyContent', 'alignItems',
                'gridTemplateColumns', 'gridTemplateRows'],
            visual: ['borderRadius', 'boxShadow', 'opacity', 'transform']
        }

        for (const [category, props] of Object.entries(categories)) {
            if (props.some(p => property.toLowerCase().includes(p.toLowerCase()))) {
                return category
            }
        }

        return 'other'
    }

    /**
     * Calculate similarity score between two style objects
     */
    calculateSimilarity(liveProps, stageProps, significantProps = []) {
        const differences = this.compareProperties(liveProps, stageProps, significantProps)

        const propsToCheck = significantProps.length > 0 ? significantProps : Object.keys(liveProps)
        const totalProps = propsToCheck.length
        const differentProps = differences.length

        const similarityScore = ((totalProps - differentProps) / totalProps) * 100

        return {
            score: Math.round(similarityScore),
            totalProperties: totalProps,
            differentProperties: differentProps,
            differences
        }
    }

    /**
     * Group differences by category
     */
    groupDifferencesByCategory(differences) {
        const grouped = {
            typography: [],
            color: [],
            spacing: [],
            layout: [],
            visual: []
            ,
            other: []
        }

        differences.forEach(diff => {
            const category = diff.type || 'other'
            if (grouped[category]) {
                grouped[category].push(diff)
            } else {
                grouped.other.push(diff)
            }
        })

        return grouped
    }

    /**
     * Format difference for display
     */
    formatDifference(diff) {
        return {
            property: this.humanizePropertyName(diff.property),
            liveValue: this.formatValue(diff.liveValue),
            stageValue: this.formatValue(diff.stageValue),
            category: diff.type,
            severity: this.determineSeverity(diff)
        }
    }

    /**
     * Convert camelCase to human-readable
     */
    humanizePropertyName(propName) {
        return propName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim()
    }

    /**
     * Format CSS value for display
     */
    formatValue(value) {
        if (!value) return 'not set'
        if (value.length > 50) return value.substring(0, 50) + '...'
        return value
    }

    /**
     * Determine severity of difference
     */
    determineSeverity(diff) {
        // Critical - layout-breaking changes
        const criticalProps = ['width', 'height', 'display', 'position']
        if (criticalProps.includes(diff.property)) {
            return 'critical'
        }

        // Warning - visible changes
        const warningProps = ['fontSize', 'color', 'backgroundColor', 'padding', 'margin']
        if (warningProps.some(p => diff.property.toLowerCase().includes(p.toLowerCase()))) {
            return 'warning'
        }

        // Minor - subtle changes
        return 'minor'
    }

    /**
     * Generate diff summary
     */
    generateSummary(differences) {
        const grouped = this.groupDifferencesByCategory(differences)

        return {
            totalDifferences: differences.length,
            typographyDiffs: grouped.typography.length,
            colorDiffs: grouped.color.length,
            spacingDiffs: grouped.spacing.length,
            layoutDiffs: grouped.layout.length,
            visualDiffs: grouped.visual.length,
            criticalCount: differences.filter(d => this.determineSeverity(d) === 'critical').length,
            warningCount: differences.filter(d => this.determineSeverity(d) === 'warning').length,
            minorCount: differences.filter(d => this.determineSeverity(d) === 'minor').length
        }
    }
}

export default new CSSDiffer()
