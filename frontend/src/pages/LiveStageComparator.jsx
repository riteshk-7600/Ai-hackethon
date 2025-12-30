import { useState, useRef, useEffect, useMemo } from 'react'
import {
    Play,
    Loader2,
    ArrowLeftRight,
    AlertTriangle,
    CheckCircle2,
    Info,
    Monitor,
    Smartphone,
    Tablet as TabletIcon,
    Terminal,
    Eye,
    Layout,
    Type,
    Palette,
    Image as ImageIcon,
    ChevronRight,
    ChevronLeft,
    Search,
    Maximize2,
    Layers,
    Map as MapIcon,
    Focus
} from 'lucide-react'
import axios from 'axios'

export default function LiveStageComparator() {
    // --- State ---
    const [liveUrl, setLiveUrl] = useState('')
    const [stageUrl, setStageUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [viewport, setViewport] = useState('desktop')
    const [results, setResults] = useState(null)
    const [viewMode, setViewMode] = useState('side-by-side') // side-by-side, slider, diff-map
    const [activeSection, setActiveSection] = useState('all')
    const [activeCategory, setActiveCategory] = useState('all')
    const [selectedDiffIndex, setSelectedDiffIndex] = useState(null)
    const [sliderPos, setSliderPos] = useState(50)
    const [inspectorTab, setInspectorTab] = useState('inspector') // inspector, system

    // --- Refs for Synced Scrolling ---
    const leftPaneRef = useRef(null)
    const rightPaneRef = useRef(null)
    const isSyncing = useRef(false)

    // --- Helpers ---
    const viewportSizes = {
        desktop: { width: 1440, height: 900 },
        tablet: { width: 768, height: 1024 },
        mobile: { width: 375, height: 812 }
    }

    const filteredDiffs = useMemo(() => {
        if (!results) return []
        return results.differences.filter(d => {
            const matchesSection = activeSection === 'all' || d.section === activeSection
            const matchesCategory = activeCategory === 'all' || d.category === activeCategory
            return matchesSection && matchesCategory
        })
    }, [results, activeSection, activeCategory])

    const sections = useMemo(() => {
        if (!results) return []
        return ['all', ...new Set(results.differences.map(d => d.section))]
    }, [results])

    // --- Handlers ---
    const handleCompare = async () => {
        setIsLoading(true)
        setResults(null)
        setSelectedDiffIndex(null)

        try {
            const response = await axios.post('/api/audit/compare-layout', {
                liveUrl,
                stageUrl,
                screenshot: true,
                viewport: viewportSizes[viewport]
            })

            const data = response.data
            setResults(data)

            // Auto-focus first difference
            if (data.differences?.length > 0) {
                setTimeout(() => focusDiff(0), 500)
            }
        } catch (error) {
            console.error('Comparison failed:', error)
            setResults({ error: true, message: error.response?.data?.error || error.message || 'Failed to compare environments.' })
        } finally {
            setIsLoading(false)
        }
    }

    const syncScroll = (source, target) => {
        if (!isSyncing.current && target) {
            isSyncing.current = true

            const sourceMaxScroll = source.scrollHeight - source.clientHeight
            const targetMaxScroll = target.scrollHeight - target.clientHeight

            if (sourceMaxScroll > 0 && targetMaxScroll > 0) {
                const scrollRatio = source.scrollTop / sourceMaxScroll
                target.scrollTop = scrollRatio * targetMaxScroll
            }

            target.scrollLeft = source.scrollLeft
            setTimeout(() => { isSyncing.current = false }, 10)
        }
    }

    const focusDiff = (index) => {
        setSelectedDiffIndex(index)
        const diff = filteredDiffs[index]
        if (!diff || !leftPaneRef.current) return

        const scrollTarget = diff.liveRect.y - 200
        leftPaneRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' })
        rightPaneRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' })
    }

    const getHighlightColor = (category) => {
        switch (category) {
            case 'structure': return 'rgba(239, 68, 68, 0.4)' // Red
            case 'spacing': return 'rgba(234, 179, 8, 0.4)'    // Yellow
            case 'typography': return 'rgba(59, 130, 246, 0.4)' // Blue
            case 'color': return 'rgba(168, 85, 247, 0.4)'     // Purple
            default: return 'rgba(255, 255, 255, 0.2)'
        }
    }

    const getHighlightBorder = (category) => {
        switch (category) {
            case 'structure': return '#ef4444'
            case 'spacing': return '#eab308'
            case 'typography': return '#3b82f6'
            case 'color': return '#a855f7'
            default: return '#ffffff'
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden space-y-4">
            {/* Header / Config Bar */}
            <div className="bg-surface-card border border-surface-border p-3 rounded-xl flex items-center justify-between gap-4 shrink-0">
                <div className="flex-1 grid grid-cols-2 gap-3">
                    <input
                        value={liveUrl}
                        onChange={(e) => setLiveUrl(e.target.value)}
                        placeholder="Live URL..."
                        className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-sm font-mono text-white focus-ring"
                    />
                    <input
                        value={stageUrl}
                        onChange={(e) => setStageUrl(e.target.value)}
                        placeholder="Stage URL..."
                        className="bg-surface-dark border border-surface-border rounded-lg px-3 py-2 text-sm font-mono text-white focus-ring"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-surface-dark p-1 rounded-lg border border-surface-border">
                        {['desktop', 'tablet', 'mobile'].map(v => (
                            <button
                                key={v}
                                onClick={() => setViewport(v)}
                                className={`p - 1.5 rounded transition - all ${viewport === v ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'} `}
                                title={v.toUpperCase()}
                            >
                                {v === 'desktop' ? <Monitor size={16} /> : v === 'tablet' ? <TabletIcon size={16} /> : <Smartphone size={16} />}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleCompare}
                        disabled={isLoading || !liveUrl || !stageUrl}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 text-sm h-[38px]"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                        Analyze
                    </button>
                </div>
            </div>

            {!results ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-surface-card/50 rounded-2xl border border-dashed border-surface-border">
                    <Focus size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">Enter URLs to start pixel-accurate comparison</p>
                    <p className="text-sm">We'll scan for DOM, CSS, and Visual regressions.</p>
                </div>
            ) : results.error ? (
                <div className="flex-1 flex flex-col items-center justify-center text-red-400 bg-red-400/5 rounded-2xl border border-red-500/20">
                    <AlertTriangle size={48} className="mb-4" />
                    <p className="font-bold">Audit Failed</p>
                    <p className="text-sm opacity-80">{results.message}</p>
                </div>
            ) : (
                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Main Side-by-Side Area */}
                    <div className="flex-1 flex flex-col bg-surface-card rounded-2xl border border-surface-border overflow-hidden">
                        {/* Control Bar for Viewport */}
                        <div className="p-3 border-b border-surface-border flex items-center justify-between">
                            <div className="flex gap-2">
                                <div className="flex bg-surface-dark p-1 rounded-lg border border-surface-border">
                                    {[
                                        { id: 'all', label: 'All', icon: Layers },
                                        { id: 'structure', label: 'Structure', icon: Layout },
                                        { id: 'spacing', label: 'Spacing', icon: Maximize2 },
                                        { id: 'typography', label: 'Typography', icon: Type },
                                        { id: 'color', label: 'Color', icon: Palette },
                                        { id: 'image', label: 'Images', icon: ImageIcon }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`px - 2.5 py - 1 rounded transition - all text - [10px] font - bold flex items - center gap - 1.5 ${activeCategory === cat.id ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'} `}
                                        >
                                            <cat.icon size={12} />
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {[
                                    { id: 'side-by-side', icon: Layers, label: 'Dual View' },
                                    { id: 'slider', icon: ArrowLeftRight, label: 'Slider' },
                                    { id: 'diff-map', icon: MapIcon, label: 'Diff Map' }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setViewMode(mode.id)}
                                        className={`px - 3 py - 1.5 rounded - lg text - xs font - bold flex items - center gap - 2 transition - all ${viewMode === mode.id ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-400 hover:text-white'} `}
                                    >
                                        <mode.icon size={14} />
                                        {mode.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-gray-500">
                                    {filteredDiffs.length} Differences Found
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        disabled={selectedDiffIndex <= 0}
                                        onClick={() => focusDiff(selectedDiffIndex - 1)}
                                        className="p-1.5 rounded bg-surface-dark border border-surface-border text-gray-400 hover:text-white disabled:opacity-20"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        disabled={selectedDiffIndex >= filteredDiffs.length - 1}
                                        onClick={() => focusDiff(selectedDiffIndex + 1)}
                                        className="p-1.5 rounded bg-surface-dark border border-surface-border text-gray-400 hover:text-white disabled:opacity-20"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Comparative Content Area */}
                        <div className="flex-1 relative flex overflow-hidden">
                            {viewMode === 'side-by-side' && (
                                <>
                                    {/* STAGE Container */}
                                    <div
                                        className="flex-1 overflow-auto bg-black relative border-r border-surface-border scrollbar-hide"
                                        ref={leftPaneRef}
                                        onScroll={(e) => syncScroll(e.target, rightPaneRef.current)}
                                    >
                                        <div className="sticky top-0 left-0 z-20 px-3 py-1 bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest">Staging</div>
                                        <div className="relative inline-block w-full" id="stage-container">
                                            <img
                                                src={results.visualDiff.stageUrl ? `${results.visualDiff.stageUrl} `
                                                    : `data: image / png; base64, ${results.visualDiff.stage} `}
                                                className="max-w-none w-full h-auto block"
                                            />
                                            {/* Overlays */}
                                            {filteredDiffs.map((diff, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setSelectedDiffIndex(i)}
                                                    className={`absolute cursor - pointer transition - all ${selectedDiffIndex === i ? 'ring-2 ring-white ring-offset-2 z-10' : 'hover:opacity-100'} `}
                                                    style={{
                                                        left: `${(diff.stageRect.x / 1440) * 100}% `,
                                                        top: `${(diff.stageRect.y / results.visualDiff.stageHeight) * 100}% `,
                                                        width: `${(diff.stageRect.width / 1440) * 100}% `,
                                                        height: `${(diff.stageRect.height / results.visualDiff.stageHeight) * 100}% `,
                                                        backgroundColor: getHighlightColor(diff.category),
                                                        border: `1px solid ${getHighlightBorder(diff.category)} `
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* LIVE Container */}
                                    <div
                                        className="flex-1 overflow-auto bg-black relative scrollbar-hide"
                                        ref={rightPaneRef}
                                        onScroll={(e) => syncScroll(e.target, leftPaneRef.current)}
                                    >
                                        <div className="sticky top-0 right-0 z-20 px-3 py-1 bg-accent-purple text-white text-[10px] font-bold uppercase tracking-widest text-right">Production (Live)</div>
                                        <div className="relative inline-block w-full" id="live-container">
                                            <img
                                                src={results.visualDiff.liveUrl ? `${results.visualDiff.liveUrl} `
                                                    : `data: image / png; base64, ${results.visualDiff.live} `}
                                                className="max-w-none w-full h-auto block"
                                            />
                                            {/* Overlays */}
                                            {filteredDiffs.map((diff, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setSelectedDiffIndex(i)}
                                                    className={`absolute cursor - pointer transition - all ${selectedDiffIndex === i ? 'ring-2 ring-white ring-offset-2 z-10' : 'hover:opacity-100'} `}
                                                    style={{
                                                        left: `${(diff.liveRect.x / 1440) * 100}% `,
                                                        top: `${(diff.liveRect.y / results.visualDiff.liveHeight) * 100}% `,
                                                        width: `${(diff.liveRect.width / 1440) * 100}% `,
                                                        height: `${(diff.liveRect.height / results.visualDiff.liveHeight) * 100}% `,
                                                        backgroundColor: getHighlightColor(diff.category),
                                                        border: `1px solid ${getHighlightBorder(diff.category)} `
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {viewMode === 'slider' && (
                                <div className="flex-1 h-full relative group">
                                    <div className="absolute inset-0 bg-black overflow-auto">
                                        <div className="relative inline-block w-full h-full">
                                            {/* Background (Live) */}
                                            <img src={`data: image / png; base64, ${results.visualDiff.live} `} className="w-full h-auto" />

                                            {/* Foreground (Stage) */}
                                            <div
                                                className="absolute inset-0 pointer-events-none overflow-hidden"
                                                style={{ clipPath: `inset(0 ${100 - sliderPos} % 0 0)` }}
                                            >
                                                <img src={`data: image / png; base64, ${results.visualDiff.stage} `} className="w-full h-auto" />
                                            </div>

                                            {/* Slider Handle */}
                                            <div
                                                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-40 group"
                                                style={{ left: `${sliderPos}% ` }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault()
                                                    const container = e.currentTarget.closest('.relative.inline-block')
                                                    if (!container) return

                                                    const handleMove = (moveEvent) => {
                                                        const rect = container.getBoundingClientRect()
                                                        const pos = ((moveEvent.clientX - rect.left) / rect.width) * 100
                                                        setSliderPos(Math.max(0, Math.min(100, pos)))
                                                    }

                                                    window.addEventListener('mousemove', handleMove)
                                                    window.addEventListener('mouseup', () => {
                                                        window.removeEventListener('mousemove', handleMove)
                                                    }, { once: true })
                                                }}
                                            >
                                                <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-primary ring-4 ring-black/20">
                                                    <ArrowLeftRight size={16} className="text-primary" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {viewMode === 'diff-map' && (
                                <div className="flex-1 h-full bg-black overflow-auto p-4 flex items-center justify-center">
                                    <img
                                        src={results.visualDiff.diffUrl ? `${results.visualDiff.diffUrl} `
                                            : `data: image / png; base64, ${results.visualDiff.diff} `}
                                        className="max-w-full h-auto shadow-2xl border border-white/10"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Sections & Issues */}
                    <div className="w-80 flex flex-col gap-4">
                        {/* Summary Card */}
                        <div className="bg-surface-card border border-surface-border rounded-xl p-4 shrink-0">
                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Layout size={14} className="text-primary" />
                                Section Breakdown
                            </h3>
                            <div className="space-y-1">
                                {sections.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setActiveSection(s)}
                                        className={`w - full flex items - center justify - between text - xs p - 2 rounded - lg transition - all ${activeSection === s ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:text-white'} `}
                                    >
                                        <span className="capitalize">{s}</span>
                                        <span className="bg-surface-dark px-1.5 py-0.5 rounded border border-surface-border">
                                            {s === 'all' ? results.differences.length : results.differences.filter(d => d.section === s).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Issue Details Panel */}
                        <div className="flex-1 bg-surface-card border border-surface-border rounded-xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-surface-border bg-surface-dark/50">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <MapIcon size={14} className="text-accent-purple" />
                                    Property Inspector
                                </h3>
                                <div className="flex bg-surface-dark mt-3 p-1 rounded-lg border border-surface-border">
                                    {['inspector', 'system'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setInspectorTab(tab)}
                                            className={`flex - 1 py - 1 rounded - md text - [10px] font - bold uppercase tracking - wider transition - all ${inspectorTab === tab ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-500 hover:text-white'} `}
                                        >
                                            {tab === 'inspector' ? 'Styles' : 'System Audit'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {inspectorTab === 'inspector' ? (
                                    selectedDiffIndex !== null ? (
                                        <div className="animate-in fade-in slide-in-from-right-2">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: getHighlightBorder(filteredDiffs[selectedDiffIndex].category) }}
                                                />
                                                <h4 className="text-sm font-bold text-white flex-1">{filteredDiffs[selectedDiffIndex].property}</h4>
                                                <span className={`text - [10px] px - 1.5 py - 0.5 rounded font - bold uppercase ${filteredDiffs[selectedDiffIndex].severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-500'} `}>
                                                    {filteredDiffs[selectedDiffIndex].severity}
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Live (Desired)</p>
                                                    <div className="flex items-center gap-2">
                                                        {filteredDiffs[selectedDiffIndex].property.toLowerCase().includes('color') && (
                                                            <div className="w-4 h-4 rounded-sm border border-white/10" style={{ backgroundColor: filteredDiffs[selectedDiffIndex].liveValue }} />
                                                        )}
                                                        <code className="text-xs text-white">{filteredDiffs[selectedDiffIndex].liveValue}</code>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-black/40 rounded-lg border border-red-500/10">
                                                    <p className="text-[10px] font-bold text-red-500/70 uppercase mb-2">Stage (Actual)</p>
                                                    <div className="flex items-center gap-2">
                                                        {filteredDiffs[selectedDiffIndex].property.toLowerCase().includes('color') && (
                                                            <div className="w-4 h-4 rounded-sm border border-white/10" style={{ backgroundColor: filteredDiffs[selectedDiffIndex].stageValue }} />
                                                        )}
                                                        <code className="text-xs text-red-400">{filteredDiffs[selectedDiffIndex].stageValue}</code>
                                                    </div>
                                                </div>

                                                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                                    <p className="text-[10px] font-bold text-primary uppercase mb-1 flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> recommendation
                                                    </p>
                                                    <p className="text-xs text-gray-300 italic">
                                                        {filteredDiffs[selectedDiffIndex].recommendation}
                                                    </p>
                                                </div>

                                                <div className="text-[10px] text-gray-500 font-mono break-all bg-surface-dark p-2 rounded border border-white/5">
                                                    {filteredDiffs[selectedDiffIndex].selector}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500 py-20 text-center">
                                            <Search size={32} className="mb-2 opacity-10" />
                                            <p className="text-xs">Click a highlighted area on the preview to inspect styles.</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                        {results.systemicIssues && results.systemicIssues.length > 0 ? (
                                            results.systemicIssues.map((issue, i) => (
                                                <div key={i} className="p-3 bg-surface-dark border border-surface-border rounded-lg">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <AlertTriangle size={12} className={issue.severity === 'medium' ? 'text-yellow-500' : 'text-primary'} />
                                                        <span className="text-xs font-bold text-white uppercase">{issue.title}</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 mb-2">{issue.description}</p>
                                                    <p className="text-[10px] text-primary italic font-medium bg-primary/5 p-1.5 rounded border border-primary/20">
                                                        💡 {issue.recommendation}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-10">
                                                <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500 opacity-20" />
                                                <p className="text-xs text-gray-500">No systemic design flaws detected in the staging environment.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
