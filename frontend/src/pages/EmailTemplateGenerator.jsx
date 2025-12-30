import { useState, useRef } from 'react';
import { Upload, Download, Copy, CheckCircle, AlertCircle, Zap, Eye, Code, Settings } from 'lucide-react';
import axios from 'axios';

export default function EmailTemplateGenerator() {
    const [uploadedImage, setUploadedImage] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [html, setHtml] = useState('');
    const [validation, setValidation] = useState(null);
    const [accessibility, setAccessibility] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('design');
    const [previewMode, setPreviewMode] = useState('desktop-light');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);

    // Handle file upload
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
            setError('Please upload a PNG or JPG image');
            return;
        }

        setUploadedImage(URL.createObjectURL(file));
        setError(null);
        setLoading(true);

        try {
            // Analyze design
            const formData = new FormData();
            formData.append('image', file);

            const { data } = await axios.post('/api/email/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setAnalysis(data.analysis);
            setSuccess('Design analyzed successfully! Generating HTML...');

            // Generate HTML from analysis
            await generateHTMLFromAnalysis(data.analysis);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to analyze design');
        } finally {
            setLoading(false);
        }
    };

    // Generate HTML from analysis
    const generateHTMLFromAnalysis = async (analysisData) => {
        try {
            const { data } = await axios.post('/api/email/generate', {
                analysis: analysisData,
                options: {
                    includeOutlookFixes: true,
                    includeDarkMode: true,
                    includeResponsive: true,
                    title: 'Email Template'
                }
            });

            setHtml(data.html);
            setValidation(data.validation);
            setAccessibility(data.accessibility);
            setActiveTab('editor');
            setSuccess('Email HTML generated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate email');
        }
    };

    // Generate basic template
    const generateBasicTemplate = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data } = await axios.post('/api/email/generate-basic', {
                options: {
                    includeOutlookFixes: true,
                    includeDarkMode: true,
                    includeResponsive: true
                }
            });

            setHtml(data.html);
            setValidation(data.validation);
            setAccessibility(data.accessibility);
            setActiveTab('editor');
            setSuccess('Basic template generated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate template');
        } finally {
            setLoading(false);
        }
    };

    // Validate HTML
    const validateHTML = async () => {
        if (!html) return;

        setLoading(true);
        try {
            const { data } = await axios.post('/api/email/validate', { html });
            setValidation(data.validation);
            setAccessibility(data.accessibility);
            setSuccess('Email validated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to validate email');
        } finally {
            setLoading(false);
        }
    };

    // Auto-fix HTML
    const autoFix = async () => {
        if (!html) return;

        setLoading(true);
        try {
            const { data } = await axios.post('/api/email/auto-fix', { html });
            setHtml(data.html);
            setValidation(data.validation);
            setAccessibility(data.accessibility);
            setSuccess('Email auto-fixed successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to auto-fix email');
        } finally {
            setLoading(false);
        }
    };

    // Copy HTML to clipboard
    const copyHTML = () => {
        navigator.clipboard.writeText(html);
        setSuccess('HTML copied to clipboard!');
    };

    // Download HTML
    const downloadHTML = () => {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'email-template.html';
        a.click();
        URL.revokeObjectURL(url);
        setSuccess('Email downloaded successfully!');
    };

    // Calculate overall quality score
    const qualityScore = validation && accessibility
        ? Math.round((validation.scores.compatibility * 0.4) + (accessibility.score * 0.4) + ((100 - validation.scores.spamScore.score) * 0.2))
        : 0;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Template Generator & Tester</h1>
                    <p className="text-gray-600">Upload a design, generate production-ready HTML, validate for all email clients</p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {success}
                    </div>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Upload & Analysis */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-xl font-semibold mb-4">Design Upload</h2>

                            {/* Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                            >
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 mb-2">Click to upload email design</p>
                                <p className="text-sm text-gray-500">PNG or JPG (Max 10MB)</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>

                            {uploadedImage && (
                                <div className="mt-4">
                                    <img src={uploadedImage} alt="Uploaded design" className="w-full rounded-lg border" />
                                </div>
                            )}

                            <div className="mt-4">
                                <button
                                    onClick={generateBasicTemplate}
                                    disabled={loading}
                                    className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    <Settings className="w-4 h-4 inline mr-2" />
                                    Generate Basic Template
                                </button>
                            </div>

                            {/* Analysis Summary */}
                            {analysis && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-3">Design Analysis</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Layout:</span>
                                            <span className="font-medium">{analysis.layout?.type}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Style:</span>
                                            <span className="font-medium capitalize">{analysis.style}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Components:</span>
                                            <span className="font-medium">{analysis.components?.length || 0}</span>
                                        </div>
                                        {analysis.colors && (
                                            <div className="mt-3">
                                                <p className="text-gray-600 mb-2">Color Palette:</p>
                                                <div className="flex gap-2">
                                                    {Object.entries(analysis.colors).slice(0, 5).map(([key, color]) => (
                                                        <div
                                                            key={key}
                                                            className="w-8 h-8 rounded border"
                                                            style={{ backgroundColor: color }}
                                                            title={`${key}: ${color}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Quality Score */}
                            {validation && accessibility && (
                                <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                                    <h3 className="font-semibold mb-3">Quality Score</h3>
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-gray-900 mb-2">{qualityScore}</div>
                                        <div className="text-sm text-gray-600 mb-4">
                                            {qualityScore >= 90 ? 'Excellent' : qualityScore >= 70 ? 'Good' : 'Needs Improvement'}
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span>Compatibility:</span>
                                                <span className="font-medium">{validation.scores.compatibility}%</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Accessibility:</span>
                                                <span className="font-medium">{accessibility.score}%</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Spam Risk:</span>
                                                <span className="font-medium">{validation.scores.spamScore.risk}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle Panel - Editor & Preview */}
                    <div className="lg:col-span-2">
                        {/* Tab Navigation */}
                        <div className="bg-white rounded-t-lg shadow-sm border-b">
                            <div className="flex gap-4 px-6">
                                <button
                                    onClick={() => setActiveTab('design')}
                                    className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'design'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    Design
                                </button>
                                <button
                                    onClick={() => setActiveTab('editor')}
                                    className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'editor'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    disabled={!html}
                                >
                                    <Code className="w-4 h-4 inline mr-2" />
                                    HTML Editor
                                </button>
                                <button
                                    onClick={() => setActiveTab('preview')}
                                    className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'preview'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    disabled={!html}
                                >
                                    <Eye className="w-4 h-4 inline mr-2" />
                                    Preview
                                </button>
                                <button
                                    onClick={() => setActiveTab('issues')}
                                    className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'issues'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    disabled={!validation}
                                >
                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                    Issues
                                    {validation && (validation.issues.length + validation.warnings.length) > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                                            {validation.issues.length + validation.warnings.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="bg-white rounded-b-lg shadow-sm p-6 min-h-[600px]">
                            {activeTab === 'design' && (
                                <div className="text-center py-20">
                                    <Upload className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Upload Email Design</h3>
                                    <p className="text-gray-500 mb-6">Upload a PNG or JPG of your email design to get started</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Choose File
                                    </button>
                                </div>
                            )}

                            {activeTab === 'editor' && html && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold">HTML Code</h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={copyHTML}
                                                className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                                            >
                                                <Copy className="w-4 h-4 inline mr-2" />
                                                Copy
                                            </button>
                                            <button
                                                onClick={downloadHTML}
                                                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                                            >
                                                <Download className="w-4 h-4 inline mr-2" />
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={html}
                                        onChange={(e) => setHtml(e.target.value)}
                                        className="w-full h-[500px] font-mono text-sm border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        spellCheck={false}
                                    />
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={validateHTML}
                                            disabled={loading}
                                            className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-4 h-4 inline mr-2" />
                                            Validate
                                        </button>
                                        <button
                                            onClick={autoFix}
                                            disabled={loading}
                                            className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                        >
                                            <Zap className="w-4 h-4 inline mr-2" />
                                            Auto-Fix Issues
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'preview' && html && (
                                <div>
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            onClick={() => setPreviewMode('desktop-light')}
                                            className={`py-2 px-4 rounded-lg font-medium transition-colors ${previewMode === 'desktop-light'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Desktop Light
                                        </button>
                                        <button
                                            onClick={() => setPreviewMode('desktop-dark')}
                                            className={`py-2 px-4 rounded-lg font-medium transition-colors ${previewMode === 'desktop-dark'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Desktop Dark
                                        </button>
                                        <button
                                            onClick={() => setPreviewMode('mobile-light')}
                                            className={`py-2 px-4 rounded-lg font-medium transition-colors ${previewMode === 'mobile-light'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Mobile Light
                                        </button>
                                        <button
                                            onClick={() => setPreviewMode('mobile-dark')}
                                            className={`py-2 px-4 rounded-lg font-medium transition-colors ${previewMode === 'mobile-dark'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Mobile Dark
                                        </button>
                                    </div>
                                    <div
                                        className={`border rounded-lg overflow-hidden ${previewMode.includes('dark') ? 'bg-gray-900' : 'bg-white'
                                            }`}
                                        style={{
                                            maxWidth: previewMode.includes('mobile') ? '375px' : '100%',
                                            margin: '0 auto'
                                        }}
                                    >
                                        <iframe
                                            srcDoc={html}
                                            className="w-full h-[600px] border-0"
                                            title="Email Preview"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'issues' && validation && accessibility && (
                                <div className="space-y-6">
                                    {/* Validation Issues */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Validation Issues</h3>
                                        {validation.issues.length === 0 ? (
                                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                                                ✓ No validation issues found!
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {validation.issues.slice(0, 10).map((issue, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3 rounded-lg border ${issue.severity === 'error'
                                                            ? 'bg-red-50 border-red-200'
                                                            : issue.severity === 'warning'
                                                                ? 'bg-yellow-50 border-yellow-200'
                                                                : 'bg-blue-50 border-blue-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="font-medium capitalize">{issue.severity}</div>
                                                                <div className="text-sm mt-1">{issue.message}</div>
                                                            </div>
                                                            {issue.autoFix && (
                                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                                    Auto-fixable
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Accessibility Issues */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Accessibility Issues</h3>
                                        {accessibility.issues.length === 0 ? (
                                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                                                ✓ WCAG 2.1 {accessibility.level} compliant!
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {accessibility.issues.slice(0, 10).map((issue, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3 rounded-lg border ${issue.severity === 'error'
                                                            ? 'bg-red-50 border-red-200'
                                                            : issue.severity === 'warning'
                                                                ? 'bg-yellow-50 border-yellow-200'
                                                                : 'bg-blue-50 border-blue-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="font-medium capitalize">
                                                                    {issue.severity} - WCAG {issue.wcagCriterion}
                                                                </div>
                                                                <div className="text-sm mt-1">{issue.message}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Spam Check */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Spam Check</h3>
                                        <div className="bg-white border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span>Spam Risk Level:</span>
                                                <span className={`font-bold ${validation.scores.spamScore.risk === 'low' ? 'text-green-600' :
                                                    validation.scores.spamScore.risk === 'medium' ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                    {validation.scores.spamScore.risk.toUpperCase()}
                                                </span>
                                            </div>
                                            {validation.scores.spamScore.issues.length > 0 && (
                                                <div className="mt-3 text-sm text-gray-600">
                                                    <p className="font-medium mb-1">Issues found:</p>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {validation.scores.spamScore.issues.map((issue, idx) => (
                                                            <li key={idx}>{issue}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Auto-fix button */}
                                    {(validation.issues.some(i => i.autoFix) || accessibility.issues.some(i => i.autoFix)) && (
                                        <button
                                            onClick={autoFix}
                                            disabled={loading}
                                            className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                        >
                                            <Zap className="w-5 h-5 inline mr-2" />
                                            Auto-Fix All Issues
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
