import { useState } from 'react'
import { Play, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import axios from 'axios'
import UXAuditorResults from '../components/UXAuditorResults'

export default function WebsiteAuditor() {
    const [url, setUrl] = useState('')
    const [platform, setPlatform] = useState('custom')
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState(null)

    const handleRunAudit = async () => {
        // Validate URL before proceeding
        if (!url || url.trim() === '') {
            setResults({
                error: true,
                message: 'Please enter a valid URL to audit.'
            })
            return
        }

        // Auto-add https:// if no protocol specified
        let processedUrl = url.trim()
        if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
            processedUrl = 'https://' + processedUrl
        }

        setIsLoading(true)
        setResults(null)

        try {
            const response = await axios.post('/api/audit/website', { url: processedUrl, platform })
            setResults(response.data)
        } catch (error) {
            console.error('Audit failed:', error)
            setResults({
                error: true,
                message: error.response?.data?.error || error.message || 'Failed to audit website. Please check the URL and try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary via-accent-purple to-primary bg-size-200 animate-gradient rounded-xl p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="w-8 h-8 text-white" />
                    <h1 className="text-4xl font-bold text-white">Frontend & UX Auditor AI</h1>
                </div>
                <p className="text-gray-200 text-lg max-w-3xl mx-auto">
                    World-class pixel-perfect analysis • Deep DOM inspection • Platform auto-detection • Developer-ready CSS fixes
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-primary mb-1">100%</div>
                    <div className="text-sm text-gray-400">Accurate Analysis</div>
                </div>
                <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-accent-purple mb-1">6+</div>
                    <div className="text-sm text-gray-400">Issue Categories</div>
                </div>
                <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">Pixel</div>
                    <div className="text-sm text-gray-400">Level Precision</div>
                </div>
                <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">Auto</div>
                    <div className="text-sm text-gray-400">CSS Fixes</div>
                </div>
            </div>

            {/* Input Section */}
            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        🌐 Website URL
                    </label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="example.com or https://example.com"
                        className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder-gray-500 focus-ring"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        🎨 Platform (Optional - Auto-detected)
                    </label>
                    <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white focus-ring"
                    >
                        <option value="custom">Auto-Detect</option>
                        <option value="wordpress">WordPress</option>
                        <option value="elementor">Elementor</option>
                        <option value="gutenberg">Gutenberg</option>
                        <option value="shopify">Shopify</option>
                        <option value="woocommerce">WooCommerce</option>
                        <option value="webflow">Webflow</option>
                        <option value="squarespace">Squarespace</option>
                    </select>
                </div>

                <button
                    onClick={handleRunAudit}
                    disabled={!url || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary to-accent-purple text-white rounded-lg font-medium hover:shadow-glow transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Performing Deep Analysis...</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-6 h-6" />
                            <span>Run UX Audit</span>
                        </>
                    )}
                </button>

                <div className="text-xs text-gray-500 text-center">
                    Analyzes: Layout • Spacing • Typography • Colors • Components • Responsiveness
                </div>
            </div>

            {/* Results */}
            {results && !results.error && <UXAuditorResults results={results} />}

            {results && results.error && (
                <div className="bg-surface-card border border-red-500/50 rounded-xl p-6">
                    <div className="flex items-center gap-3 text-red-400">
                        <AlertCircle className="w-6 h-6" />
                        <p>{results.message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
