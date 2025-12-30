import { useState, useRef } from 'react'
import html2pdf from 'html2pdf.js'
import { AlertCircle, AlertTriangle, Info, Download, Sparkles } from 'lucide-react'
import ScoreGauge from './ScoreGauge'
import AIAssistant from './AIAssistant'

export default function ResultsViewer({ results, type }) {
    const [activeTab, setActiveTab] = useState('overview')
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef(null)

    const handleDownload = () => {
        const element = reportRef.current
        if (!element) return

        setIsGenerating(true)

        const opt = {
            margin: 10,
            filename: `audit-report-${type}-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }

        html2pdf().set(opt).from(element).save().then(() => {
            setIsGenerating(false)
        }).catch(err => {
            console.error('PDF Generation Failed', err)
            setIsGenerating(false)
        })
    }

    // Normalize data for PageSpeed results
    const normalizedResults = type === 'pagespeed' ? {
        score: results.scores?.performance || 0,
        categories: results.scores || {},
        issues: (results.issues && results.issues.length > 0)
            ? results.issues.map(issue => ({
                severity: issue.severity,
                description: issue.title,
                element: issue.file || issue.element, // Map file path or element snippet
                impact: issue.wastedKB ? `${issue.wastedKB} KB wasted` : (issue.wastedMs ? `${issue.wastedMs} ms delay` : issue.impact),
                fix: issue.fixAction ? issue.fixAction.description : (Array.isArray(issue.howToFix) ? issue.howToFix[0] : issue.howToFix)
            }))
            : (results.opportunities || []).map(opp => ({
                severity: opp.savingsMs > 500 ? 'critical' : 'warning',
                description: opp.title,
                impact: `${opp.savingsMs}ms potential savings`,
                fix: opp.description
            }))
    } : results

    // Ensure issues array exists to prevent crashes
    const issues = normalizedResults?.issues || []

    // Use normalized structure for passing down
    // (We wrap this so we don't mutate props)
    const displayResults = type === 'pagespeed' ? { ...results, ...normalizedResults } : results

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical':
                return <AlertCircle className="w-5 h-5 text-status-error" />
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-status-warning" />
            default:
                return <Info className="w-5 h-5 text-primary" />
        }
    }

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'bg-status-error/20 text-status-error border-status-error'
            case 'warning':
                return 'bg-status-warning/20 text-status-warning border-status-warning'
            default:
                return 'bg-primary/20 text-primary border-primary'
        }
    }

    return (
        <div className="space-y-6">
            <div ref={reportRef} className="space-y-6 p-4 bg-surface-dark/50 rounded-xl"> {/* PDF Wrapper */}
                {/* Score Header */}
                <div className="bg-surface-card border border-surface-border rounded-xl p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Audit Results</h2>
                            <p className="text-gray-400">
                                {type === 'accessibility' && 'WCAG 2.1 Compliance Analysis'}
                                {type === 'website' && 'Design & Layout Quality Check'}
                                {type === 'pagespeed' && 'Performance & Core Web Vitals'}
                            </p>
                        </div>
                        <ScoreGauge score={displayResults.score} />
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
                    <div className="border-b border-surface-border">
                        <div className="flex gap-1 p-2">
                            {['overview', 'visual-audit', 'issues', 'categories', 'ai-insights'].map((tab) => {
                                if (tab === 'visual-audit' && type !== 'accessibility') return null;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab
                                            ? 'bg-primary text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-surface-dark'
                                            }`}
                                    >
                                        {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-surface-dark rounded-lg p-4 h-24 flex flex-col justify-center">
                                        <p className="text-sm text-gray-400 mb-1">Total Issues</p>
                                        <p className="text-2xl font-bold text-white">{issues.length}</p>
                                    </div>
                                    <div className="bg-surface-dark rounded-lg p-4 h-24 flex flex-col justify-center">
                                        <p className="text-sm text-gray-400 mb-1">Critical</p>
                                        <p className="text-2xl font-bold text-status-error">
                                            {issues.filter(i => i.severity === 'critical' || i.severity === 'error').length}
                                        </p>
                                    </div>
                                    <div className="bg-surface-dark rounded-lg p-4 h-24 flex flex-col justify-center">
                                        <p className="text-sm text-gray-400 mb-1">Warnings / Alerts</p>
                                        <p className="text-2xl font-bold text-status-warning">
                                            {issues.filter(i => i.severity === 'warning' || i.severity === 'alert').length}
                                        </p>
                                    </div>
                                </div>

                                {displayResults.screenshotUrl && (
                                    <div className="bg-surface-dark rounded-xl p-2 border border-surface-border">
                                        <p className="text-sm text-gray-400 mb-2 px-2">Page Preview</p>
                                        <div className="aspect-video overflow-hidden rounded-lg">
                                            <img
                                                src={displayResults.screenshotUrl}
                                                alt="Page Preview"
                                                className="w-full h-full object-cover object-top hover:object-bottom transition-all duration-[5000ms] cursor-ns-resize"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-lg font-bold text-white mb-3">Top Issues</h3>
                                    <div className="space-y-3">
                                        {issues.slice(0, 3).map((issue, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-4 bg-surface-dark rounded-lg h-24 overflow-hidden">
                                                {getSeverityIcon(issue.severity === 'error' ? 'critical' : issue.severity)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium mb-1 truncate">{issue.description}</p>
                                                    {issue.element && (
                                                        <code className="text-xs text-gray-400 bg-surface-card px-2 py-1 rounded truncate block">
                                                            {issue.element}
                                                        </code>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Visual Audit Tab (Accessibility Only) */}
                        {activeTab === 'visual-audit' && (
                            <div className="space-y-6">
                                <p className="text-gray-400">Visual mapping of accessibility violations on the page.</p>
                                <div className="relative border border-surface-border rounded-xl overflow-hidden bg-surface-dark">
                                    <img
                                        src={displayResults.screenshotUrl}
                                        alt="Full Page Audit"
                                        className="w-full block"
                                    />
                                    {/* Overlay highlights would go here, requiring coordinate mapping */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {issues.filter(i => i.coordinates).map((issue, idx) => (
                                            <div
                                                key={idx}
                                                className="absolute border-2 border-status-error bg-status-error/20 pointer-events-auto cursor-help group"
                                                style={{
                                                    left: `${(issue.coordinates.x / 1440) * 100}%`,
                                                    top: `${(issue.coordinates.y / (1440 * (displayResults.screenshotHeight / 1440))) * 100}%`, // This is tricky due to fullPage vs viewport
                                                    width: `${(issue.coordinates.width / 1440) * 100}%`,
                                                    height: `${(issue.coordinates.height / (displayResults.screenshotHeight || 5000)) * 100}%`
                                                }}
                                            >
                                                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-surface-card border border-surface-border rounded text-xs text-white whitespace-nowrap z-50 shadow-xl">
                                                    {issue.description}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Issues Tab */}
                        {activeTab === 'issues' && (
                            <div className="space-y-3">
                                {issues.map((issue, idx) => (
                                    <div key={idx} className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}>
                                        <div className="flex items-start gap-3">
                                            {getSeverityIcon(issue.severity)}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-surface-dark rounded text-xs font-medium uppercase">
                                                        {issue.severity}
                                                    </span>
                                                    {issue.wcag && (
                                                        <span className="text-xs text-gray-400">{issue.wcag} - {issue.rule}</span>
                                                    )}
                                                </div>
                                                {issue.screenshotUrl && (
                                                    <div className="mb-4 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 px-2 pt-1">Visual Context</p>
                                                        <img
                                                            src={issue.screenshotUrl}
                                                            alt="Issue isolation"
                                                            className="w-full h-40 object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <p className="text-white font-medium mb-2">{issue.description}</p>
                                                {issue.element && (
                                                    <code className="block text-sm bg-surface-dark p-2 rounded mb-2 overflow-x-auto">
                                                        {issue.element}
                                                    </code>
                                                )}
                                                {issue.fix && (
                                                    <div className="bg-status-success/10 border border-status-success/30 rounded p-3">
                                                        <p className="text-sm text-status-success font-medium mb-1">💡 Suggested Fix:</p>
                                                        <p className="text-sm text-gray-300">{issue.fix}</p>
                                                    </div>
                                                )}
                                                {issue.impact && (
                                                    <p className="text-sm text-gray-400 mt-2">
                                                        <strong>Impact:</strong> {issue.impact}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Categories Tab */}
                        {activeTab === 'categories' && (
                            <div className="space-y-4">
                                {Object.entries(displayResults.categories).map(([category, score]) => (
                                    <div key={category}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium capitalize">
                                                {category.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <span className={`font-bold ${score >= 80 ? 'text-status-success' :
                                                score >= 60 ? 'text-status-warning' :
                                                    'text-status-error'
                                                }`}>
                                                {score}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${score >= 80 ? 'bg-status-success' :
                                                    score >= 60 ? 'bg-status-warning' :
                                                        'bg-status-error'
                                                    }`}
                                                style={{ width: `${score}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AI Insights Tab */}
                        {activeTab === 'ai-insights' && (
                            <AIAssistant results={displayResults} type={type} />
                        )}
                    </div>
                </div>
            </div>

            {/* Export Button */}
            <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent-purple text-white rounded-lg font-medium hover:shadow-glow transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGenerating ? (
                    <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating PDF...
                    </span>
                ) : (
                    <>
                        <Download className="w-5 h-5" />
                        <span>Download Full Report (PDF)</span>
                    </>
                )}
            </button>
        </div>
    )
}
