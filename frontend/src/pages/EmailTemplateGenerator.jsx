import { useState, useRef } from 'react';
import { Upload, Download, Copy, CheckCircle, AlertCircle, Zap, Eye, Code, Settings, ShieldCheck, Mail, Monitor, Smartphone } from 'lucide-react';
import axios from 'axios';

/**
 * PRODUCTION-GRADE EMAIL TEMPLATE GENERATOR
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

            // Step 1: Vision Analysis
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

            setSuccess('Design analyzed with 98%+ confidence! Generating pixel-perfect HTML...');

            // Step 2: Generation from Analysis
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

    // Generate basic template for testing/onboarding
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
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Email Engine <span className="text-blue-600">Pro</span></h1>
                        <p className="text-slate-500 text-lg">Convert designs to pixel-perfect, compliant, and Outlook-ready HTML.</p>
                    </div>
                    {metrics && (
                        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quality Score</p>
                                <p className={`text-2xl font-black ${getScoreColor(metrics.qualityScore)}`}>{metrics.qualityScore}%</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200" />
                            <ShieldCheck className={`w-8 h-8 ${metrics.qualityScore >= 90 ? 'text-green-500' : 'text-slate-300'}`} />
                        </div>
                    )}
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-800">Process Blocked</p>
                            <p className="text-red-700 text-sm mt-0.5">{error}</p>
                            {gaps.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-xs text-red-600 grid grid-cols-2 gap-x-4">
                                    {gaps.map((gap, i) => <li key={i}>{gap}</li>)}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {success && !error && (
                    <div className="mb-8 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-center gap-3 shadow-sm animate-in fade-in">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <p className="font-medium text-emerald-800">{success}</p>
                    </div>
                )}

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Input & Controls */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Design Upload Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">1. Design Input</h2>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative group border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${uploadedImage ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                                >
                                    {uploadedImage ? (
                                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white">
                                            <img src={uploadedImage} alt="Design" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Upload className="text-white w-8 h-8" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-4">
                                            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4 group-hover:text-blue-400 group-hover:scale-110 transition-transform" />
                                            <p className="text-slate-600 font-semibold mb-1">Click to Upload</p>
                                            <p className="text-slate-400 text-xs text-balance">Drop design snapshot (PNG/JPG)</p>
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                                </div>

                                {!uploadedImage && (
                                    <button
                                        onClick={generateBasicTemplate}
                                        className="w-full mt-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Use Starter Template
                                    </button>
                                )}
                            </div>

                            {/* Analysis Meta */}
                            {analysis && (
                                <div className="px-6 pb-6 bg-slate-50/50 pt-4 border-t border-slate-100">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5" /> Engine Feedback
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Confidence</p>
                                            <p className={`text-lg font-black ${matchConfidence >= 98 ? 'text-emerald-600' : 'text-red-500'}`}>{matchConfidence}%</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Blocks</p>
                                            <p className="text-lg font-black text-slate-800">{analysis.components?.length || 0}</p>
                                        </div>
                                    </div>
                                    {analysis.colors && (
                                        <div className="mt-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Detected Palette</p>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {Object.values(analysis.colors).slice(0, 6).map((c, i) => (
                                                    <div key={i} className="w-6 h-6 rounded-full border border-slate-200 shadow-inner" style={{ backgroundColor: c }} title={c} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Audit Summary Card */}
                        {metrics && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">2. Audit Overview</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${metrics.accessibility.score >= 90 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">Accessibility</span>
                                        </div>
                                        <span className={`text-sm font-black ${getScoreColor(metrics.accessibility.score)}`}>{metrics.accessibility.score}%</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">Spam Protection</span>
                                        </div>
                                        <span className={`text-sm font-black ${metrics.spamRisk.score < 30 ? 'text-emerald-600' : 'text-orange-500'}`}>{100 - metrics.spamRisk.score}%</span>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-3">Client Coverage</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(metrics.compatibility).map(([client, status]) => (
                                                <div key={client} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-100">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${status ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase truncate">{client.replace(/_/g, ' ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Editor & Preview */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[700px] flex flex-col">

                            {/* Toolbar */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
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
                                            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 disabled:opacity-30'}`}
                                        >
                                            <tab.icon className="w-3.5 h-3.5" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {html && (
                                    <div className="flex gap-2">
                                        <button onClick={copyHTML} className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm" title="Copy Code">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button onClick={downloadHTML} className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-shadow flex items-center gap-2 shadow-lg shadow-blue-200" title="Download HTML">
                                            <Download className="w-4 h-4" /> Export
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Viewport Area */}
                            <div className="flex-1 relative">
                                {!html && activeTab !== 'design' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                        <Mail className="w-16 h-16 mb-4 opacity-10" />
                                        <p className="font-bold text-slate-400">Waiting for Design Input...</p>
                                    </div>
                                )}

                                {activeTab === 'design' && (
                                    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                            <Upload className="w-10 h-10 text-blue-500" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2">Engine Entry Point</h3>
                                        <p className="text-slate-500 max-w-sm mb-8">Upload your design snapshot on the left panel. The engine will perform OCR and vision analysis to build a table-based layout.</p>
                                        <div className="flex gap-4">
                                            <div className="px-4 py-2 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supports AI Model: Gemini 1.5</div>
                                            <div className="px-4 py-2 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">Precision: Pixel-Level</div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'editor' && html && (
                                    <div className="h-full flex flex-col p-6">
                                        <div className="flex-1 bg-[#1e293b] rounded-2xl p-4 shadow-inner overflow-hidden border border-slate-800">
                                            <textarea
                                                value={html}
                                                onChange={(e) => setHtml(e.target.value)}
                                                className="w-full h-full bg-transparent text-slate-300 font-mono text-sm resize-none focus:outline-none scrollbar-thin scrollbar-thumb-slate-700"
                                                spellCheck={false}
                                            />
                                        </div>
                                        <div className="mt-4 flex gap-3">
                                            <button onClick={validateHTML} disabled={loading} className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                                                <Monitor className="w-4 h-4" /> Re-Audit Code
                                            </button>
                                            <button onClick={autoFix} disabled={loading} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                                                <Zap className="w-4 h-4" /> Auto-Fix Render Errors
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'preview' && html && (
                                    <div className="h-full flex flex-col p-6 bg-slate-50/30">
                                        <div className="mb-6 flex gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
                                            {[
                                                { id: 'desktop-light', icon: Monitor, label: 'Light' },
                                                { id: 'desktop-dark', icon: Monitor, label: 'Dark' },
                                                { id: 'mobile-light', icon: Smartphone, label: 'Mobile' }
                                            ].map(mode => (
                                                <button
                                                    key={mode.id}
                                                    onClick={() => setPreviewMode(mode.id)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${previewMode === mode.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <mode.icon className="w-3.5 h-3.5" /> {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className={`flex-1 flex justify-center overflow-auto animate-in zoom-in-95 duration-500`}>
                                            <div
                                                className={`bg-white rounded-lg shadow-2xl transition-all duration-500 overflow-hidden ${previewMode.includes('dark') ? 'invert hue-rotate-180' : ''}`}
                                                style={{
                                                    width: previewMode.includes('mobile') ? '375px' : '100%',
                                                    maxWidth: '100%',
                                                    minHeight: '600px'
                                                }}
                                            >
                                                <iframe srcDoc={html} className="w-full h-full border-0" title="Preview" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'issues' && metrics && (
                                    <div className="h-full p-8 overflow-auto space-y-8">
                                        {/* Validation Segment */}
                                        <section>
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">HTML Validation - {metrics.validation.issues.length + metrics.validation.warnings.length} Found</h3>
                                            <div className="space-y-3">
                                                {metrics.validation.issues.length === 0 && (
                                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                                        <div className="bg-emerald-500 rounded-full p-1"><CheckCircle className="w-4 h-4 text-white" /></div>
                                                        <p className="text-sm font-bold text-emerald-800">Perfect markup structure for major email clients.</p>
                                                    </div>
                                                )}
                                                {metrics.validation.issues.map((issue, idx) => (
                                                    <div key={idx} className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start justify-between">
                                                        <div className="flex gap-3">
                                                            <div className="bg-red-100 rounded-lg p-2 text-red-600"><AlertCircle className="w-4 h-4" /></div>
                                                            <div>
                                                                <p className="font-bold text-red-900 text-sm">{issue.message}</p>
                                                                <p className="text-red-700/60 text-xs mt-1">Impact: Outlook, Windows Mail</p>
                                                            </div>
                                                        </div>
                                                        {issue.autoFix && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-full">Fix Ready</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Accessibility Segment */}
                                        <section>
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">WCAG 1.2.1 Audit - {metrics.accessibility.level} Level</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                {metrics.accessibility.issues.map((issue, idx) => (
                                                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <p className="font-bold text-slate-800 text-sm">{issue.message}</p>
                                                            <span className="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase">WCAG {issue.wcag}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <p className="text-xs text-slate-400">Fix Path:</p>
                                                            <p className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{issue.fix}</p>
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
