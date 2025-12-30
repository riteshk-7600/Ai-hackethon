import puppeteer from 'puppeteer'
import sharp from 'sharp'
import axios from 'axios'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import AdmZip from 'adm-zip'
import { logger } from '../utils/logger.js'
import browserPool from '../utils/browser-pool.js'

export class ImageOptimizerService {
    constructor() {
        this.tempDir = './uploads/temp'
        this.optimizedDir = './uploads/optimized'
        this.downloadsDir = './uploads/downloads'
        this.ensureDirectories()
    }

    async ensureDirectories() {
        const dirs = [this.tempDir, this.optimizedDir, this.downloadsDir]
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true })
            } catch (err) {
                logger.error(`Failed to create directory ${dir}:`, err)
            }
        }
    }

    async optimizeImagesFromUrl(url) {
        let page = null

        try {
            logger.info(`Optimizing images from: ${url}`)

            // Create session folder
            const sessionId = `session-${Date.now()}`
            const sessionTempDir = path.join(this.tempDir, sessionId)
            const sessionOptimizedDir = path.join(this.optimizedDir, sessionId)

            await fs.mkdir(sessionTempDir, { recursive: true })
            await fs.mkdir(sessionOptimizedDir, { recursive: true })
            await fs.mkdir(path.join(sessionOptimizedDir, 'webp'), { recursive: true })
            await fs.mkdir(path.join(sessionOptimizedDir, 'avif'), { recursive: true })
            await fs.mkdir(path.join(sessionOptimizedDir, 'optimized'), { recursive: true })

            const browser = await browserPool.getBrowser()
            page = await browser.newPage()
            await page.setViewport({ width: 1920, height: 1080 })

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            }).catch(() => {
                return page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 20000
                })
            })

            // Extract all image elements
            const imageElements = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('img')).map((img, idx) => ({
                    src: img.src,
                    alt: img.alt,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    displayWidth: img.width,
                    displayHeight: img.height,
                    loading: img.loading,
                    hasAlt: !!img.alt,
                    index: idx
                }))
            })

            await page.close()

            logger.info(`Found ${imageElements.length} images to optimize`)

            // Download and optimize each image
            const optimized = []
            let brokenImages = 0
            let oversizedImages = 0
            let successfullyOptimized = 0

            for (const imgData of imageElements) {
                try {
                    const result = await this.downloadAndOptimizeImage(
                        imgData,
                        sessionTempDir,
                        sessionOptimizedDir
                    )

                    if (result.broken) {
                        brokenImages++
                    } else {
                        optimized.push(result)
                        successfullyOptimized++
                        if (result.originalSizeKB > 500) {
                            oversizedImages++
                        }
                    }
                } catch (error) {
                    logger.error(`Failed to optimize image ${imgData.src}:`, error)
                    brokenImages++
                }
            }

            // Generate ZIP file
            const zipFilename = `optimized-images-${Date.now()}.zip`
            const zipPath = await this.generateZip(sessionOptimizedDir, zipFilename, optimized)

            // Calculate average reduction
            const totalReduction = optimized.reduce((sum, img) => sum + (img.sizeReductionPercent || 0), 0)
            const averageReductionPercent = optimized.length > 0
                ? (totalReduction / optimized.length).toFixed(2)
                : 0

            // Clean up temp files after a delay
            setTimeout(() => {
                this.cleanupSession(sessionTempDir).catch(err =>
                    logger.error('Cleanup error:', err)
                )
            }, 60000) // Clean up after 1 minute

            return {
                ok: true,
                summary: {
                    totalImages: imageElements.length,
                    brokenImages,
                    oversizedImages,
                    successfullyOptimized,
                    averageReductionPercent: parseFloat(averageReductionPercent)
                },
                optimized,
                downloadZipUrl: `/downloads/${zipFilename}`
            }

        } catch (error) {
            logger.error(`Image optimization error:`, error)
            if (page) await page.close().catch(() => { })
            throw error
        }
    }

    async downloadAndOptimizeImage(imgData, tempDir, optimizedDir) {
        try {
            // Download original image
            const response = await axios.get(imgData.src, {
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            })

            const originalBuffer = Buffer.from(response.data)
            const originalSizeKB = (originalBuffer.length / 1024).toFixed(2)

            // Determine file extension
            const urlPath = new URL(imgData.src).pathname
            const ext = path.extname(urlPath) || '.jpg'
            const filename = `image-${imgData.index}${ext}`

            // Save original
            const originalPath = path.join(tempDir, filename)
            await fs.writeFile(originalPath, originalBuffer)

            // Get image metadata
            const metadata = await sharp(originalBuffer).metadata()

            // Optimize to WebP
            const webpBuffer = await sharp(originalBuffer)
                .resize(Math.min(metadata.width, 1920), null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .webp({ quality: 85 })
                .toBuffer()

            const webpPath = path.join(optimizedDir, 'webp', `${path.parse(filename).name}.webp`)
            await fs.writeFile(webpPath, webpBuffer)
            const webpSizeKB = (webpBuffer.length / 1024).toFixed(2)

            // Optimize to AVIF
            const avifBuffer = await sharp(originalBuffer)
                .resize(Math.min(metadata.width, 1920), null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .avif({ quality: 80 })
                .toBuffer()

            const avifPath = path.join(optimizedDir, 'avif', `${path.parse(filename).name}.avif`)
            await fs.writeFile(avifPath, avifBuffer)
            const avifSizeKB = (avifBuffer.length / 1024).toFixed(2)

            // Optimize original format (JPG or PNG)
            let optimizedBuffer
            let optimizedExt = ext

            if (metadata.format === 'png') {
                optimizedBuffer = await sharp(originalBuffer)
                    .resize(Math.min(metadata.width, 1920), null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .png({ quality: 85, compressionLevel: 9 })
                    .toBuffer()
                optimizedExt = '.png'
            } else {
                optimizedBuffer = await sharp(originalBuffer)
                    .resize(Math.min(metadata.width, 1920), null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .jpeg({ quality: 85, mozjpeg: true })
                    .toBuffer()
                optimizedExt = '.jpg'
            }

            const optimizedPath = path.join(optimizedDir, 'optimized', `${path.parse(filename).name}${optimizedExt}`)
            await fs.writeFile(optimizedPath, optimizedBuffer)
            const optimizedSizeKB = (optimizedBuffer.length / 1024).toFixed(2)

            // Determine best format
            const sizes = {
                webp: parseFloat(webpSizeKB),
                avif: parseFloat(avifSizeKB),
                optimized: parseFloat(optimizedSizeKB)
            }

            const recommendedFormat = Object.entries(sizes).reduce((best, [format, size]) =>
                size < best.size ? { format, size } : best
                , { format: 'webp', size: sizes.webp }).format

            // Calculate reduction
            const bestSize = Math.min(sizes.webp, sizes.avif, sizes.optimized)
            const sizeReductionPercent = ((1 - (bestSize / parseFloat(originalSizeKB))) * 100).toFixed(2)

            return {
                originalSrc: imgData.src,
                originalSizeKB: parseFloat(originalSizeKB),
                optimizedWebPSizeKB: parseFloat(webpSizeKB),
                optimizedAVIFSizeKB: parseFloat(avifSizeKB),
                optimizedJPGSizeKB: parseFloat(optimizedSizeKB),
                sizeReductionPercent: parseFloat(sizeReductionPercent),
                recommendedFormat,
                dimensions: {
                    width: metadata.width,
                    height: metadata.height
                },
                broken: false
            }

        } catch (error) {
            logger.warn(`Failed to download/optimize ${imgData.src}:`, error.message)
            return {
                originalSrc: imgData.src,
                broken: true,
                error: error.message
            }
        }
    }

    async generateZip(optimizedDir, zipFilename, optimizedList) {
        try {
            const zip = new AdmZip()

            // Add optimized folders
            zip.addLocalFolder(path.join(optimizedDir, 'webp'), 'webp')
            zip.addLocalFolder(path.join(optimizedDir, 'avif'), 'avif')
            zip.addLocalFolder(path.join(optimizedDir, 'optimized'), 'optimized')

            // Generate README
            const readme = this.generateReadme(optimizedList)
            zip.addFile('README.txt', Buffer.from(readme, 'utf8'))

            // Write ZIP file
            const zipPath = path.join(this.downloadsDir, zipFilename)
            zip.writeZip(zipPath)

            logger.info(`Generated ZIP file: ${zipPath}`)
            return zipPath

        } catch (error) {
            logger.error('ZIP generation error:', error)
            throw error
        }
    }

    generateReadme(optimizedList) {
        let readme = `IMAGE OPTIMIZATION REPORT
Generated: ${new Date().toISOString()}
==============================================

SUMMARY:
Total images optimized: ${optimizedList.filter(i => !i.broken).length}
Failed images: ${optimizedList.filter(i => i.broken).length}

OPTIMIZATION DETAILS:
==============================================

`

        optimizedList.forEach((img, idx) => {
            if (!img.broken) {
                readme += `
${idx + 1}. ${path.basename(img.originalSrc)}
   Original Size: ${img.originalSizeKB} KB
   WebP Size: ${img.optimizedWebPSizeKB} KB
   AVIF Size: ${img.optimizedAVIFSizeKB} KB
   Optimized JPG/PNG Size: ${img.optimizedJPGSizeKB} KB
   Size Reduction: ${img.sizeReductionPercent}%
   Recommended Format: ${img.recommendedFormat}
   Dimensions: ${img.dimensions.width}x${img.dimensions.height}
`
            }
        })

        readme += `
==============================================
FOLDER STRUCTURE:
- /webp - All images converted to WebP format
- /avif - All images converted to AVIF format
- /optimized - Original format optimized (JPG/PNG)

USAGE:
Choose the recommended format for each image based on:
- WebP: Best browser support, good compression
- AVIF: Best compression, newer format
- Optimized: Fallback for older browsers
`

        return readme
    }

    async cleanupSession(sessionDir) {
        try {
            await fs.rm(sessionDir, { recursive: true, force: true })
            logger.info(`Cleaned up session: ${sessionDir}`)
        } catch (error) {
            logger.error('Cleanup error:', error)
        }
    }

    // Existing analysis method (keep for backward compatibility)
    async analyzeImages(url) {
        let page = null

        try {
            logger.info(`Analyzing images for: ${url}`)

            const browser = await browserPool.getBrowser()
            page = await browser.newPage()
            await page.setViewport({ width: 1920, height: 1080 })

            // Track network requests for images
            const imageRequests = []

            page.on('response', async (response) => {
                const contentType = response.headers()['content-type']
                if (contentType && contentType.startsWith('image/')) {
                    const url = response.url()
                    const status = response.status()

                    try {
                        const buffer = await response.buffer()
                        imageRequests.push({
                            url,
                            status,
                            size: buffer.length,
                            type: contentType
                        })
                    } catch (e) {
                        imageRequests.push({
                            url,
                            status,
                            size: 0,
                            type: contentType,
                            error: true
                        })
                    }
                }
            })

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            })

            const imageElements = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    loading: img.loading,
                    hasAlt: !!img.alt
                }))
            })

            await page.close()

            // Analyze issues
            const issues = []

            const missingImages = imageRequests.filter(req => req.status === 404)
            missingImages.forEach(img => {
                issues.push({
                    severity: 'critical',
                    element: img.url,
                    description: 'Image not found (404)',
                    fix: 'Check image path and ensure file exists'
                })
            })

            const oversizedImages = imageRequests.filter(req => req.size > 500000 && !req.error)
            oversizedImages.forEach(img => {
                const sizeMB = (img.size / 1024 / 1024).toFixed(2)
                issues.push({
                    severity: 'warning',
                    element: img.url,
                    description: `Large image detected (${sizeMB}MB)`,
                    fix: 'Compress image or use responsive images'
                })
            })

            const nonWebPImages = imageRequests.filter(req =>
                !req.error && !req.type.includes('webp') && req.size > 100000
            )
            nonWebPImages.forEach(img => {
                issues.push({
                    severity: 'minor',
                    element: img.url,
                    description: `Consider using WebP format (current: ${img.type})`,
                    fix: 'Convert to WebP for better compression'
                })
            })

            const noLazyLoad = imageElements.filter(img =>
                img.loading !== 'lazy' && img.height > 300
            )
            if (noLazyLoad.length > 0) {
                issues.push({
                    severity: 'minor',
                    element: 'multiple images',
                    description: `${noLazyLoad.length} images without lazy loading`,
                    fix: 'Add loading="lazy" attribute to improve performance'
                })
            }

            const criticalCount = issues.filter(i => i.severity === 'critical').length
            const warningCount = issues.filter(i => i.severity === 'warning').length
            const minorCount = issues.filter(i => i.severity === 'minor').length

            const score = Math.max(0, 100 - (criticalCount * 15) - (warningCount * 8) - (minorCount * 3))

            return {
                score: Math.round(score),
                issues,
                categories: {
                    size: Math.max(0, 100 - (oversizedImages.length * 10)),
                    format: Math.max(0, 100 - (nonWebPImages.length * 8)),
                    lazyLoading: noLazyLoad.length === 0 ? 100 : Math.max(0, 100 - (noLazyLoad.length * 5))
                },
                metadata: {
                    totalImages: imageRequests.length,
                    missingImages: missingImages.length,
                    timestamp: new Date().toISOString()
                }
            }

        } catch (error) {
            logger.error(`Image analysis error:`, error)
            if (page) await page.close().catch(() => { })
            throw error
        }
    }

    async analyzeUploadedImages(files) {
        try {
            logger.info(`Analyzing ${files.length} uploaded images`)

            const issues = []
            let totalSize = 0

            files.forEach(file => {
                totalSize += file.size

                if (file.size > 500000) {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2)
                    issues.push({
                        severity: 'warning',
                        description: `Large image detected (${sizeMB}MB)`,
                        fix: 'Compress image or use responsive images'
                    })
                }

                if (!file.mimetype.includes('webp') && file.size > 100000) {
                    issues.push({
                        severity: 'minor',
                        description: `Consider using WebP format (current: ${file.mimetype})`,
                        fix: 'Convert to WebP for better compression'
                    })
                }

                if (file.size > 2000000) {
                    issues.push({
                        severity: 'critical',
                        description: `Image is too large (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
                        fix: 'Reduce image size to under 2MB'
                    })
                }
            })

            const criticalCount = issues.filter(i => i.severity === 'critical').length
            const warningCount = issues.filter(i => i.severity === 'warning').length
            const minorCount = issues.filter(i => i.severity === 'minor').length

            const score = Math.max(0, 100 - (criticalCount * 15) - (warningCount * 8) - (minorCount * 3))

            return {
                score: Math.round(score),
                issues,
                categories: {
                    size: Math.max(0, 100 - (issues.filter(i => i.description.includes('Large')).length * 10)),
                    format: Math.max(0, 100 - (issues.filter(i => i.description.includes('WebP')).length * 8)),
                    lazyLoading: 100
                },
                metadata: {
                    totalImages: files.length,
                    totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
                    timestamp: new Date().toISOString()
                }
            }

        } catch (error) {
            logger.error(`Uploaded image analysis error:`, error)
            throw error
        }
    }
}

export default new ImageOptimizerService()
