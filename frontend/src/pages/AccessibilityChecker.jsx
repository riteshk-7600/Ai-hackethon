import { useState } from 'react'
import { Play, Loader2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import ResultsViewer from '../components/ResultsViewer'

export default function AccessibilityChecker() {
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState(null)

    const handleRunTest = async () => {
        // Validate URL before proceeding
        if (!url || url.trim() === '') {
            setResults({
                error: true,
                message: 'Please enter a URL to check.'
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
            const response = await axios.post('/api/audit/accessibility', { url: processedUrl })
            setResults(response.data)
        } catch (error) {
            console.error('Accessibility check failed:', error)
            setResults({
                error: true,
                message: error.response?.data?.error || error.message || 'Failed to check accessibility. Please check the URL and try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Accessibility Checker</h1>
                <p className="text-gray-400">Ensure WCAG 2.1 compliance and inclusive design</p>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Website URL</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="example.com or https://example.com"
                        className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder-gray-500 focus-ring"
                    />
                </div>

                <button
                    onClick={handleRunTest}
                    disabled={!url || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-teal to-primary text-white rounded-lg font-medium hover:shadow-glow transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Analyzing Accessibility...</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            <span>Run Accessibility Test</span>
                        </>
                    )}
                </button>
            </div>

            {results && !results.error && <ResultsViewer results={results} type="accessibility" />}

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
