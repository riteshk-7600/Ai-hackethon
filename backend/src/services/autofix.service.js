import { logger } from '../utils/logger.js'

/**
 * AutoFix Service
 * Analyzes Lighthouse results and generates code-level fix instructions, 
 * patches, and educational content for the Auto-Fix Engine.
 */

// Helper to format bytes
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const generateAutoFixReport = (lhr) => {
    const issues = []
    let totalFixableIssues = 0
    let manualFixIsues = 0

    // 1. Analyze Unused CSS
    const unusedCss = lhr.audits['unused-css-rules']
    if (unusedCss && unusedCss.score !== 1 && unusedCss.details?.items) {
        unusedCss.details.items.forEach(item => {
            totalFixableIssues++
            issues.push({
                id: 'unused-css-rules',
                title: 'Remove Unused CSS',
                file: item.url,
                wastedKB: Math.round(item.wastedBytes / 1024),
                impact: 'High',
                severity: 'critical',
                cause: `This file contains ${item.wastedPercent}% unused styles`,
                whyItMatters: 'Unused CSS delays the first paint and consumes bandwidth.',
                howToFix: [
                    'Use a tool like PurgeCSS to remove unused styles during build.',
                    'Split your CSS into smaller, page-specific chunks.',
                    'Defer loading of non-critical CSS.'
                ],
                fixAction: {
                    canAutoFix: true,
                    patchType: 'purge-css',
                    command: `npm run purge-css -- --content src/**/*.html --css ${item.url.split('/').pop()}`,
                    description: 'Run PurgeCSS to automatically remove unused rules.'
                }
            })
        })
    }

    // 2. Analyze Unused JavaScript
    const unusedJs = lhr.audits['unused-javascript']
    if (unusedJs && unusedJs.score !== 1 && unusedJs.details?.items) {
        unusedJs.details.items.forEach(item => {
            totalFixableIssues++
            issues.push({
                id: 'unused-javascript',
                title: 'Remove Unused JavaScript',
                file: item.url,
                wastedKB: Math.round(item.wastedBytes / 1024),
                impact: 'High',
                severity: 'critical',
                cause: `This file contains ${Math.round((item.wastedBytes / item.totalBytes) * 100)}% unused code`,
                whyItMatters: 'Unused JS blocks the main thread and delays interactivity.',
                howToFix: [
                    'Implement Code Splitting (e.g., React.lazy).',
                    'Tree-shake your bundle to remove unused exports.',
                    'Lazy load this script if it is not needed immediately.'
                ],
                fixAction: {
                    canAutoFix: false, // Too complex to auto-patch binary/minified JS safely
                    patchType: 'code-split',
                    description: 'Modify your bundler config (Webpack/Vite) to split this chunk.'
                }
            })
        })
    }

    // 3. Render Blocking Resources
    const renderBlocking = lhr.audits['render-blocking-resources']
    if (renderBlocking && renderBlocking.score !== 1 && renderBlocking.details?.items) {
        renderBlocking.details.items.forEach(item => {
            totalFixableIssues++
            const isJs = item.url.endsWith('.js')
            issues.push({
                id: 'render-blocking-resources',
                title: 'Eliminate Render-Blocking Resources',
                file: item.url,
                wastedMs: item.wastedMs,
                impact: 'High',
                severity: 'critical',
                cause: 'This resource must be downloaded and parsed before the page can show anything.',
                whyItMatters: 'Blocking resources delay the First Contentful Paint (FCP).',
                howToFix: isJs ? [
                    'Add "defer" or "async" attribute to the <script> tag.',
                    'Move the script to the bottom of <body>.',
                ] : [
                    'Inline critical CSS.',
                    'Load non-critical CSS asynchronously (media="print" trick).',
                ],
                fixAction: {
                    canAutoFix: true,
                    patchType: 'attr-update',
                    targetTag: isJs ? '<script>' : '<link>',
                    suggestion: isJs ? `<script src="${item.url}" defer>` : `<link rel="preload" href="${item.url}" as="style">`
                }
            })
        })
    }

    // 4. Optimized Images
    const imageAudits = ['modern-image-formats', 'uses-optimized-images', 'uses-responsive-images']
    imageAudits.forEach(auditId => {
        const audit = lhr.audits[auditId]
        if (audit && audit.score !== 1 && audit.details?.items) {
            audit.details.items.forEach(item => {
                totalFixableIssues++
                issues.push({
                    id: auditId,
                    title: audit.title,
                    file: item.url,
                    wastedKB: Math.round(item.wastedBytes / 1024),
                    impact: 'Medium',
                    severity: 'warning',
                    cause: 'Image is not optimized for web delivery.',
                    whyItMatters: 'Large images slow down load time and consume data.',
                    howToFix: [
                        'Convert to WebP or AVIF.',
                        'Compress the image using a tool like Sharp or ImageOptim.',
                        'Use responsive srcset attributes.'
                    ],
                    fixAction: {
                        canAutoFix: true,
                        patchType: 'image-conversion',
                        command: `cwebp -q 80 "input.jpg" -o "output.webp"`,
                        description: 'Convert this image to Next-Gen format.'
                    }
                })
            })
        }
    })

    // 5. CLS / Layout Shifts
    const cls = lhr.audits['layout-shift-elements']
    if (cls && cls.details?.items && cls.details.items.length > 0) {
        cls.details.items.forEach(item => {
            manualFixIsues++
            issues.push({
                id: 'layout-shift-elements',
                title: 'Cumulative Layout Shift (CLS)',
                element: item.node?.snippet || 'Unknown Element',
                score: item.score,
                impact: 'High',
                severity: 'warning',
                cause: 'Element changes size or position dynamically without reserved space.',
                whyItMatters: 'Layout shifts are annoying to users.',
                howToFix: [
                    'Set explicit width and height attributes on images/videos.',
                    'Reserve space for dynamic content (ads, banners).',
                    'Use CSS aspect-ratio.'
                ],
                fixAction: {
                    canAutoFix: false,
                    patchType: 'css-layout',
                    details: 'Add "min-height" or explicit dimensions to the container.'
                }
            })
        })
    }

    // 6. Server Response Time
    const ttfb = lhr.audits['server-response-time']
    if (ttfb && ttfb.score !== 1) {
        manualFixIsues++
        issues.push({
            id: 'server-response-time',
            title: 'Reduce Server Response Time (TTFB)',
            file: 'Server (Backend)',
            wastedMs: ttfb.numericValue,
            impact: 'High',
            severity: 'critical',
            cause: `Server took ${Math.round(ttfb.numericValue)}ms to respond.`,
            whyItMatters: 'Slow server response delays EVERYTHING.',
            howToFix: [
                'Optimize database queries.',
                'Implement server-side caching (Redis, Varnish).',
                'Upgrade server hardware or use a faster CDN.'
            ],
            fixAction: {
                canAutoFix: false,
                patchType: 'infrastructure',
                description: 'Check backend performance and cache config.'
            }
        })
    }

    // Sort issues by impact/wastedKB
    const sortedIssues = issues.sort((a, b) => (b.wastedKB || 0) - (a.wastedKB || 0))

    return {
        issues: sortedIssues,
        autoFixSummary: {
            totalFixable: totalFixableIssues,
            requiresManual: manualFixIsues,
            totalIssues: issues.length
        },
        fixPriorityList: sortedIssues.map((issue, idx) => ({
            priority: idx + 1,
            impact: issue.impact,
            issueId: issue.id,
            file: issue.file
        }))
    }
}
