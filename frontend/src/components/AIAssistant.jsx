import { useState } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'

export default function AIAssistant({ results, type }) {
    const [copied, setCopied] = useState(false)

    const generateSummary = () => {
        const criticalCount = results.issues.filter(i => i.severity === 'critical').length
        const warningCount = results.issues.filter(i => i.severity === 'warning').length

        if (type === 'accessibility') {
            return `This page has ${criticalCount} critical accessibility violations and ${warningCount} warnings. The main issues are related to missing alt text, insufficient color contrast, and keyboard accessibility. Addressing these issues will significantly improve the experience for users with disabilities.`
        }

        if (type === 'website') {
            return `The website audit revealed ${criticalCount} critical design issues and ${warningCount} warnings. Key problems include inconsistent spacing, typography mismatches, and layout alignment issues. Fixing these will create a more polished and professional appearance.`
        }

        if (type === 'pagespeed') {
            return `Performance analysis shows a score of ${results.score}/100. The site has good Core Web Vitals but could benefit from optimizing render-blocking resources and removing unused JavaScript. These improvements will enhance user experience and SEO rankings.`
        }

        return 'AI analysis complete.'
    }

    const generateClientReport = () => {
        return `# Quality Audit Summary

**Overall Score:** ${results.score}/100

## Key Findings
- ${results.issues.length} total issues detected
- ${results.issues.filter(i => i.severity === 'critical').length} require immediate attention
- ${results.issues.filter(i => i.severity === 'warning').length} should be addressed soon

## Recommendations
${results.issues.slice(0, 3).map((issue, idx) =>
            `${idx + 1}. ${issue.description}\n   - Fix: ${issue.fix || 'See detailed report'}`
        ).join('\n')}

## Next Steps
We recommend prioritizing the critical issues first, then addressing warnings in the next sprint.`
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(generateClientReport())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-6">
            {/* AI Summary */}
            <div className="bg-gradient-to-br from-accent-purple/20 to-primary/20 border border-accent-purple/30 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">AI Analysis</h3>
                        <p className="text-gray-300 leading-relaxed">{generateSummary()}</p>
                    </div>
                </div>
            </div>

            {/* Code Fixes */}
            <div>
                <h3 className="text-lg font-bold text-white mb-3">Suggested Code Fixes</h3>
                <div className="space-y-3">
                    {results.issues.slice(0, 2).map((issue, idx) => (
                        issue.fix && (
                            <div key={idx} className="bg-surface-dark rounded-lg p-4">
                                <p className="text-sm text-gray-400 mb-2">{issue.description}</p>
                                <div className="bg-surface-card rounded p-3 font-mono text-sm text-status-success">
                                    {issue.fix}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            </div>

            {/* Client Report */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white">Client-Friendly Report</h3>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark hover:bg-surface-border rounded-lg text-sm text-gray-300 transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-status-success" />
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="bg-surface-dark rounded-lg p-4">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                        {generateClientReport()}
                    </pre>
                </div>
            </div>

            {/* Manager Summary */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <h4 className="text-sm font-bold text-primary mb-2">📊 Executive Summary</h4>
                <p className="text-sm text-gray-300">
                    Quality score: <strong className="text-white">{results.score}/100</strong>.
                    {results.score >= 80 ? ' Excellent work! Minor improvements recommended.' :
                        results.score >= 60 ? ' Good foundation, but needs attention in key areas.' :
                            ' Significant improvements required before launch.'}
                </p>
            </div>
        </div>
    )
}
