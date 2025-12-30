import { useState } from 'react'
import { Play, Loader2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import ResultsViewer from '../components/ResultsViewer'

export default function PageSpeedAnalyzer() {
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState(null)

    const handleAnalyze = async () => {
        setIsLoading(true)
        setResults(null)

        try {
            const response = await axios.get('/api/pagespeed', {
                params: {
                    url: url,
                    device: 'mobile'
                }
            })

            setResults(response.data)
        } catch (error) {
            console.error('Performance analysis failed:', error)
            setResults({
                error: true,
                message: error.response?.data?.error || error.message || 'Failed to analyze performance. Please check the URL and try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">PageSpeed Analyzer</h1>
                <p className="text-gray-400">Measure Core Web Vitals and performance metrics</p>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Website URL</label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder-gray-500 focus-ring"
                    />
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={!url || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent-purple text-white rounded-lg font-medium hover:shadow-glow transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Analyzing Performance...</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            <span>Run PageSpeed Test</span>
                        </>
                    )}
                </button>
            </div>

            {results && !results.error && <ResultsViewer results={results} type="pagespeed" />}

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
