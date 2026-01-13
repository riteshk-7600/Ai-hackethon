import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Copy, CheckCircle, AlertCircle, Zap, Eye, Code, Settings, ShieldCheck, Mail, Monitor, Smartphone, Moon, Image as ImageIcon, FolderOpen, X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import axios from 'axios';

/**
 * PRODUCTION-GRADE EMAIL TEMPLATE GENERATOR WITH VISUAL EDITOR
 * Complete asset management, interactive image replacement, and smart structure detection
 */
export default function EmailTemplateGeneratorEnhanced() {
    // Core States
    const [uploadedImage, setUploadedImage] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [html, setHtml] = useState('');
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('design');
    const [previewMode, setPreviewMode] = useState('desktop-light');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Asset Management States
    const [assets, setAssets] = useState([]);
    const [showAssetManager, setShowAssetManager] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImageSlot, setSelectedImageSlot] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [editorMode, setEditorMode] = useState(false); // Visual edit mode

    const fileInputRef = useRef(null);
    const assetInputRef = useRef(null);
    const iframeRef = useRef(null);

    // Handle design upload & analysis
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
        setAssets([]);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const { data } = await axios.post('/api/email/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setAnalysis(data.analysis);

            if ((data.matchConfidence || 0) < 95) {
                setError(`Design analysis incomplete (${data.matchConfidence}%). Please use a higher resolution image.`);
                setLoading(false);
                return;
            }

            setSuccess('Design analyzed! Generating HTML with editable image placeholders...');

            // Enhanced generation with image slot detection
            const genResponse = await axios.post('/api/email/generate-enhanced', {
                analysis: data.analysis,
                options: {
                    includeOutlookFixes: true,
                    includeDarkMode: true,
                    includeResponsive: true,
                    title: 'Email Template',
                    enableImageSlots: true // New parameter for editable images
                }
            });

            setHtml(genResponse.data.html);
            setMetrics(genResponse.data.metrics);

            // Extract image slots from analysis
            const imageComponents = data.analysis.components?.filter(c => c.type === 'image') || [];
            const initialAssets = imageComponents.map((img, idx) => ({
                id: `img-${idx}`,
                slotId: `slot-${idx}`,
                name: img.altText || `Image ${idx + 1}`,
                url: img.content || 'https://via.placeholder.com/600x400/f0f0f0/666666?text=Click+to+Upload',
                type: img.imageType || 'content', // logo, hero, content, icon
                dimensions: img.coords || { w: 600, h: 400 }
            }));

            setAssets(initialAssets);
            setActiveTab('visual-editor');
            setSuccess('Email generated! Click on any image to replace it.');
        } catch (err) {
            console.error('Error:', err);
            setError(err.response?.data?.error || 'Failed to process design');
        } finally {
            setLoading(false);
        }
    };

    // Asset Management Functions
    const handleAssetUpload = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            if (file.type.match(/image\/(png|jpg|jpeg|gif|svg)/)) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const newAsset = {
                        id: `asset-${Date.now()}-${Math.random()}`,
                        name: file.name,
                        url: event.target.result,
                        type: 'uploaded',
                        file: file
                    };
                    setAssets(prev => [...prev, newAsset]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const addImageFromUrl = () => {
        if (!imageUrl.trim()) return;

        const newAsset = {
            id: `asset-${Date.now()}`,
            name: `Image from URL`,
            url: imageUrl,
            type: 'url'
        };

        if (selectedImageSlot) {
            // Replace specific slot
            replaceImageInHtml(selectedImageSlot, imageUrl);
            setShowImageModal(false);
            setImageUrl('');
            setSelectedImageSlot(null);
        } else {
            // Add to asset library
            setAssets(prev => [...prev, newAsset]);
        }
    };

    const replaceImageInHtml = (slotId, newUrl) => {
        // Update HTML by replacing image src with data-slot-id attribute
        const updatedHtml = html.replace(
            new RegExp(`(<img[^>]*data-slot-id="${slotId}"[^>]*src=")[^"]*("[^>]*>)`, 'g'),
            `$1${newUrl}$2`
        );
        setHtml(updatedHtml);

        // Update assets
        setAssets(prev => prev.map(asset =>
            asset.slotId === slotId ? { ...asset, url: newUrl } : asset
        ));

        setSuccess(`Image replaced successfully!`);
    };

    const openImageModal = (slotId) => {
        setSelectedImageSlot(slotId);
        setShowImageModal(true);
    };

    const deleteAsset = (assetId) => {
        setAssets(prev => prev.filter(a => a.id !== assetId));
    };

    // Enable interactive editing in iframe
    useEffect(() => {
        if (editorMode && iframeRef.current && html) {
            try {
                const iframe = iframeRef.current;
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                // Add click handlers to all images
                const images = iframeDoc.querySelectorAll('img[data-slot-id]');
                images.forEach(img => {
                    img.style.cursor = 'pointer';
                    img.style.border = '2px dashed #3b7dd6';
                    img.onclick = () => {
                        const slotId = img.getAttribute('data-slot-id');
                        openImageModal(slotId);
                    };
                });
            } catch (e) {
                console.warn('Cannot add iframe interactivity:', e);
            }
        }
    }, [editorMode, html]);

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

    const downloadWithAssets = async () => {
        // Create a zip file with HTML + all images
        // This would require JSZip or similar library
        setSuccess('Exporting email template with all assets...');
        // TODO: Implement zip creation
    };

    return (
        <div className="h-screen bg-[#020617] text-slate-200 p-8 flex flex-col overflow-hidden">
            <div className="max-w-[1800px] mx-auto w-full flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                                <Mail className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter">
                                Email Engine <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Pro</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 text-lg font-medium">Visual Editor with Asset Management</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowAssetManager(!showAssetManager)}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all border border-white/10"
                        >
                            <FolderOpen className="w-5 h-5" />
                            Assets ({assets.length})
                        </button>
                        {metrics && (
                            <div className="bg-slate-900/50 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/5 flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Quality</p>
                                    <p className={`text-3xl font-black ${metrics.qualityScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {metrics.qualityScore}%
                                    </p>
                                </div>
                                <ShieldCheck className={`w-10 h-10 ${metrics.qualityScore >= 90 ? 'text-emerald-400' : 'text-slate-600'}`} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-8 bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
                        <p className="text-rose-100/80 font-medium">{error}</p>
                    </div>
                )}

                {success && !error && (
                    <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <p className="font-bold text-emerald-200 text-sm">{success}</p>
                    </div>
                )}

                <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden">
                    {/* Left Sidebar - Upload & Assets */}
                    <div className="col-span-3 space-y-6 overflow-y-auto">
                        {/* Upload Section */}
                        <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Design Input</h2>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative rounded-[2rem] p-10 text-center cursor-pointer transition-all duration-500 border-2 border-dashed ${uploadedImage ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 hover:border-blue-500/40'
                                    }`}
                            >
                                {uploadedImage ? (
                                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10">
                                        <img src={uploadedImage} alt="Design" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="py-6">
                                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Upload className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <p className="text-white font-black text-lg mb-2">Upload Design</p>
                                        <p className="text-slate-500 text-xs">PNG/JPG Only</p>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept="image/png,image/jpeg" />
                            </div>
                        </div>

                        {/* Quick Assets */}
                        {assets.length > 0 && (
                            <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Image Assets</h2>
                                    <button
                                        onClick={() => assetInputRef.current?.click()}
                                        className="p-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-all"
                                    >
                                        <Plus className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                    {assets.slice(0, 5).map(asset => (
                                        <div key={asset.id} className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-white/5 group hover:border-blue-500/30 transition-all">
                                            <img src={asset.url} alt={asset.name} className="w-12 h-12 rounded-lg object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-300 truncate">{asset.name}</p>
                                                <p className="text-[10px] text-slate-600 capitalize">{asset.type}</p>
                                            </div>
                                            <button
                                                onClick={() => deleteAsset(asset.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 rounded transition-all"
                                            >
                                                <Trash2 className="w-4 h-4 text-rose-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {assets.length > 5 && (
                                    <button
                                        onClick={() => setShowAssetManager(true)}
                                        className="w-full mt-4 py-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-all"
                                    >
                                        View All {assets.length} Assets →
                                    </button>
                                )}
                                <input ref={assetInputRef} type="file" multiple onChange={handleAssetUpload} className="hidden" accept="image/*" />
                            </div>
                        )}
                    </div>

                    {/* Main Editor */}
                    <div className="col-span-9 flex flex-col overflow-hidden">
                        <div className="bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-white/5 overflow-hidden flex-1 flex flex-col">
                            {/* Toolbar */}
                            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/5">
                                    {[
                                        { id: 'design', label: 'Design', icon: Monitor },
                                        { id: 'visual-editor', label: 'Visual Editor', icon: Edit2, enabled: !!html },
                                        { id: 'code', label: 'Code', icon: Code, enabled: !!html },
                                        { id: 'preview', label: 'Preview', icon: Eye, enabled: !!html },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            disabled={tab.enabled === false}
                                            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2.5 transition-all ${activeTab === tab.id
                                                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                                                : 'text-slate-500 hover:text-slate-300 disabled:opacity-20'
                                                }`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {html && (
                                    <div className="flex gap-3">
                                        {activeTab === 'visual-editor' && (
                                            <button
                                                onClick={() => setEditorMode(!editorMode)}
                                                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${editorMode
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-800 text-slate-400'
                                                    }`}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                {editorMode ? 'Editing Active' : 'Enable Editing'}
                                            </button>
                                        )}
                                        <button onClick={copyHTML} className="p-3 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-2xl border border-white/5 transition-all">
                                            <Copy className="w-5 h-5" />
                                        </button>
                                        <button onClick={downloadHTML} className="py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3">
                                            <Download className="w-5 h-5" />
                                            Export HTML
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 relative overflow-hidden">
                                {activeTab === 'design' && (
                                    <div className="h-full flex flex-col items-center justify-center p-16 text-center">
                                        <div className="w-32 h-32 bg-slate-950 rounded-[2.5rem] flex items-center justify-center border border-white/10 mb-10">
                                            <ImageIcon className="w-12 h-12 text-blue-400" />
                                        </div>
                                        <h3 className="text-3xl font-black text-white mb-4">Upload Your Email Design</h3>
                                        <p className="text-slate-500 max-w-md mb-12 text-lg">
                                            Our AI will analyze your design and create editable HTML with smart image placeholders
                                        </p>
                                    </div>
                                )}

                                {activeTab === 'visual-editor' && html && (
                                    <div className="h-full p-8 flex flex-col">
                                        <div className="flex-1 bg-white rounded-[2rem] overflow-hidden flex flex-col">
                                            {editorMode && (
                                                <div className="bg-blue-600 text-white text-center py-2 text-sm font-bold flex-shrink-0">
                                                    🎯 Click on any image to replace it
                                                </div>
                                            )}
                                            <iframe
                                                ref={iframeRef}
                                                srcDoc={html}
                                                className="w-full flex-1 border-0"
                                                title="Visual Editor"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'code' && html && (
                                    <div className="h-full p-8">
                                        <div className="h-full bg-[#020617] rounded-[2rem] p-8 overflow-hidden border border-white/5">
                                            <textarea
                                                value={html}
                                                onChange={(e) => setHtml(e.target.value)}
                                                className="w-full h-full bg-transparent text-blue-100 font-mono text-sm resize-none focus:outline-none"
                                                spellCheck={false}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'preview' && html && (
                                    <div className="h-full p-8 flex flex-col">
                                        <div className="flex gap-2 mb-6 p-1.5 bg-slate-950 border border-white/10 rounded-2xl w-fit flex-shrink-0">
                                            {[
                                                { id: 'desktop-light', icon: Monitor, label: 'Desktop' },
                                                { id: 'mobile-light', icon: Smartphone, label: 'Mobile' },
                                                { id: 'desktop-dark', icon: Moon, label: 'Dark' }
                                            ].map(mode => (
                                                <button
                                                    key={mode.id}
                                                    onClick={() => setPreviewMode(mode.id)}
                                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${previewMode === mode.id ? 'bg-blue-600 text-white' : 'text-slate-500'
                                                        }`}
                                                >
                                                    <mode.icon className="w-4 h-4" />
                                                    {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex-1 flex justify-center overflow-hidden">
                                            <div
                                                className={`bg-white rounded-2xl overflow-hidden h-full ${previewMode.includes('dark') ? 'invert hue-rotate-180' : ''}`}
                                                style={{ width: previewMode.includes('mobile') ? '375px' : '100%', maxWidth: '100%' }}
                                            >
                                                <iframe srcDoc={html} className="w-full h-full border-0" title="Preview" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Upload Modal */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
                    <div className="bg-slate-900 rounded-3xl border border-white/10 p-8 max-w-2xl w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white">Replace Image</h3>
                            <button onClick={() => { setShowImageModal(false); setSelectedImageSlot(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* URL Input */}
                            <div>
                                <label className="text-sm font-bold text-slate-300 mb-2 block">Image URL</label>
                                <div className="flex gap-3">
                                    <input
                                        type="url"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        className="flex-1 px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        onClick={addImageFromUrl}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-slate-900 text-slate-500 font-bold">OR</span>
                                </div>
                            </div>

                            {/* Asset Library */}
                            <div>
                                <label className="text-sm font-bold text-slate-300 mb-2 block">Choose from Assets</label>
                                <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-1">
                                    {assets.map(asset => (
                                        <button
                                            key={asset.id}
                                            onClick={() => {
                                                if (selectedImageSlot) {
                                                    replaceImageInHtml(selectedImageSlot, asset.url);
                                                    setShowImageModal(false);
                                                    setSelectedImageSlot(null);
                                                }
                                            }}
                                            className="aspect-square rounded-xl overflow-hidden border-2 border-white/10 hover:border-blue-500 transition-all group"
                                        >
                                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Upload New */}
                            <button
                                onClick={() => assetInputRef.current?.click()}
                                className="w-full py-4 border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-xl text-slate-400 hover:text-white font-bold transition-all flex items-center justify-center gap-3"
                            >
                                <Upload className="w-5 h-5" />
                                Upload New Image
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Asset Manager Modal */}
            {showAssetManager && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
                    <div className="bg-slate-900 rounded-3xl border border-white/10 p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white">Asset Manager ({assets.length})</h3>
                            <button onClick={() => setShowAssetManager(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-6 gap-4">
                            {assets.map(asset => (
                                <div key={asset.id} className="group relative">
                                    <div className="aspect-square rounded-xl overflow-hidden border border-white/10">
                                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 mt-2 truncate">{asset.name}</p>
                                    <button
                                        onClick={() => deleteAsset(asset.id)}
                                        className="absolute top-2 right-2 p-2 bg-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => assetInputRef.current?.click()}
                                className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-blue-500/50 flex items-center justify-center transition-all group"
                            >
                                <Plus className="w-8 h-8 text-slate-600 group-hover:text-blue-400 transition-all" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white font-bold">Analyzing design...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
