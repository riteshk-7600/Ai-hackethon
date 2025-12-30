import { useState } from 'react'
import { Play, Loader2, Mail, ShieldCheck, Monitor, Sun, Moon, AlertCircle, CheckCircle, Info, ChevronRight, Share2, Zap, Smartphone } from 'lucide-react'
import axios from 'axios'

export default function NewsletterTester() {
    const [emailHtml, setEmailHtml] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [fixResults, setFixResults] = useState(null)
    const [isFixing, setIsFixing] = useState(false)
    const [testDarkMode, setTestDarkMode] = useState(true)
    const [checkSpam, setCheckSpam] = useState(true)

    const handleTest = async () => {
        setIsLoading(true)
        setResults(null)

        try {
            const response = await axios.post('/api/audit/newsletter', {
                emailHtml,
                options: {
                    testDarkMode,
                    checkSpam
                }
            })

            setResults(response.data)
        } catch (error) {
            console.error('Newsletter test failed:', error)
            setResults({
                error: true,
                message: error.response?.data?.error || error.message || 'Failed to test newsletter. Please try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleAutoFix = async () => {
        setIsFixing(true)
        setFixResults(null)
        try {
            const response = await axios.post('/api/audit/newsletter/fix', { emailHtml })
            if (response.data.ok) {
                setFixResults(response.data)
            }
        } catch (error) {
            console.error('Auto-fix failed:', error)
        } finally {
            setIsFixing(false)
        }
    }

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Newsletter Tester</h1>
                <p className="text-gray-400">Test email templates for compatibility and accessibility</p>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email HTML</label>
                    <textarea
                        value={emailHtml}
                        onChange={(e) => setEmailHtml(e.target.value)}
                        placeholder="Paste your email HTML here..."
                        rows={10}
                        className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder-gray-500 focus-ring font-mono text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                className="rounded"
                                checked={testDarkMode}
                                onChange={(e) => setTestDarkMode(e.target.checked)}
                            />
                            Test Dark Mode
                        </label>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                className="rounded"
                                checked={checkSpam}
                                onChange={(e) => setCheckSpam(e.target.checked)}
                            />
                            Check Spam Score
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleTest}
                        disabled={!emailHtml || isLoading || isFixing}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent-purple text-white rounded-lg font-medium hover:shadow-glow transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Testing...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                <span>Run Test</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleAutoFix}
                        disabled={!emailHtml || isLoading || isFixing}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent-teal/20 text-accent-teal border border-accent-teal/30 rounded-lg font-medium hover:bg-accent-teal/30 transition-all btn-lift disabled:opacity-50"
                    >
                        {isFixing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Healing...</span>
                            </>
                        ) : (
                            <>
                                <Zap className="w-5 h-5" />
                                <span>Auto Fix & Optimize</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {fixResults && (
                <div className="bg-surface-card border-2 border-accent-teal/50 rounded-xl p-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-accent-teal/10 rounded-full">
                                <CheckCircle className="text-accent-teal w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">HTML Auto-Fixed Successfully</h3>
                                <p className="text-gray-400 text-sm">Our AI Architect has repaired your code structure and optimized it for all major clients.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setEmailHtml(fixResults.fixedHtml)
                                setFixResults(null)
                            }}
                            className="px-4 py-2 bg-accent-teal text-black font-bold rounded-lg hover:shadow-glow transition-all"
                        >
                            Apply Fixed Code to Editor
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-surface-dark p-4 rounded-xl border border-white/5 text-center">
                            <div className="text-accent-teal font-black text-xl">{fixResults.summary.tagsClosed}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Tags Repaired</div>
                        </div>
                        <div className="bg-surface-dark p-4 rounded-xl border border-white/5 text-center">
                            <div className="text-accent-teal font-black text-xl">{fixResults.summary.structuralFixes}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Nesting Fixed</div>
                        </div>
                        <div className="bg-surface-dark p-4 rounded-xl border border-white/5 text-center">
                            <div className="text-accent-teal font-black text-xl">{fixResults.summary.cssNormalizations}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">CSS Normalized</div>
                        </div>
                        <div className="bg-surface-dark p-4 rounded-xl border border-white/5 text-center">
                            <div className="text-accent-teal font-black text-xl">{fixResults.summary.accessibilityFixes}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">ADA Repaired</div>
                        </div>
                        <div className="bg-surface-dark p-4 rounded-xl border border-white/5 text-center">
                            <div className="text-accent-teal font-black text-xl">{fixResults.summary.outlookHardening}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Outlook Hardened</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Optimized Production Code</span>
                            <button
                                onClick={() => handleCopy(fixResults.fixedHtml)}
                                className="text-xs text-accent-teal font-bold hover:underline underline-offset-4"
                            >
                                Copy Fixed HTML
                            </button>
                        </div>
                        <pre className="p-6 bg-black rounded-xl border border-white/10 text-[11px] font-mono leading-relaxed text-blue-300 overflow-x-auto max-h-[400px]">
                            {fixResults.fixedHtml}
                        </pre>
                    </div>
                </div>
            )}

            {results && !results.error && (
                <div className="space-y-6">
                    {/* Summary Header */}
                    <div className="bg-surface-card border border-surface-border rounded-xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Mail className="w-40 h-40 text-primary" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <h3 className="text-xl font-bold text-white mb-2">Email Quality Score</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-purple tracking-tighter">
                                        {results.score}
                                    </span>
                                    <span className="text-gray-500 font-bold">/100</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-6 py-4 bg-surface-dark rounded-xl border border-surface-border text-center">
                                    <div className="text-sm text-gray-400 mb-1">Issues</div>
                                    <div className="text-2xl font-bold text-white">{results.issues.length}</div>
                                </div>
                                <div className="px-6 py-4 bg-surface-dark rounded-xl border border-surface-border text-center">
                                    <div className="text-sm text-gray-400 mb-1">Spam Risk</div>
                                    <div className={`text-2xl font-bold ${results.issues.some(i => i.category === 'Spam Risk') ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {results.issues.some(i => i.category === 'Spam Risk') ? 'Medium' : 'Low'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Previews */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Light Mode */}
                        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-lg">
                            <div className="p-3 bg-white text-gray-900 flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-xs">
                                    <Sun size={14} /> LIGHT MODE PREVIEW
                                </div>
                                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">600px</span>
                            </div>
                            <div className="bg-white p-1 max-h-[600px] overflow-y-auto scrollbar-thin">
                                <img src={results.screenshots?.light} className="w-full h-auto" alt="Light Mode" />
                            </div>
                        </div>

                        {/* Dark Mode */}
                        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-lg">
                            <div className="p-3 bg-black text-white flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-2 font-bold text-xs">
                                    <Moon size={14} className="text-primary" /> DARK MODE PREVIEW
                                </div>
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded">600px</span>
                            </div>
                            <div className="bg-black p-1 max-h-[600px] overflow-y-auto scrollbar-thin">
                                <img src={results.screenshots?.dark} className="w-full h-auto" alt="Dark Mode" />
                            </div>
                        </div>
                    </div>

                    {/* Detailed Issues */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="text-primary" /> Audit Findings
                        </h3>
                        <div className="space-y-4">
                            {results.issues.map((issue, idx) => (
                                <div key={idx} className="bg-surface-card border border-surface-border rounded-xl hover:border-primary/50 transition-all overflow-hidden flex flex-col md:flex-row">
                                    {/* Left Side: Info */}
                                    <div className="flex-1 p-6 border-r border-surface-border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${issue.severity === 'critical' ? 'bg-red-500/10 text-red-400' :
                                                issue.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {issue.type || issue.category}
                                            </span>
                                            <span className="text-gray-600 text-[10px] font-bold">L{issue.line || '??'}</span>
                                        </div>

                                        <h4 className="text-white font-bold text-lg mb-2">{issue.description}</h4>
                                        <p className="text-gray-400 text-sm mb-4 leading-relaxed">{issue.impact}</p>

                                        <div className="flex flex-wrap gap-4 mt-auto">
                                            <div className="flex items-center gap-4 border border-surface-border rounded-lg px-4 py-2 bg-surface-dark/50">
                                                <div className="flex flex-col items-center">
                                                    <Monitor className={`w-4 h-4 mb-1 ${issue.clients?.outlook === true ? 'text-green-400' : issue.clients?.outlook === 'partial' ? 'text-yellow-400' : 'text-red-400'}`} />
                                                    <span className="text-[8px] text-gray-500 font-bold uppercase">Outlook</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <Monitor className={`w-4 h-4 mb-1 ${issue.clients?.gmail === true ? 'text-green-400' : issue.clients?.gmail === 'partial' ? 'text-yellow-400' : 'text-red-400'}`} />
                                                    <span className="text-[8px] text-gray-500 font-bold uppercase">Gmail</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <Smartphone className={`w-4 h-4 mb-1 ${issue.clients?.apple === true ? 'text-green-400' : issue.clients?.apple === 'partial' ? 'text-yellow-400' : 'text-red-400'}`} />
                                                    <span className="text-[8px] text-gray-500 font-bold uppercase">iOS Mail</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Code & Fix */}
                                    <div className="w-full md:w-[450px] bg-black/40 p-6 flex flex-col">
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase">Detected Code</span>
                                                <span className="text-[10px] text-gray-700 font-mono">Line {issue.line}</span>
                                            </div>
                                            <pre className="bg-surface-dark p-3 rounded-lg border border-white/5 text-[11px] font-mono text-accent-teal overflow-x-auto">
                                                <code>{issue.snippet || '<!-- code snippet not available -->'}</code>
                                            </pre>
                                        </div>

                                        <div className="mt-auto bg-primary/5 border border-primary/20 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2 text-primary">
                                                <Zap size={14} />
                                                <span className="text-[10px] font-bold uppercase">Pro Fix Strategy</span>
                                            </div>
                                            <p className="text-xs text-gray-300 leading-relaxed italic">
                                                {issue.recommendation || issue.fix}
                                            </p>
                                            {issue.fix && (
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(issue.fix)}
                                                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 bg-primary/20 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/30 transition-all border border-primary/30"
                                                >
                                                    Copy Improved Code
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {results && results.error && (
                <div className="bg-surface-card border border-red-500/50 rounded-xl p-6">
                    <p className="text-red-400">{results.message}</p>
                </div>
            )}
        </div>
    )
}
