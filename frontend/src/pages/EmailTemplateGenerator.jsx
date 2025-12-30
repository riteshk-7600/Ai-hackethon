import { useState, useRef } from 'react';
import { Upload, Download, Copy, CheckCircle, AlertCircle, Zap, Eye, Code, Settings, ShieldCheck, Mail, Monitor, Smartphone, Moon, Sun } from 'lucide-react';
import axios from 'axios';

/**
 * PRODUCTION-GRADE EMAIL TEMPLATE GENERATOR - DARK EDITION
 * Handles design-to-HTML conversion, WCAG 2.1 AA audit, and Outlook compatibility.
 */
export default function EmailTemplateGenerator() {
    const [uploadedImage, setUploadedImage] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [html, setHtml] = useState('');
    const [metrics, setMetrics] = useState(null);
    const [matchConfidence, setMatchConfidence] = useState(0);
    const [gaps, setGaps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('design');
    const [previewMode, setPreviewMode] = useState('desktop-light');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);

    // Handle file upload & analysis
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
            setError('Please upload a PNG or JPG image');
            return;
        }

        setUploadedImage(URL.createObjectURL(file));
        setError(null);
        setAnalysis(null);
        setHtml('');
        setMetrics(null);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const { data } = await axios.post('/api/email/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setAnalysis(data.analysis);
            setMatchConfidence(data.matchConfidence);
            setGaps(data.gaps);

            if (data.matchConfidence < 98) {
                setError(`Layout detection incomplete (${data.matchConfidence}%). Blocks detected with insufficient clarity. Please use a higher resolution screenshot.`);
                setLoading(false);
                return;
            }

            setSuccess('Design analyzed with 98%+ confidence! Generating HTML...');

            const genResponse = await axios.post('/api/email/generate', {
                analysis: data.analysis,
                options: {
                    includeOutlookFixes: true,
                    includeDarkMode: true,
                    includeResponsive: true,
                    title: 'Email Template'
                }
            });

            setHtml(genResponse.data.html);
            setMetrics(genResponse.data.metrics);
            setActiveTab('editor');
            setSuccess('Production HTML generated and audited.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process design');
        } finally {
            setLoading(false);
        }
    };

    const generateBasicTemplate = async () => {
        setLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const { data } = await axios.post('/api/email/generate-basic', {
                options: {
                    includeOutlookFixes: true,
                    includeDarkMode: true,
                    includeResponsive: true
                }
            });

            setHtml(data.html);
            setMetrics(data.metrics);
            setActiveTab('editor');
            setSuccess('Sample template generated for exploring the engine.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate template');
        } finally {
            setLoading(false);
        }
    };

    const validateHTML = async () => {
        if (!html) return;
        setLoading(true);
        try {
            const { data } = await axios.post('/api/email/validate', { html });
            setMetrics(data.metrics);
            setSuccess('Real-time audit complete.');
        } catch (err) {
            setError(err.response?.data?.error || 'Validation failed');
        } finally {
            setLoading(false);
        }
    };

    const autoFix = async () => {
        if (!html) return;
        setLoading(true);
        try {
            const { data } = await axios.post('/api/email/auto-fix', { html });
            setHtml(data.html);
            setMetrics(data.metrics);
            setSuccess('Outlook rendering & Accessibility fixes applied.');
        } catch (err) {
            setError(err.response?.data?.error || 'Auto-fix failed');
        } finally {
            setLoading(false);
        }
    };

    const copyHTML = () => {
        navigator.clipboard.writeText(html);
        setSuccess('HTML copied to clipboard!');
    };

    const downloadHTML = () => {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'email-template.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    const getScoreColor = (score) => {
        if (score >= 90) return 'text-emerald-400';
        if (score >= 70) return 'text-amber-400';
        return 'text-rose-400';
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-8 selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                                <Mail className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter">Email Engine <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Pro</span></h1>
                        </div>
                        <p className="text-slate-400 text-lg font-medium">Precision design-to-HTML recovery for production campaigns.</p>
                    </div>
                    {metrics && (
                        <div className="bg-slate-900/50 backdrop-blur-xl px-8 py-4 rounded-3xl shadow-2xl border border-white/5 flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Engine Quality</p>
                                <p className={`text-3xl font-black ${getScoreColor(metrics.qualityScore)}`}>{metrics.qualityScore}%</p>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="relative">
                                <ShieldCheck className={`w-10 h-10 ${metrics.qualityScore >= 90 ? 'text-emerald-400' : 'text-slate-600'}`} />
                                <div className="absolute inset-0 blur-xl opacity-20 bg-emerald-400"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-8 bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl flex items-start gap-4 shadow-2xl animate-in slide-in-from-top-4 duration-500">
                        <div className="p-2 bg-rose-500/20 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
                        </div>
                        <div>
                            <p className="font-black text-rose-200 uppercase tracking-widest text-xs mb-1">Intelligence Error</p>
                            <p className="text-rose-100/80 font-medium">{error}</p>
                            {gaps.length > 0 && (
                                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                                    {gaps.map((gap, i) => (
                                        <li key={i} className="text-xs text-rose-300/60 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400/40" /> {gap}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {success && !error && (
                    <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-700">
                        <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="font-bold text-emerald-200 text-sm tracking-wide">{success}</p>
                    </div>
                )}

                {/* Main Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Control Panel */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* 1. Design Ingestion */}
                        <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden group">
                            <div className="p-8">
                                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">01. Studio Input</h2>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative rounded-[2rem] p-10 text-center cursor-pointer transition-all duration-500 border-2 border-dashed ${uploadedImage ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 hover:border-blue-500/40 hover:bg-white/5'}`}
                                >
                                    {uploadedImage ? (
                                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                                            <img src={uploadedImage} alt="Design" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                <Upload className="text-white w-10 h-10 animate-bounce" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-6">
                                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-600 transition-colors duration-500">
                                                <Upload className="w-8 h-8 text-slate-400 group-hover:text-white" />
                                            </div>
                                            <p className="text-white font-black text-lg mb-2">Deploy Design</p>
                                            <p className="text-slate-500 text-xs font-medium">Drop UI Snapshot (PNG/JPG)</p>
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                                </div>

                                {!uploadedImage && (
                                    <button
                                        onClick={generateBasicTemplate}
                                        className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-3"
                                    >
                                        <Settings className="w-4 h-4 text-blue-400" />
                                        Initialize Sample
                                    </button>
                                )}
                            </div>

                            {/* Vision Metrics */}
                            {analysis && (
                                <div className="px-8 pb-8 bg-black/20 pt-6 border-t border-white/5">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Vision Output</h3>
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                                            <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Confidence</p>
                                            <p className={`text-2xl font-black ${matchConfidence >= 98 ? 'text-emerald-400' : 'text-rose-400'}`}>{matchConfidence}%</p>
                                        </div>
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2">DOM Nodes</p>
                                            <p className="text-2xl font-black text-white">{analysis.components?.length || 0}</p>
                                        </div>
                                    </div>
                                    {analysis.colors && (
                                        <div className="mt-6 flex items-center gap-3 px-1">
                                            {Object.values(analysis.colors).slice(0, 5).map((c, i) => (
                                                <div key={i} className="group relative">
                                                    <div className="w-8 h-8 rounded-xl border border-white/10 shadow-2xl transition-transform hover:scale-125" style={{ backgroundColor: c }} />
                                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-[10px] font-mono px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">{c}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Audit Summary Card */}
                        {metrics && (
                            <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-2xl">
                                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">02. Compliance Hub</h2>
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5 group hover:border-emerald-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                                                <Monitor className="w-5 h-5" />
                                            </div>
                                            <span className="text-sm font-black text-slate-300">Accessibility</span>
                                        </div>
                                        <span className={`text-lg font-black ${getScoreColor(metrics.accessibility.score)}`}>{metrics.accessibility.score}%</span>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5 group hover:border-blue-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <span className="text-sm font-black text-slate-300">Anti-Spam</span>
                                        </div>
                                        <span className={`text-lg font-black ${metrics.spamRisk.score < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>{100 - metrics.spamRisk.score}%</span>
                                    </div>

                                    <div className="pt-8 border-t border-white/5">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Rendering Matrix</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(metrics.compatibility).map(([client, status]) => (
                                                <div key={client} className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${status ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-rose-500 shadow-rose-500/50'}`} />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase truncate">{client.replace(/_/g, ' ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Editor & Execution Space */}
                    <div className="lg:col-span-8 flex flex-col h-full">
                        <div className="bg-slate-900/40 backdrop-blur-md rounded-[3rem] shadow-2xl border border-white/5 flex flex-col flex-1 overflow-hidden">

                            {/* Pro Toolbar */}
                            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/5">
                                    {[
                                        { id: 'design', label: 'Monitor', icon: Monitor, enabled: true },
                                        { id: 'editor', label: 'Code', icon: Code, enabled: !!html },
                                        { id: 'preview', label: 'Live', icon: Eye, enabled: !!html },
                                        { id: 'issues', label: 'Audits', icon: AlertCircle, enabled: !!metrics }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            disabled={!tab.enabled}
                                            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2.5 transition-all duration-300 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300 disabled:opacity-20'}`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {html && (
                                    <div className="flex gap-3">
                                        <button onClick={copyHTML} className="p-3 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-2xl border border-white/5 transition-all shadow-xl" title="Copy Raw Code">
                                            <Copy className="w-5 h-5" />
                                        </button>
                                        <button onClick={downloadHTML} className="py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-[0_0_25px_rgba(79,70,229,0.3)]">
                                            <Download className="w-5 h-5" /> Export HTML
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Dynamic Workspace */}
                            <div className="flex-1 relative overflow-hidden">
                                {!html && activeTab !== 'design' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                                        <div className="relative mb-8">
                                            <Mail className="w-24 h-24 opacity-5 animate-pulse" />
                                            <div className="absolute inset-0 blur-3xl opacity-10 bg-blue-500"></div>
                                        </div>
                                        <p className="font-black uppercase tracking-[0.4em] text-slate-600">Awaiting Ingestion</p>
                                    </div>
                                )}

                                {activeTab === 'design' && (
                                    <div className="h-full flex flex-col items-center justify-center p-16 text-center">
                                        <div className="relative group mb-10">
                                            <div className="absolute inset-0 blur-3xl opacity-20 bg-blue-600 animate-pulse"></div>
                                            <div className="relative w-32 h-32 bg-slate-950 rounded-[2.5rem] flex items-center justify-center border border-white/10 ring-8 ring-slate-900 shadow-2xl shadow-blue-500/10">
                                                <Upload className="w-12 h-12 text-blue-400 group-hover:scale-110 transition-transform" />
                                            </div>
                                        </div>
                                        <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Vision Pipeline Standby</h3>
                                        <p className="text-slate-500 max-w-md mb-12 text-lg font-medium leading-relaxed">Submit a design snapshot to trigger the high-fidelity recovery engine. We support complex multi-column grids and dark mode variants.</p>
                                        <div className="flex gap-6">
                                            <div className="px-6 py-3 bg-white/5 rounded-2xl text-[11px] font-black text-slate-400 uppercase tracking-widest border border-white/5">Engine: Genesis-V1</div>
                                            <div className="px-6 py-3 bg-white/5 rounded-2xl text-[11px] font-black text-slate-400 uppercase tracking-widest border border-white/5">Mode: Professional</div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'editor' && html && (
                                    <div className="h-full flex flex-col p-8">
                                        <div className="flex-1 bg-[#020617] rounded-[2rem] p-8 shadow-inner overflow-hidden border border-white/5 relative group">
                                            <div className="absolute top-4 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            </div>
                                            <textarea
                                                value={html}
                                                onChange={(e) => setHtml(e.target.value)}
                                                className="w-full h-full bg-transparent text-blue-100 font-mono text-sm resize-none focus:outline-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent selection:bg-blue-500/20"
                                                spellCheck={false}
                                            />
                                        </div>
                                        <div className="mt-6 grid grid-cols-2 gap-4">
                                            <button onClick={validateHTML} disabled={loading} className="py-5 bg-slate-950 hover:bg-slate-900 text-slate-300 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3">
                                                <Monitor className="w-4 h-4 text-blue-400" /> Refresh Audit
                                            </button>
                                            <button onClick={autoFix} disabled={loading} className="py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3">
                                                <Zap className="w-4 h-4" /> Deploy Auto-Fixes
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'preview' && html && (
                                    <div className="h-full flex flex-col p-8 lg:p-12 bg-black/10">
                                        <div className="mb-8 flex items-center justify-between">
                                            <div className="flex gap-2 p-1.5 bg-slate-950 border border-white/10 rounded-[1.5rem] shadow-2xl">
                                                {[
                                                    { id: 'desktop-light', icon: Monitor, label: 'Desktop' },
                                                    { id: 'mobile-light', icon: Smartphone, label: 'Mobile' },
                                                    { id: 'desktop-dark', icon: Moon, label: 'Dark Mode' }
                                                ].map(mode => (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => setPreviewMode(mode.id)}
                                                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${previewMode === mode.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        <mode.icon className="w-4 h-4" /> {mode.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="px-6 py-3 bg-slate-950 rounded-2xl border border-white/5 flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Rendering Active</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex justify-center overflow-hidden animate-in zoom-in-95 duration-700">
                                            <div
                                                className={`bg-white rounded-[2rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)] transition-all duration-700 overflow-hidden ${previewMode.includes('dark') ? 'invert hue-rotate-180' : ''}`}
                                                style={{
                                                    width: previewMode.includes('mobile') ? '375px' : '100%',
                                                    maxWidth: '100%',
                                                    height: '100%'
                                                }}
                                            >
                                                <iframe srcDoc={html} className="w-full h-full border-0" title="Email Final Preview" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'issues' && metrics && (
                                    <div className="h-full p-10 overflow-auto space-y-12">
                                        {/* Validation Segment */}
                                        <section>
                                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                                                <div className="w-8 h-px bg-white/10"></div> MARKUP INTEGRITY
                                            </h3>
                                            <div className="space-y-4">
                                                {metrics.validation.issues.length === 0 && (
                                                    <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-center gap-4 group">
                                                        <div className="bg-emerald-500/20 rounded-2xl p-3 transform transition-transform group-hover:rotate-12"><CheckCircle className="w-6 h-6 text-emerald-400" /></div>
                                                        <div>
                                                            <p className="font-black text-emerald-100 text-sm uppercase tracking-wide">Validation Shield Active</p>
                                                            <p className="text-emerald-300/60 text-xs mt-1">Found 0 syntax errors or structural conflicts.</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {metrics.validation.issues.map((issue, idx) => (
                                                    <div key={idx} className="p-6 bg-rose-500/5 rounded-3xl border border-rose-500/10 flex items-start justify-between group hover:border-rose-500/30 transition-all">
                                                        <div className="flex gap-4">
                                                            <div className="bg-rose-500/10 rounded-2xl p-3 text-rose-400"><AlertCircle className="w-6 h-6" /></div>
                                                            <div>
                                                                <p className="font-black text-rose-100 text-sm uppercase tracking-wide">{issue.message}</p>
                                                                <p className="text-rose-400/60 text-xs mt-1 font-medium">Criticality: High (Outlook Blocked)</p>
                                                            </div>
                                                        </div>
                                                        {issue.autoFix && <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg">Patch Available</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Accessibility Segment */}
                                        <section>
                                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                                                <div className="w-8 h-px bg-white/10"></div> WCAG 2.1 AA AUDIT
                                            </h3>
                                            <div className="grid grid-cols-1 gap-4">
                                                {metrics.accessibility.issues.map((issue, idx) => (
                                                    <div key={idx} className="p-6 bg-slate-950 rounded-3xl border border-white/5 group hover:bg-slate-900 transition-colors">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                <p className="font-black text-slate-200 text-sm uppercase">{issue.message}</p>
                                                            </div>
                                                            <span className="text-[10px] font-black bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg border border-blue-500/20 uppercase tracking-widest">RULE {issue.wcag}</span>
                                                        </div>
                                                        <div className="flex items-start gap-3 p-4 bg-black/40 rounded-2xl border border-white/[0.03]">
                                                            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 font-black uppercase mb-1 tracking-widest">Correction Protocol</p>
                                                                <p className="text-xs font-semibold text-slate-400">{issue.fix}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
