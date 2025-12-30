import { useState } from 'react'
import {
    Upload,
    Loader2,
    FileText,
    Palette,
    Box,
    Zap,
    ShieldAlert,
    Download,
    FileJson,
    FileType,
    Layout
} from 'lucide-react'
import axios from 'axios'

export default function AutoDocs() {
    const [isLoading, setIsLoading] = useState(false)
    const [file, setFile] = useState(null)
    const [results, setResults] = useState(null)
    const [activeTab, setActiveTab] = useState('overview')

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile && selectedFile.name.endsWith('.zip')) {
            setFile(selectedFile)
        } else {
            alert('Please select a ZIP file')
        }
    }

    const handleGenerate = async () => {
        if (!file) {
            alert('Please select a ZIP file first')
            return
        }

        setIsLoading(true)
        setResults(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await axios.post('/api/audit/docs', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            setResults(response.data)
        } catch (error) {
            console.error('Documentation generation failed:', error)
            setResults({
                error: true,
                message: error.response?.data?.error || error.message || 'Failed to generate documentation. Please try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const downloadFile = (content, filename, type = 'text/plain') => {
        const blob = new Blob([content], { type })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const downloadPDF = (base64, filename) => {
        const linkSource = `data:application/pdf;base64,${base64}`
        const downloadLink = document.createElement("a")
        downloadLink.href = linkSource
        downloadLink.download = filename
        downloadLink.click()
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FileText },
        { id: 'design', label: 'Design System', icon: Palette },
        { id: 'components', label: 'Components', icon: Box },
        { id: 'interactions', label: 'Interactions', icon: Zap },
        { id: 'accessibility', label: 'Accessibility', icon: ShieldAlert },
    ]

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Auto Documentation Generator</h1>
                    <p className="text-gray-400">Transform raw code into developer-ready documentation in seconds</p>
                </div>
                {results && !results.error && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => downloadFile(results.exports.html, 'documentation.html', 'text/html')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark text-white rounded-lg text-sm border border-surface-border hover:border-primary transition-all"
                        >
                            <FileType className="w-4 h-4 text-accent-teal" /> HTML
                        </button>
                        <button
                            onClick={() => downloadPDF(results.exports.pdf, 'documentation.pdf')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark text-white rounded-lg text-sm border border-surface-border hover:border-primary transition-all"
                        >
                            <FileText className="w-4 h-4 text-red-400" /> PDF
                        </button>
                        <button
                            onClick={() => downloadFile(results.exports.markdown, 'documentation.md')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark text-white rounded-lg text-sm border border-surface-border hover:border-primary transition-all"
                        >
                            <FileText className="w-4 h-4 text-blue-400" /> MD
                        </button>
                        <button
                            onClick={() => downloadFile(results.exports.json, 'documentation.json', 'application/json')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark text-white rounded-lg text-sm border border-surface-border hover:border-primary transition-all"
                        >
                            <FileJson className="w-4 h-4 text-yellow-400" /> JSON
                        </button>
                    </div>
                )}
            </div>

            {!results && (
                <div className="bg-surface-card border border-surface-border rounded-xl p-8 space-y-6 max-w-2xl mx-auto mt-10">
                    <div className="text-center">
                        <Upload className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                        <h2 className="text-xl font-bold text-white mb-2">Upload Project Source</h2>
                        <p className="text-gray-400">Select a ZIP file containing your HTML, CSS, and JS files</p>
                    </div>

                    <div className="border-2 border-dashed border-surface-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer group bg-surface-dark/30">
                        <p className="text-white font-medium mb-2">
                            {file ? `✅ ${file.name}` : 'Drop ZIP here or click browse'}
                        </p>
                        <p className="text-xs text-gray-400 mb-6">Maximum file size: 50MB</p>
                        <input
                            type="file"
                            accept=".zip"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="inline-block px-6 py-2.5 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/80 transition-all font-medium"
                        >
                            Choose File
                        </label>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={!file || isLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary to-accent-purple text-white rounded-xl font-bold hover:shadow-glow transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>Analyzing Codebase...</span>
                            </>
                        ) : (
                            <span>Generate Documentation</span>
                        )}
                    </button>
                </div>
            )}

            {results && !results.error && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-wrap gap-2 p-1 bg-surface-dark rounded-xl border border-surface-border w-fit">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-glow'
                                    : 'text-gray-400 hover:text-white hover:bg-surface-card'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="bg-surface-card border border-surface-border rounded-xl min-h-[500px]">
                        {activeTab === 'overview' && (
                            <div className="p-6 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-4 bg-surface-dark rounded-xl border border-surface-border">
                                        <p className="text-gray-400 text-sm mb-1">Tech Stack</p>
                                        <div className="flex flex-wrap gap-2">
                                            {results.overview.techStack?.map(tech => (
                                                <span key={tech} className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-bold border border-primary/30">{tech}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-surface-dark rounded-xl border border-surface-border">
                                        <p className="text-gray-400 text-sm mb-1">Entry Points</p>
                                        <p className="text-white font-medium">{results.overview.entryPoints?.join(', ')}</p>
                                    </div>
                                    <div className="p-4 bg-surface-dark rounded-xl border border-surface-border">
                                        <p className="text-gray-400 text-sm mb-1">Total Files</p>
                                        <p className="text-white font-bold text-xl">{results.overview.totalFiles}</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Layout className="w-5 h-5 text-primary" /> Folder Structure
                                    </h3>
                                    <pre className="bg-black/40 p-6 rounded-xl border border-surface-border text-gray-300 text-sm font-mono overflow-x-auto">
                                        {results.overview.folderStructure}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {activeTab === 'design' && (
                            <div className="p-6 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-4">Color Palette</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                        {results.designSystem.colors.map((color, idx) => (
                                            <div key={idx} className="group flex flex-col items-center">
                                                <div
                                                    className="w-full aspect-square rounded-xl shadow-lg mb-2 border border-white/10 group-hover:scale-105 transition-transform"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <code className="text-xs text-gray-400 group-hover:text-primary">{color}</code>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-4">Typography</h3>
                                        <div className="space-y-4">
                                            <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
                                                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">Font Families</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {results.designSystem.typography.families.map(f => (
                                                        <span key={f} className="text-white font-medium bg-surface-card px-3 py-1 rounded border border-surface-border text-sm">{f}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-surface-dark rounded-lg border border-border">
                                                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">Font Sizes</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {results.designSystem.typography.sizes.map(s => (
                                                        <span key={s} className="text-white font-medium bg-surface-card px-2 py-0.5 rounded border border-surface-border text-sm">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-4">Spacing & Layout</h3>
                                        <div className="space-y-4">
                                            <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
                                                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">Media Queries</p>
                                                <div className="space-y-1">
                                                    {results.designSystem.breakpoints.map(m => (
                                                        <code key={m} className="block text-accent-teal text-xs">{m}</code>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
                                                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">Spacing Scale</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {results.designSystem.spacing.map(s => (
                                                        <span key={s} className="text-gray-300 text-xs bg-surface-card px-2 py-1 rounded">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'components' && (
                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {results.components?.map((component, idx) => (
                                        <div key={idx} className="bg-surface-dark rounded-xl border border-surface-border overflow-hidden flex flex-col">
                                            <div className="p-4 border-b border-surface-border flex items-center justify-between bg-white/[0.02]">
                                                <div>
                                                    <h4 className="text-white font-bold">{component.name}</h4>
                                                    <p className="text-xs text-gray-400">{component.sourceFile}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-primary/20 text-primary rounded text-[10px] font-bold uppercase tracking-tight truncate max-w-[100px]">{component.type}</span>
                                            </div>
                                            <div className="p-4 space-y-4 flex-1">
                                                <div className="space-y-2">
                                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">HTML Structure</p>
                                                    <pre className="bg-black/40 p-4 rounded-lg text-[11px] text-accent-teal border border-white/5 overflow-x-auto max-h-40">
                                                        <code>{component.html}</code>
                                                    </pre>
                                                </div>
                                                {component.aiGuide && (
                                                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                                                        <p className="text-xs text-primary font-bold mb-1 flex items-center gap-1">
                                                            <Zap className="w-3 h-3" /> Usage Guide
                                                        </p>
                                                        <p className="text-sm text-gray-300 leading-relaxed italic">{component.aiGuide}</p>
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-1">
                                                    {component.classes?.map(cls => (
                                                        <span key={cls} className="text-[10px] text-gray-400 bg-surface-card px-1.5 py-0.5 rounded border border-surface-border">.{cls}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'interactions' && (
                            <div className="p-6">
                                <div className="space-y-4">
                                    {results.interactions?.length > 0 ? (
                                        results.interactions.map((interaction, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-4 bg-surface-dark rounded-xl border border-surface-border">
                                                <div className={`p-3 rounded-lg ${interaction.type === 'EventListener' ? 'bg-accent-teal/10 text-accent-teal' :
                                                    interaction.type === 'NetworkAPI' ? 'bg-primary/10 text-primary' :
                                                        'bg-yellow-400/10 text-yellow-400'
                                                    }`}>
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{interaction.type}</p>
                                                    <p className="text-sm text-gray-400">
                                                        {interaction.event ? `Trigger: ${interaction.event}` : interaction.detail}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">Source: {interaction.file}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20">
                                            <p className="text-gray-400">No dynamic interactions detected in source files.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'accessibility' && (
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-8 p-6 bg-surface-dark rounded-xl border border-surface-border">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="64" cy="64" r="58"
                                                fill="transparent"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                className="text-surface-border"
                                            />
                                            <circle
                                                cx="64" cy="64" r="58"
                                                fill="transparent"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                strokeDasharray={364}
                                                strokeDashoffset={364 - (364 * results.accessibility.score) / 100}
                                                className={results.accessibility.score > 80 ? 'text-accent-teal' : results.accessibility.score > 50 ? 'text-yellow-400' : 'text-red-400'}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-white">{results.accessibility.score}</span>
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Score</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Accessibility Report</h3>
                                        <p className="text-gray-400 max-w-md italic">
                                            Our audit identified {results.accessibility.issues.length} potential issues based on WCAG 2.1 standards.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {results.accessibility.issues?.map((issue, idx) => (
                                        <div key={idx} className="p-4 bg-surface-dark rounded-xl border border-surface-border flex items-start gap-4">
                                            <div className={`mt-1 p-1 rounded ${issue.severity === 'High' ? 'bg-red-400/10 text-red-400' : 'bg-yellow-400/10 text-yellow-400'
                                                }`}>
                                                <ShieldAlert className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-white font-medium">{issue.message}</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${issue.severity === 'High' ? 'bg-red-400/20 text-red-400' : 'bg-yellow-400/20 text-yellow-400'
                                                        }`}>{issue.severity}</span>
                                                </div>
                                                <pre className="text-[11px] text-gray-500 bg-black/20 p-2 rounded mt-2 border border-white/5 truncate">
                                                    <code>{issue.element}</code>
                                                </pre>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center pt-8">
                        <button
                            onClick={() => {
                                setResults(null)
                                setActiveTab('overview')
                                setFile(null)
                            }}
                            className="px-6 py-2 bg-surface-dark text-gray-400 rounded-lg hover:text-white transition-colors border border-surface-border"
                        >
                            Process New Project
                        </button>
                    </div>
                </div>
            )}

            {results && results.error && (
                <div className="bg-surface-card border border-red-500/50 rounded-xl p-8 max-w-xl mx-auto text-center mt-10">
                    <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Processing Failed</h2>
                    <p className="text-red-400 mb-6">{results.message}</p>
                    <button
                        onClick={() => setResults(null)}
                        className="px-6 py-2 bg-surface-dark text-white rounded-lg hover:bg-surface-border transition-colors border border-surface-border"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    )
}
