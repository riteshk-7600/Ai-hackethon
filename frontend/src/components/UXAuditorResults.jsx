import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Copy, Check, Download, Maximize2, Zap, ArrowUpRight } from 'lucide-react'

export default function UXAuditorResults({ results }) {
    const [activeTab, setActiveTab] = useState('all')
    const [copiedIndex, setCopiedIndex] = useState(null)
    const [copiedCSS, setCopiedCSS] = useState(false)

    if (!results) return null

    const tabs = [
        { id: 'all', label: 'All Issues', count: results.issues.length },
        { id: 'layout', label: 'Layout', count: results.layoutIssues?.length || 0 },
        { id: 'spacing', label: 'Spacing', count: results.spacingIssues?.length || 0 },
        { id: 'typography', label: 'Typography', count: results.typographyIssues?.length || 0 },
        { id: 'colors', label: 'Colors', count: results.colorIssues?.length || 0 },
        { id: 'components', label: 'Components', count: results.componentIssues?.length || 0 },
        { id: 'critical', label: 'Critical', count: results.criticalViolations?.length || 0 }
    ]

    const getActiveIssues = () => {
        switch (activeTab) {
            case 'layout': return results.layoutIssues || []
            case 'spacing': return results.spacingIssues || []
            case 'typography': return results.typographyIssues || []
            case 'colors': return results.colorIssues || []
            case 'components': return results.componentIssues || []
            case 'critical': return results.criticalViolations || []
            default: return results.issues || []
        }
    }

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50'
            case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
            case 'minor': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
        }
    }

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical': return <XCircle className="w-5 h-5" />
            case 'warning': return <AlertCircle className="w-5 h-5" />
            default: return <CheckCircle className="w-5 h-5" />
        }
    }

    const copyToClipboard = async (text, index) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedIndex(index)
            setTimeout(() => setCopiedIndex(null), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const copyCSSPatch = async () => {
        try {
            await navigator.clipboard.writeText(results.finalCSSPatch)
            setCopiedCSS(true)
            setTimeout(() => setCopiedCSS(false), 2000)
        } catch (err) {
            console.error('Failed to copy CSS:', err)
        }
    }

    const downloadCSS = () => {
        const blob = new Blob([results.finalCSSPatch], { type: 'text/css' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ux-audit-fixes.css'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const activeIssues = getActiveIssues()

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-surface-card border border-surface-border rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white mb-1">{results.score}</div>
                        <div className="text-sm text-gray-400">Overall Score</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-semibold text-primary mb-1">{results.platform}</div>
                        <div className="text-sm text-gray-400">Platform</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-semibold text-accent-purple mb-1">{results.issues.length}</div>
                        <div className="text-sm text-gray-400">Total Issues</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-semibold text-red-400 mb-1">{results.criticalViolations?.length || 0}</div>
                        <div className="text-sm text-gray-400">Critical</div>
                    </div>
                </div>

                {/* Category Scores */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(results.categories || {}).map(([key, value]) => (
                        <div key={key} className="bg-surface-dark rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300 capitalize">{key}</span>
                                <span className={`text-lg font-semibold ${value >= 80 ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {Math.round(value)}
                                </span>
                            </div>
                            <div className="mt-2 h-2 bg-surface-border rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-primary to-accent-purple text-white'
                            : 'bg-surface-card text-gray-400 hover:text-white border border-surface-border'
                            }`}
                    >
                        {tab.label} {tab.count > 0 && `(${tab.count})`}
                    </button>
                ))}
            </div>

            {/* Issues List */}
            <div className="space-y-4">
                {activeIssues.length === 0 ? (
                    <div className="bg-surface-card border border-surface-border rounded-xl p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                        <p className="text-gray-400">No issues found in this category!</p>
                    </div>
                ) : (
                    activeIssues.map((issue, index) => (
                        <IssueCard
                            key={index}
                            issue={issue}
                            index={index}
                            copiedIndex={copiedIndex}
                            onCopy={copyToClipboard}
                            getSeverityColor={getSeverityColor}
                            getSeverityIcon={getSeverityIcon}
                        />
                    ))
                )}
            </div>

            {/* CSS Patch Section */}
            {results.finalCSSPatch && (
                <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-accent-purple p-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            🎨 Complete CSS Fix Patch
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={copyCSSPatch}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-all"
                            >
                                {copiedCSS ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copiedCSS ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                                onClick={downloadCSS}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Download
                            </button>
                        </div>
                    </div>
                    <div className="p-4 bg-surface-dark">
                        <pre className="text-sm text-gray-300 overflow-x-auto max-h-96">
                            <code>{results.finalCSSPatch}</code>
                        </pre>
                    </div>
                </div>
            )}

            {/* Full Page Analysis Preview */}
            {(results.fullScreenshotUrl || results.screenshot) && (
                <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-2xl">
                    <div className="p-4 bg-gradient-to-r from-primary to-accent-purple flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <h3 className="text-lg font-semibold text-white">Pixel-Perfect Scan Result</h3>
                        </div>
                        <span className="text-xs text-white/70 font-mono">{results.metadata?.url}</span>
                    </div>
                    <div className="p-1 bg-surface-dark relative max-h-[600px] overflow-y-auto scrollbar-thin">
                        <img
                            src={results.fullScreenshotUrl || (results.screenshot?.startsWith('http') ? results.screenshot : `data:image/png;base64,${results.screenshot}`)}
                            alt="Full Page Scan"
                            className="w-full h-auto"
                        />

                        {/* Overlays for critical issues could go here, but for now we'll show them in cards */}
                    </div>
                </div>
            )}
        </div>
    )
}

function IssueCard({ issue, index, copiedIndex, onCopy, getSeverityColor, getSeverityIcon }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className={`bg-surface-card border rounded-xl overflow-hidden ${getSeverityColor(issue.severity)}`}>
            <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-all"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start gap-3">
                    <div className="mt-1">
                        {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-white/10 mb-2">
                                    {issue.category || issue.type}
                                </span>
                                <h4 className="font-semibold text-white">{issue.description}</h4>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded uppercase font-medium ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                            </span>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                            <div><span className="font-medium">Element:</span> {issue.element}</div>
                            <div><span className="font-medium">Current Value:</span> {issue.liveValue}</div>
                        </div>
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                    <div className="pt-4">
                        <div className="text-sm font-medium text-white mb-2">💡 Recommendation</div>
                        <p className="text-sm text-gray-300">{issue.recommendation}</p>
                    </div>

                    {issue.screenshotUrl && (
                        <div className="mb-4">
                            <div className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                                <Maximize2 size={14} className="text-primary" /> Visual Evidence
                            </div>
                            <div className="relative rounded-lg overflow-hidden border border-white/10 group bg-black/40">
                                <img
                                    src={issue.screenshotUrl}
                                    className="w-full h-auto max-h-[300px] object-contain transition-transform duration-500 group-hover:scale-105"
                                    alt="Issue Evidence"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {issue.cssFix && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-white">🔧 CSS Fix</div>
                                <button
                                    onClick={() => onCopy(issue.cssFix, index)}
                                    className="px-3 py-1 bg-primary/20 hover:bg-primary/30 rounded text-xs text-primary flex items-center gap-1 transition-all"
                                >
                                    {copiedIndex === index ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {copiedIndex === index ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <pre className="bg-surface-dark rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                                <code>{issue.cssFix}</code>
                            </pre>
                        </div>
                    )}

                    {issue.cssSelector && (
                        <div>
                            <div className="text-sm font-medium text-white mb-2">🎯 CSS Selector</div>
                            <code className="text-xs bg-surface-dark px-2 py-1 rounded text-accent-purple">
                                {issue.cssSelector}
                            </code>
                        </div>
                    )}

                    {issue.aiExplanation && (
                        <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-3">
                            <div className="text-sm font-medium text-accent-purple mb-2">🤖 AI Insight</div>
                            <p className="text-sm text-gray-300">{issue.aiExplanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
