/**
 * Fix Generator Utility
 * Generates exact HTML/CSS/ARIA fixes for accessibility issues
 */

/**
 * Generate fix instructions for accessibility issues
 * @param {object} issue - Issue object
 * @returns {object} Fix details
 */
export function generateFix(issue) {
    const ruleId = issue.id || issue.rule_id || ''

    // Map common issue types to fix generators
    const fixGenerators = {
        'image-alt': generateAltTextFix,
        'label': generateLabelFix,
        'color-contrast': generateContrastFix,
        'button-name': generateButtonNameFix,
        'link-name': generateLinkNameFix,
        'heading-order': generateHeadingOrderFix,
        'landmark-one-main': generateLandmarkFix,
        'aria-required-children': generateAriaChildrenFix,
        'aria-required-parent': generateAriaParentFix,
        'tabindex': generateTabindexFix,
        'duplicate-id': generateDuplicateIdFix,
        'meta-viewport': generateViewportFix,
        'html-lang-valid': generateHtmlLangFix,
        'skip-link': generateSkipLinkFix
    }

    // Find matching generator
    for (const [key, generator] of Object.entries(fixGenerators)) {
        if (ruleId.includes(key)) {
            return generator(issue)
        }
    }

    // Default fix format
    return {
        what: issue.description || 'Accessibility issue detected',
        why: issue.help || 'This impacts users with disabilities',
        guideline: extractWCAG(issue),
        code: '/* Fix code not available */',
        example: 'Please refer to WCAG guidelines for this issue',
        required: issue.impact === 'critical' || issue.impact === 'serious'
    }
}

/**
 * Extract WCAG guideline from issue tags
 */
function extractWCAG(issue) {
    if (issue.wcag) return issue.wcag
    if (issue.tags) {
        const wcagTags = issue.tags.filter(tag => tag.match(/wcag\d+/i))
        return wcagTags.map(tag => tag.replace('wcag', '').replace(/(\d)(\d)(\d)/, '$1.$2.$3')).join(', ')
    }
    return 'WCAG 2.1'
}

// Alt Text Fix
function generateAltTextFix(issue) {
    const element = issue.html || issue.element || ''
    const isDecorative = element.includes('decorative') || element.includes('spacer')

    return {
        what: 'Image is missing alternative text',
        why: 'WCAG 1.1.1 Non-text Content - Screen readers cannot describe this image to blind users',
        guideline: '1.1.1',
        code: isDecorative
            ? '<img src="image.jpg" alt="" role="presentation">'
            : '<img src="image.jpg" alt="Descriptive text about the image">',
        example: isDecorative
            ? 'For decorative images, use empty alt="" and role="presentation"'
            : 'Describe what the image shows: "Team collaborating in modern office"',
        required: true
    }
}

// Label Fix
function generateLabelFix(issue) {
    const element = issue.html || issue.element || ''
    const hasId = element.match(/id="([^"]+)"/)
    const id = hasId ? hasId[1] : 'input-field'

    return {
        what: 'Form input is missing a label',
        why: 'WCAG 1.3.1 Info and Relationships - Screen reader users won\'t know what this field is for',
        guideline: '1.3.1',
        code: `<label for="${id}">Field Name:</label>\n<input type="text" id="${id}" name="${id}">`,
        example: 'Always associate labels with inputs using for/id attributes. Avoid placeholder-only labels.',
        required: true
    }
}

// Contrast Fix
function generateContrastFix(issue) {
    const current = issue.contrastRatio || issue.ratio || 'unknown'
    const required = issue.requiredRatio || '4.5:1'
    const suggested = issue.suggestedForeground?.hex || '#000000'

    return {
        what: `Text has insufficient color contrast (${current})`,
        why: `WCAG 1.4.3 Contrast (Minimum) - Users with low vision cannot read this text. Required: ${required}`,
        guideline: '1.4.3',
        code: `.text-element {\n  color: ${suggested};\n  /* Contrast ratio: ${required} */\n}`,
        example: issue.suggestedForeground
            ? `Change color from ${issue.foreground} to ${suggested} for ${issue.suggestedForeground.ratio}:1 ratio`
            : 'Use darker text on light backgrounds or lighter text on dark backgrounds',
        required: true
    }
}

// Button Name Fix
function generateButtonNameFix(issue) {
    return {
        what: 'Button has no accessible name',
        why: 'WCAG 4.1.2 Name, Role, Value - Screen readers cannot announce what this button does',
        guideline: '4.1.2',
        code: '<button aria-label="Submit form">▶</button>\n<!-- OR -->\n<button><span aria-hidden="true">▶</span> Submit</button>',
        example: 'Icon-only buttons must have aria-label or visible text',
        required: true
    }
}

// Link Name Fix
function generateLinkNameFix(issue) {
    return {
        what: 'Link has no accessible text',
        why: 'WCAG 2.4.4 Link Purpose - Screen reader users hear only "link" without context',
        guideline: '2.4.4',
        code: '<a href="/page" aria-label="Read more about our services">Read More</a>\n<!-- OR -->\n<a href="/page">Read more about our services</a>',
        example: 'Avoid generic "click here" or "read more". Make links descriptive and unique.',
        required: true
    }
}

// Heading Order Fix
function generateHeadingOrderFix(issue) {
    return {
        what: 'Heading levels are skipped (e.g., H1 to H3)',
        why: 'WCAG 1.3.1 Info and Relationships - Users relying on document structure will be confused',
        guideline: '1.3.1',
        code: '<!-- Incorrect -->\n<h1>Page Title</h1>\n<h3>Section</h3>\n\n<!-- Correct -->\n<h1>Page Title</h1>\n<h2>Section</h2>',
        example: 'Always use headings in sequential order (H1 → H2 → H3). Don\'t skip levels.',
        required: false
    }
}

// Landmark Fix
function generateLandmarkFix(issue) {
    return {
        what: 'Page is missing main landmark or has multiple main elements',
        why: 'WCAG 1.3.1 Info and Relationships - Screen reader users cannot navigate to page content quickly',
        guideline: '1.3.1',
        code: '<!DOCTYPE html>\n<html>\n<body>\n  <header>...</header>\n  <nav>...</nav>\n  <main>\n    <!-- Page content here -->\n  </main>\n  <footer>...</footer>\n</body>\n</html>',
        example: 'Use exactly one <main> element containing primary page content',
        required: true
    }
}

// ARIA Children Fix
function generateAriaChildrenFix(issue) {
    const role = issue.html?.match(/role="([^"]+)"/)
    return {
        what: `Element with ${role ? role[1] : 'ARIA role'} is missing required children`,
        why: 'WCAG 1.3.1 Info and Relationships - ARIA roles must have proper structure',
        guideline: '1.3.1',
        code: '<ul role="list">\n  <li role="listitem">Item 1</li>\n  <li role="listitem">Item 2</li>\n</ul>',
        example: 'role="list" requires role="listitem" children. role="radiogroup" requires role="radio" children.',
        required: true
    }
}

// ARIA Parent Fix
function generateAriaParentFix(issue) {
    return {
        what: 'Element requires a specific ARIA parent role',
        why: 'WCAG 1.3.1 Info and Relationships - ARIA structure must be valid',
        guideline: '1.3.1',
        code: '<ul role="list">\n  <li role="listitem">Must be inside list</li>\n</ul>',
        example: 'role="listitem" must be inside role="list". role="tab" must be inside role="tablist".',
        required: true
    }
}

// Tabindex Fix
function generateTabindexFix(issue) {
    return {
        what: 'Element has positive tabindex value',
        why: 'WCAG 2.4.3 Focus Order - Positive tabindex disrupts natural keyboard navigation',
        guideline: '2.4.3',
        code: '<!-- Incorrect -->\n<div tabindex="1">...</div>\n\n<!-- Correct -->\n<div tabindex="0">...</div>\n<!-- OR -->\n<div tabindex="-1">...</div>',
        example: 'Use tabindex="0" to add to tab order or tabindex="-1" for programmatic focus only. Never use positive values.',
        required: false
    }
}

// Duplicate ID Fix
function generateDuplicateIdFix(issue) {
    const id = issue.html?.match(/id="([^"]+)"/)
    return {
        what: 'Multiple elements have the same ID',
        why: 'WCAG 4.1.1 Parsing - Duplicate IDs break form labels and ARIA references',
        guideline: '4.1.1',
        code: `<!-- Each ID must be unique -->\n<div id="${id?.[1] || 'unique-id'}-1">...</div>\n<div id="${id?.[1] || 'unique-id'}-2">...</div>`,
        example: 'Ensure all IDs are unique on the page. Use classes for styling instead.',
        required: true
    }
}

// Viewport Fix
function generateViewportFix(issue) {
    return {
        what: 'Viewport meta tag prevents zooming',
        why: 'WCAG 1.4.4 Resize Text - Users with low vision cannot zoom in',
        guideline: '1.4.4',
        code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
        example: 'Never use maximum-scale=1.0 or user-scalable=no',
        required: true
    }
}

// HTML Lang Fix
function generateHtmlLangFix(issue) {
    return {
        what: 'HTML element is missing or has invalid lang attribute',
        why: 'WCAG 3.1.1 Language of Page - Screen readers won\'t use correct pronunciation',
        guideline: '3.1.1',
        code: '<html lang="en">\n<!-- OR -->\n<html lang="es">\n<html lang="fr">',
        example: 'Always set lang attribute on <html> with valid language code (en, es, fr, de, etc.)',
        required: true
    }
}

// Skip Link Fix
function generateSkipLinkFix(issue) {
    return {
        what: 'Missing skip-to-content link',
        why: 'WCAG 2.4.1 Bypass Blocks - Keyboard users must tab through entire navigation',
        guideline: '2.4.1',
        code: '<body>\n  <a href="#main" class="skip-link">Skip to main content</a>\n  <nav>...</nav>\n  <main id="main">...</main>\n</body>\n\n/* CSS */\n.skip-link:not(:focus) {\n  position: absolute;\n  left: -9999px;\n}',
        example: 'Add a visually-hidden skip link as the first focusable element',
        required: false
    }
}

export default {
    generateFix,
    extractWCAG
}
