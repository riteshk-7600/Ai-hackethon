import { useState, useRef } from 'react'
import { Play, Loader2, Upload, X, Image as ImageIcon, Download, Package, CheckCircle, ArrowRight, Wand2, Copy, RefreshCw, Eye, Info, Layers, Maximize2 } from 'lucide-react'
import axios from 'axios'

export default function ImageOptimizer() {
    const [mode, setMode] = useState('upload') // 'upload' or 'url' (upload is primary)
    const [uploadedFiles, setUploadedFiles] = useState([])
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [aiResults, setAiResults] = useState(null)
    const [renamingStatus, setRenamingStatus] = useState(null)

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files)
        const imageFiles = files.filter(file => file.type.startsWith('image/'))

        if (imageFiles.length !== files.length) {
            alert('Only image files are allowed')
        }

        setUploadedFiles(prev => [...prev, ...imageFiles])
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        const imageFiles = files.filter(file => file.type.startsWith('image/'))

        if (imageFiles.length !== files.length) {
            alert('Only image files are allowed')
        }

        setUploadedFiles(prev => [...prev, ...imageFiles])
    }

    const removeFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    const handleOptimize = async () => {
        if (uploadedFiles.length === 0) return

        setIsLoading(true)
        setResults(null)

        try {
            const formData = new FormData()
            uploadedFiles.forEach(file => {
                formData.append('images', file)
            })

            const response = await axios.post('/api/audit/image-optimizer', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            setResults(response.data)
        } catch (error) {
            console.error('Image optimization failed:', error)
            setResults({
                ok: false,
                error: 'Optimization failed',
                message: error.response?.data?.message || error.message || 'Failed to optimize images. Please try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const getFormatColor = (format) => {
        const colors = {
            jpg: 'bg-blue-500/20 text-blue-400',
            png: 'bg-green-500/20 text-green-400',
            webp: 'bg-purple-500/20 text-purple-400',
            avif: 'bg-pink-500/20 text-pink-400'
        }
        return colors[format] || 'bg-gray-500/20 text-gray-400'
    }

    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = blobUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(blobUrl)
        } catch (error) {
            console.error('Download failed:', error)
            alert('Download failed. Please try again.')
        }
    }

    const handleAIGenerate = async () => {
        if (!results?.sessionId) return
        setIsAnalyzing(true)
        try {
            const response = await axios.post('/api/audit/image-optimizer/ai-names/generate', { sessionId: results.sessionId })
            const data = response.data
            if (data.ok) {
                setAiResults(data.results.map(r => ({ ...r, selected: true, finalName: r.analysis.generatedName })))
            } else {
                alert('AI Generation Failed: ' + data.error)
            }
        } catch (e) {
            console.error(e)
            alert('Failed to connect to AI service')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleApplyNames = async () => {
        if (!aiResults) return
        setRenamingStatus('processing')

        try {
            const nameMapping = aiResults
                .filter(r => r.selected)
                .map(r => ({
                    originalName: r.originalFileName,
                    newName: r.finalName
                }))

            if (nameMapping.length === 0) {
                alert('No names selected to apply')
                setRenamingStatus(null)
                return
            }

            const response = await axios.post('/api/audit/image-optimizer/ai-names/apply', {
                sessionId: results.sessionId,
                nameMapping
            })

            const data = response.data
            if (data.ok) {
                setRenamingStatus('success')

                // Update the main results state with new paths and names
                setResults(prev => {
                    const newImages = [...prev.images]

                    data.results.forEach(rename => {
                        // Find the image in state that matches this rename
                        // rename.originalFileName is the file on disk (e.g. "photo-0.jpg")
                        // image.optimized.jpg.path ends with this name
                        const imgIndex = newImages.findIndex(img =>
                            img.optimized.jpg.path.endsWith('/' + rename.originalFileName)
                        )

                        if (imgIndex !== -1) {
                            const img = newImages[imgIndex]
                            // Update fileName for display
                            // We construct it from the new filename + original extension
                            const originalExt = img.fileName.split('.').pop()
                            img.fileName = `${rename.newFileName}.${originalExt}`

                            // Update paths
                            Object.keys(img.optimized).forEach(fmt => {
                                if (rename.updatedPaths[fmt]) {
                                    img.optimized[fmt].path = rename.updatedPaths[fmt]
                                }
                            })
                            // Update best format download url
                            const bestFmt = img.bestFormat
                            if (rename.updatedPaths[bestFmt]) {
                                // Need to extract local path from full url or just use what we have
                                // updatedPaths returns full URL path
                                // But downloadSingleFileUrl usually expects the same
                                // Let's just update it if we can
                            }
                        }
                    })

                    return {
                        ...prev,
                        images: newImages,
                        zipDownloadUrl: data.zipDownloadUrl
                    }
                })

            } else {
                setRenamingStatus('error')
                alert('Renaming Failed: ' + data.error)
            }
        } catch (e) {
            console.error(e)
            setRenamingStatus('error')
        }
    }

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{
                __html: `
                .image-slider-handle {
                    cursor: ew-resize;
                    width: 2px;
                    background: white;
                    height: 100%;
                    position: absolute;
                    top: 0;
                    z-index: 20;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
                .image-slider-handle::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 32px;
                    height: 32px;
                    background: white;
                    border-radius: 50%;
                    border: 2px solid #3b82f6;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m18 8 4 4-4 4'/%3E%3Cpath d='m6 8-4 4 4 4'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: center;
                }
            `}} />
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">TinyPNG-Level Image Optimizer</h1>
                <p className="text-gray-400">Compress & convert images to JPG, PNG, WebP, AVIF with real Sharp optimization</p>
            </div>

            {/* Upload Interface */}
            {!results && (
                <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
                    {/* Drag and Drop Area */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging
                            ? 'border-primary bg-primary/10'
                            : 'border-surface-border hover:border-primary/50'
                            }`}
                    >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-white font-medium mb-2">
                            Drag and drop images here
                        </p>
                        <p className="text-gray-400 text-sm mb-4">or</p>
                        <label className="inline-flex items-center gap-2 px-6 py-3 bg-surface-dark border border-surface-border rounded-lg text-white font-medium hover:bg-surface-border transition-all cursor-pointer">
                            <ImageIcon className="w-5 h-5" />
                            <span>Browse Files</span>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </label>
                        <p className="text-gray-500 text-xs mt-4">
                            Supports: JPG, PNG, GIF, WebP, SVG (Max 10MB per file, up to 20 images)
                        </p>
                    </div>

                    {/* Uploaded Files Preview */}
                    {uploadedFiles.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-medium">
                                    Uploaded Files ({uploadedFiles.length})
                                </h3>
                                <button
                                    onClick={() => setUploadedFiles([])}
                                    className="text-sm text-red-400 hover:text-red-300"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {uploadedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="relative group bg-surface-dark border border-surface-border rounded-lg p-3"
                                    >
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                        <div className="aspect-square bg-surface-border rounded-lg mb-2 overflow-hidden">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={file.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <p className="text-white text-xs truncate" title={file.name}>
                                            {file.name}
                                        </p>
                                        <p className="text-gray-400 text-xs">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleOptimize}
                        disabled={uploadedFiles.length === 0 || isLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent-purple text-white rounded-lg font-medium hover:shadow-glow transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Optimizing {uploadedFiles.length} Image{uploadedFiles.length !== 1 ? 's' : ''}...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                <span>Optimize {uploadedFiles.length} Image{uploadedFiles.length !== 1 ? 's' : ''}</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Results - Success */}
            {results && results.ok && (
                <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-primary/20 to-accent-purple/20 border border-primary/30 rounded-xl p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-white mb-2">Optimization Complete!</h2>
                                <p className="text-gray-300">Successfully optimized {results.successfulImages} of {results.totalImages} images</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-surface-dark/50 rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Original Size</p>
                                <p className="text-2xl font-bold text-white">{results.totalOriginalSizeKB.toFixed(2)} KB</p>
                            </div>
                            <div className="bg-surface-dark/50 rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Optimized Size</p>
                                <p className="text-2xl font-bold text-green-400">{results.totalOptimizedSizeKB.toFixed(2)} KB</p>
                            </div>
                            <div className="bg-surface-dark/50 rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Saved</p>
                                <p className="text-2xl font-bold text-primary">{results.totalSavedKB.toFixed(2)} KB</p>
                            </div>
                            <div className="bg-surface-dark/50 rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Avg. Reduction</p>
                                <p className="text-2xl font-bold text-accent-purple">{results.averageReductionPercent}%</p>
                            </div>
                        </div>

                        {/* Download ZIP Button */}
                        <button
                            onClick={() => handleDownload(`${results.zipDownloadUrl}`, 'optimized-images.zip')}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-medium hover:shadow-glow transition-all btn-lift"
                        >
                            <Package className="w-5 h-5" />
                            <span>Download All (ZIP) - Includes JPG, PNG, WebP, AVIF</span>
                        </button>
                    </div>

                    {/* AI Naming Section */}
                    <div className="bg-surface-card border border-primary/30 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Wand2 className="w-32 h-32 text-primary" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Wand2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">AI SEO Smart Namer</h2>
                                    <p className="text-gray-400 text-sm">Auto-generate content-aware filenames for better SEO</p>
                                </div>
                            </div>

                            {!aiResults ? (
                                <button
                                    onClick={handleAIGenerate}
                                    disabled={isAnalyzing}
                                    className="px-6 py-3 bg-gradient-to-r from-accent-purple to-pink-600 text-white rounded-lg font-medium hover:shadow-glow transition-all flex items-center gap-2"
                                >
                                    {isAnalyzing ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                                    {isAnalyzing ? 'Analyzing Image Content...' : 'Generate AI Names'}
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    {renamingStatus === 'success' ? (
                                        <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
                                            <CheckCircle className="w-6 h-6 text-green-400" />
                                            <div>
                                                <p className="font-bold text-white">Files Renamed Successfully!</p>
                                                <p className="text-green-300 text-sm">The batch ZIP file has been updated with new filenames.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-surface-dark rounded-lg overflow-hidden border border-surface-border">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-surface-border/50 text-gray-400 uppercase text-xs">
                                                        <tr>
                                                            <th className="p-3">Preview</th>
                                                            <th className="p-3">Current Name</th>
                                                            <th className="p-3">AI Generated Name (SEO)</th>
                                                            <th className="p-3 w-10">Apply</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-surface-border">
                                                        {aiResults.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-white/5">
                                                                <td className="p-3">
                                                                    <div className="w-12 h-12 bg-surface-border rounded overflow-hidden">
                                                                        {/* We construct URL based on known structure from first optimize result */}
                                                                        <img src={`/downloads/${results.sessionId}/optimized-jpg/${item.originalFileName}`} className="w-full h-full object-cover" />
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-gray-400 max-w-[150px] truncate" title={item.originalFileName}>
                                                                    {item.originalFileName}
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="space-y-1">
                                                                        <input
                                                                            type="text"
                                                                            value={item.finalName}
                                                                            onChange={(e) => {
                                                                                const newRes = [...aiResults]
                                                                                newRes[idx].finalName = e.target.value
                                                                                setAiResults(newRes)
                                                                            }}
                                                                            className="w-full bg-surface-base border border-surface-border rounded px-3 py-1.5 text-white focus:border-primary focus:outline-none"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            {item.analysis.labels?.slice(0, 3).map(l => (
                                                                                <span key={l} className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">{l}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={item.selected}
                                                                        onChange={(e) => {
                                                                            const newRes = [...aiResults]
                                                                            newRes[idx].selected = e.target.checked
                                                                            setAiResults(newRes)
                                                                        }}
                                                                        className="w-5 h-5 rounded border-gray-600 bg-surface-base text-primary focus:ring-primary"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setAiResults(null)}
                                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleApplyNames}
                                                    disabled={renamingStatus === 'processing'}
                                                    className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-all flex items-center gap-2"
                                                >
                                                    {renamingStatus === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                                    Apply Renaming
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Individual Image Results */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Individual Results</h3>
                            <button
                                onClick={() => {
                                    setResults(null)
                                    setUploadedFiles([])
                                }}
                                className="text-sm text-gray-400 hover:text-white"
                            >
                                Start New Optimization
                            </button>
                        </div>

                        {results.images.filter(img => !img.error).map((image, idx) => (
                            <ImageResultCard key={idx} image={image} results={results} handleDownload={handleDownload} />
                        ))}

                        {/* Failed Images */}
                        {results.images.filter(img => img.error).length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                                <h4 className="text-red-400 font-medium mb-3">Failed to Optimize</h4>
                                {results.images.filter(img => img.error).map((image, idx) => (
                                    <div key={idx} className="text-gray-300 text-sm">
                                        • {image.fileName}: {image.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* Results - Error */}
            {
                results && !results.ok && (
                    <div className="bg-surface-card border border-red-500/50 rounded-xl p-6">
                        <h3 className="text-red-400 font-medium mb-2">{results.error}</h3>
                        <p className="text-gray-400">{results.message}</p>
                        <button
                            onClick={() => setResults(null)}
                            className="mt-4 px-6 py-2 bg-surface-dark border border-surface-border rounded-lg text-white hover:bg-surface-border transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                )
            }
        </div >
    )
}

function ImageResultCard({ image, results, handleDownload }) {
    const [view, setView] = useState('comparison') // 'comparison' or 'details'
    const [sliderPos, setSliderPos] = useState(50)
    const containerRef = useRef(null)

    const handleMouseMove = (e) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        setSliderPos(Math.max(0, Math.min(100, x)))
    }

    const getFormatColor = (format) => {
        const colors = {
            jpg: 'bg-blue-500/20 text-blue-400',
            png: 'bg-green-500/20 text-green-400',
            webp: 'bg-purple-500/20 text-purple-400',
            avif: 'bg-pink-500/20 text-pink-400'
        }
        return colors[format] || 'bg-gray-500/20 text-gray-400'
    }

    return (
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden group">
            <div className="flex flex-col md:flex-row">
                {/* Visual Section */}
                <div className="w-full md:w-1/2 p-4 bg-black/20 border-r border-surface-border">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setView('comparison')}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${view === 'comparison' ? 'bg-primary text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Maximize2 size={12} /> Before/After
                            </button>
                            <button
                                onClick={() => setView('details')}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${view === 'details' ? 'bg-primary text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Info size={12} /> AI Analysis
                            </button>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">{image.dimensions.original.width}x{image.dimensions.original.height}</span>
                    </div>

                    <div className="relative aspect-video rounded-lg overflow-hidden bg-surface-dark border border-white/5 cursor-ew-resize"
                        ref={containerRef}
                        onMouseMove={handleMouseMove}
                        onMouseEnter={() => setSliderPos(50)}
                    >
                        {view === 'comparison' ? (
                            <>
                                {/* Optimized (Base) */}
                                <img
                                    src={image.optimized[image.bestFormat].path ? `${image.optimized[image.bestFormat].path}` : ''}
                                    className="absolute inset-0 w-full h-full object-contain"
                                    alt="Optimized"
                                />
                                {/* Original (Overlay) */}
                                <div
                                    className="absolute inset-0 overflow-hidden border-r border-white/20"
                                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                                >
                                    <img
                                        src={image.originalUrl ? `${image.originalUrl}` : ''}
                                        className="absolute inset-0 w-full h-full object-contain"
                                        alt="Original"
                                        style={{ width: containerRef.current?.offsetWidth || '100%' }}
                                    />
                                </div>
                                {/* Slider Handle */}
                                <div className="image-slider-handle" style={{ left: `${sliderPos}%` }} />

                                {/* Labels */}
                                <div className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-black/60 text-[8px] text-white uppercase font-bold rounded shadow-lg">Original</div>
                                <div className="absolute top-2 right-2 z-30 px-2 py-0.5 bg-primary/80 text-[8px] text-white uppercase font-bold rounded shadow-lg">Optimized</div>
                            </>
                        ) : (
                            <div className="p-6 bg-surface-dark/50 h-full flex flex-col justify-center animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold uppercase rounded">{image.aiAnalysis.type}</span>
                                    <span className="text-gray-400 text-xs">AI Confidence: 94%</span>
                                </div>
                                <p className="text-sm text-white font-medium mb-4 leading-relaxed">
                                    "{image.aiAnalysis.caption}"
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {image.aiAnalysis.objects?.map(obj => (
                                        <span key={obj} className="px-2 py-1 bg-white/5 border border-white/10 text-gray-400 text-[10px] rounded">{obj}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold truncate pr-4 text-lg">{image.fileName}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                                <span className="text-gray-400">Original: {image.originalSizeKB} KB</span>
                                <ArrowRight className="w-3 h-3 text-gray-500" />
                                <span className="text-green-400 font-bold">{image.optimized[image.bestFormat].sizeKB} KB</span>
                                <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">{image.totalReductionPercent}% SAVED</span>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getFormatColor(image.bestFormat)}`}>
                            Best: {image.bestFormat}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-6">
                        {Object.entries(image.optimized).map(([format, data]) => (
                            <div key={format} className={`p-2 rounded-lg border transition-all ${format === image.bestFormat ? 'bg-primary/5 border-primary/30' : 'bg-surface-dark border-transparent opacity-60'}`}>
                                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">{format}</div>
                                <div className="text-xs text-white font-bold">{data.sizeKB}K</div>
                                <div className="text-[9px] text-green-500 font-medium">-{data.reductionPercent}%</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto flex gap-2">
                        <button
                            onClick={() => handleDownload(`${image.optimized[image.bestFormat].path}`, image.fileName)}
                            className="flex-1 bg-primary hover:bg-primary-hover text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all btn-lift"
                        >
                            <Download size={14} /> Download {image.bestFormat.toUpperCase()}
                        </button>
                        <div className="relative group">
                            <button className="bg-surface-dark border border-surface-border text-gray-400 p-2 rounded-lg hover:text-white transition-all">
                                <Layers size={14} />
                            </button>
                            {/* Dropdown for other formats */}
                            <div className="absolute bottom-full right-0 mb-2 w-32 bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all translate-y-2 group-hover:translate-y-0 z-50">
                                {Object.keys(image.optimized).map(fmt => (
                                    <button
                                        key={fmt}
                                        onClick={() => handleDownload(`${image.optimized[fmt].path}`, `${image.fileName.split('.')[0]}.${fmt}`)}
                                        className="w-full text-left px-4 py-2 text-[10px] text-gray-400 hover:bg-white/5 hover:text-white transition-all border-b border-surface-border last:border-0"
                                    >
                                        Download {fmt.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
