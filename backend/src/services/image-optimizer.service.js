import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import AdmZip from 'adm-zip'
import { logger } from '../utils/logger.js'
import aiNamingService from './ai-naming.service.js'

export class ImageOptimizerService {
    constructor() {
        this.downloadsDir = './uploads/downloads'
        this.ensureDirectories()
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.downloadsDir, { recursive: true })
            logger.info('Downloads directory ready')
        } catch (err) {
            logger.error(`Failed to create downloads directory:`, err)
        }
    }

    /**
     * Main optimization function - processes uploaded images
     * @param {Array} files - Uploaded files from multer
     * @returns {Object} - Optimization results with download URLs
     */
    async optimizeUploadedImages(files) {
        try {
            const sessionId = `session-${Date.now()}`
            const sessionDir = path.join(this.downloadsDir, sessionId)

            // Create session folders
            await fs.mkdir(sessionDir, { recursive: true })
            await fs.mkdir(path.join(sessionDir, 'original'), { recursive: true })
            await fs.mkdir(path.join(sessionDir, 'optimized-jpg'), { recursive: true })
            await fs.mkdir(path.join(sessionDir, 'optimized-png'), { recursive: true })
            await fs.mkdir(path.join(sessionDir, 'optimized-webp'), { recursive: true })
            await fs.mkdir(path.join(sessionDir, 'optimized-avif'), { recursive: true })

            logger.info(`Processing ${files.length} images in session ${sessionId}`)

            const optimizedImages = []
            let totalOriginalSizeKB = 0
            let totalOptimizedSizeKB = 0

            // Process each image
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                try {
                    const result = await this.optimizeSingleImage(file, sessionId, sessionDir, i)
                    optimizedImages.push(result)

                    totalOriginalSizeKB += result.originalSizeKB
                    totalOptimizedSizeKB += result.optimized[result.bestFormat].sizeKB

                    logger.info(`Optimized ${result.fileName}: ${result.totalReductionPercent}% reduction`)
                } catch (error) {
                    logger.error(`Failed to optimize image ${i}:`, error)
                    optimizedImages.push({
                        fileName: `failed-image-${i}`,
                        error: true,
                        message: error.message
                    })
                }
            }

            // Calculate statistics
            const successfulImages = optimizedImages.filter(img => !img.error)
            const totalSavedKB = totalOriginalSizeKB - totalOptimizedSizeKB
            const averageReductionPercent = successfulImages.length > 0
                ? (totalSavedKB / totalOriginalSizeKB * 100).toFixed(2)
                : 0

            // Generate ZIP file
            const zipFilename = `optimized-batch-${sessionId}.zip`
            await this.generateZIP(sessionDir, zipFilename, optimizedImages)

            return {
                ok: true,
                totalImages: files.length,
                successfulImages: successfulImages.length,
                failedImages: files.length - successfulImages.length,
                totalOriginalSizeKB: parseFloat(totalOriginalSizeKB.toFixed(2)),
                totalOptimizedSizeKB: parseFloat(totalOptimizedSizeKB.toFixed(2)),
                totalSavedKB: parseFloat(totalSavedKB.toFixed(2)),
                averageReductionPercent: parseFloat(averageReductionPercent),
                zipDownloadUrl: `/downloads/${zipFilename}`,
                sessionId: sessionId,
                images: optimizedImages
            }

        } catch (error) {
            logger.error('Optimization service error:', error)
            throw error
        }
    }

    /**
     * Optimize a single image to all formats
     */
    async optimizeSingleImage(file, sessionId, sessionDir, index) {
        const originalBuffer = await fs.readFile(file.path)
        const originalSizeKB = parseFloat((originalBuffer.length / 1024).toFixed(2))

        // 🔥 AI Naming First - Source of Truth
        const base64Image = originalBuffer.toString('base64')
        const aiData = await aiNamingService.analyzeAndName(file.path, `image-${index}`, base64Image)

        logger.info(`AI Naming Result for image-${index}:`, {
            type: aiData.type,
            finalFilename: aiData.finalFilename,
            caption: aiData.caption
        })

        const newName = aiData.finalFilename || `optimized-image-${index}`
        const originalExt = path.extname(file.originalname)
        const originalName = `${newName}-original${originalExt}`

        // Save original for comparison
        await fs.writeFile(path.join(sessionDir, 'original', originalName), originalBuffer)

        // Get image metadata
        const metadata = await sharp(originalBuffer).metadata()
        const uniqueName = newName

        // Determine if resize is needed
        const shouldResize = metadata.width > 2000
        const targetWidth = shouldResize ? 2000 : metadata.width

        logger.info(`Processing Image ${index} -> AI Name: ${uniqueName} (${metadata.width}x${metadata.height})`)

        // 1. Optimize to JPG (MozJPEG + High Quality Chroma)
        const jpgBuffer = await sharp(originalBuffer)
            .resize(targetWidth, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .jpeg({
                quality: 80,
                mozjpeg: true,
                progressive: true,
                chromaSubsampling: '4:4:4'
            })
            .toBuffer()

        const jpgPath = path.join(sessionDir, 'optimized-jpg', `${uniqueName}.jpg`)
        await fs.writeFile(jpgPath, jpgBuffer)
        const jpgSizeKB = parseFloat((jpgBuffer.length / 1024).toFixed(2))
        const jpgReduction = parseFloat(((1 - jpgSizeKB / originalSizeKB) * 100).toFixed(2))

        // 2. Optimize to PNG
        const pngBuffer = await sharp(originalBuffer)
            .resize(targetWidth, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .png({
                compressionLevel: 8,
                adaptiveFiltering: true
            })
            .toBuffer()

        const pngPath = path.join(sessionDir, 'optimized-png', `${uniqueName}.png`)
        await fs.writeFile(pngPath, pngBuffer)
        const pngSizeKB = parseFloat((pngBuffer.length / 1024).toFixed(2))
        const pngReduction = parseFloat(((1 - pngSizeKB / originalSizeKB) * 100).toFixed(2))

        // 3. Convert to WebP (Lossy High Quality)
        const webpBuffer = await sharp(originalBuffer)
            .resize(targetWidth, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .webp({
                quality: 75,
                effort: 6,
                lossless: false,
                smartSubsample: true
            })
            .toBuffer()

        const webpPath = path.join(sessionDir, 'optimized-webp', `${uniqueName}.webp`)
        await fs.writeFile(webpPath, webpBuffer)
        const webpSizeKB = parseFloat((webpBuffer.length / 1024).toFixed(2))
        const webpReduction = parseFloat(((1 - webpSizeKB / originalSizeKB) * 100).toFixed(2))

        // 4. Convert to AVIF
        const avifBuffer = await sharp(originalBuffer)
            .resize(targetWidth, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .avif({
                quality: 45,
                speed: 6
            })
            .toBuffer()

        const avifPath = path.join(sessionDir, 'optimized-avif', `${uniqueName}.avif`)
        await fs.writeFile(avifPath, avifBuffer)
        const avifSizeKB = parseFloat((avifBuffer.length / 1024).toFixed(2))
        const avifReduction = parseFloat(((1 - avifSizeKB / originalSizeKB) * 100).toFixed(2))

        // Determine best format (smallest size)
        const formats = {
            jpg: jpgSizeKB,
            png: pngSizeKB,
            webp: webpSizeKB,
            avif: avifSizeKB
        }

        const bestFormat = Object.entries(formats).reduce((best, [format, size]) =>
            size < best.size ? { format, size } : best
            , { format: 'webp', size: formats.webp }).format

        const bestSize = formats[bestFormat]
        const totalReductionPercent = parseFloat(((1 - bestSize / originalSizeKB) * 100).toFixed(2))

        return {
            fileName: `${uniqueName}.${bestFormat}`,
            originalSizeKB,
            optimized: {
                jpg: {
                    path: `/downloads/${sessionId}/optimized-jpg/${uniqueName}.jpg`,
                    sizeKB: jpgSizeKB,
                    reductionPercent: jpgReduction
                },
                png: {
                    path: `/downloads/${sessionId}/optimized-png/${uniqueName}.png`,
                    sizeKB: pngSizeKB,
                    reductionPercent: pngReduction
                },
                webp: {
                    path: `/downloads/${sessionId}/optimized-webp/${uniqueName}.webp`,
                    sizeKB: webpSizeKB,
                    reductionPercent: webpReduction
                },
                avif: {
                    path: `/downloads/${sessionId}/optimized-avif/${uniqueName}.avif`,
                    sizeKB: avifSizeKB,
                    reductionPercent: avifReduction
                }
            },
            bestFormat,
            totalReductionPercent,
            downloadSingleFileUrl: `/downloads/${sessionId}/optimized-${bestFormat}/${uniqueName}.${bestFormat}`,
            dimensions: {
                original: {
                    width: metadata.width,
                    height: metadata.height
                },
                optimized: {
                    width: targetWidth,
                    height: Math.round(metadata.height * (targetWidth / metadata.width))
                }
            },
            aiAnalysis: {
                type: aiData.type,
                caption: aiData.caption,
                objects: aiData.objects,
                scene: aiData.scene
            },
            originalUrl: `/downloads/${sessionId}/original/${originalName}`
        }
    }

    /**
     * Generate ZIP file with all optimized images
     */
    async generateZIP(sessionDir, zipFilename, optimizedImages) {
        try {
            const zip = new AdmZip()

            // Add optimized folders
            const folders = ['optimized-jpg', 'optimized-png', 'optimized-webp', 'optimized-avif']
            for (const folder of folders) {
                const folderPath = path.join(sessionDir, folder)
                if (existsSync(folderPath)) {
                    zip.addLocalFolder(folderPath, folder)
                }
            }

            // Generate report.json
            const report = {
                generatedAt: new Date().toISOString(),
                totalImages: optimizedImages.length,
                successfulImages: optimizedImages.filter(img => !img.error).length,
                failedImages: optimizedImages.filter(img => img.error).length,
                images: optimizedImages,
                summary: {
                    totalOriginalSizeKB: optimizedImages
                        .filter(img => !img.error)
                        .reduce((sum, img) => sum + img.originalSizeKB, 0),
                    totalOptimizedSizeKB: optimizedImages
                        .filter(img => !img.error)
                        .reduce((sum, img) => sum + img.optimized[img.bestFormat].sizeKB, 0),
                    formatRecommendations: {
                        jpg: optimizedImages.filter(img => !img.error && img.bestFormat === 'jpg').length,
                        png: optimizedImages.filter(img => !img.error && img.bestFormat === 'png').length,
                        webp: optimizedImages.filter(img => !img.error && img.bestFormat === 'webp').length,
                        avif: optimizedImages.filter(img => !img.error && img.bestFormat === 'avif').length
                    }
                }
            }

            zip.addFile('report.json', Buffer.from(JSON.stringify(report, null, 2), 'utf8'))

            // Generate README.txt
            const readme = this.generateReadme(optimizedImages)
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

    /**
     * Generate human-readable README
     */
    generateReadme(optimizedImages) {
        const successfulImages = optimizedImages.filter(img => !img.error)
        const failedImages = optimizedImages.filter(img => img.error)

        let readme = `╔═══════════════════════════════════════════════════════════════╗
║         IMAGE OPTIMIZATION REPORT - TinyPNG Level            ║
║                Generated: ${new Date().toLocaleString()}                ║
╚═══════════════════════════════════════════════════════════════╝

📊 SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Images Processed: ${optimizedImages.length}
✅ Successfully Optimized: ${successfulImages.length}
❌ Failed: ${failedImages.length}

Total Original Size: ${successfulImages.reduce((sum, img) => sum + img.originalSizeKB, 0).toFixed(2)} KB
Total Optimized Size: ${successfulImages.reduce((sum, img) => sum + img.optimized[img.bestFormat].sizeKB, 0).toFixed(2)} KB
💰 Total Saved: ${successfulImages.reduce((sum, img) => sum + (img.originalSizeKB - img.optimized[img.bestFormat].sizeKB), 0).toFixed(2)} KB

📁 FOLDER STRUCTURE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/optimized-jpg/  - JPG format (quality 75, mozjpeg, progressive)
/optimized-png/  - PNG format (compression level 8, adaptive filtering)
/optimized-webp/ - WebP format (quality 70, effort 4) - Best browser support
/optimized-avif/ - AVIF format (quality 45, speed 6) - Best compression

🎯 OPTIMIZATION DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`

        successfulImages.forEach((img, idx) => {
            readme += `
${idx + 1}. ${img.fileName}
   ┌─ Original Size: ${img.originalSizeKB} KB
   ├─ Dimensions: ${img.dimensions.original.width}x${img.dimensions.original.height}
   ├─ JPG:  ${img.optimized.jpg.sizeKB} KB (${img.optimized.jpg.reductionPercent}% smaller)
   ├─ PNG:  ${img.optimized.png.sizeKB} KB (${img.optimized.png.reductionPercent}% smaller)
   ├─ WebP: ${img.optimized.webp.sizeKB} KB (${img.optimized.webp.reductionPercent}% smaller)
   ├─ AVIF: ${img.optimized.avif.sizeKB} KB (${img.optimized.avif.reductionPercent}% smaller)
   └─ ⭐ RECOMMENDED: ${img.bestFormat.toUpperCase()} (${img.totalReductionPercent}% total reduction)
`
        })

        if (failedImages.length > 0) {
            readme += `\n\n❌ FAILED IMAGES:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
            failedImages.forEach((img, idx) => {
                readme += `${idx + 1}. ${img.fileName} - ${img.message}\n`
            })
        }

        readme += `

💡 USAGE TIPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Use the RECOMMENDED format for best compression
2. WebP: 95%+ browser support, great compression
3. AVIF: 70%+ browser support, excellent compression
4. JPG/PNG: Fallback for older browsers

🌐 BROWSER COMPATIBILITY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WebP: Chrome, Firefox, Safari, Edge (95%+ coverage)
AVIF: Chrome 85+, Firefox 93+, Safari 16+ (70%+ coverage)
JPG/PNG: Universal support (100% coverage)

📝 IMPLEMENTATION EXAMPLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description">
</picture>

Generated by Frontend AI Quality Suite - Image Optimizer Module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

        return readme
    }

    /**
     * Generate AI Names for a session
     */
    async generateAINames(sessionId) {
        const sessionDir = path.join(this.downloadsDir, sessionId)
        if (!existsSync(sessionDir)) {
            throw new Error('Session not found or expired')
        }

        const optimizedJpgDir = path.join(sessionDir, 'optimized-jpg')
        const files = await fs.readdir(optimizedJpgDir)

        const results = []

        // Process in parallel with limit
        // Using simpler loop for clarity and error handling
        for (const file of files) {
            if (!file.endsWith('.jpg')) continue

            const filePath = path.join(optimizedJpgDir, file)
            // Get original name from the file (we appended -index, need to handle that if needed, 
            // but for now we just want to analyze the visual content)

            try {
                const imageBuffer = await fs.readFile(filePath)
                const base64Image = imageBuffer.toString('base64')

                const analysis = await aiNamingService.analyzeAndName(filePath, file, base64Image)

                results.push({
                    originalFileName: file, // This matches the specific optimized file
                    analysis: analysis
                })
            } catch (err) {
                logger.error(`Failed to analyze ${file}:`, err)
            }
        }

        return results
    }

    /**
     * Apply AI Names to a session
     * @param {string} sessionId 
     * @param {Array<{originalName: string, newName: string}>} nameMapping 
     */
    async applyAINames(sessionId, nameMapping) {
        const sessionDir = path.join(this.downloadsDir, sessionId)
        if (!existsSync(sessionDir)) {
            throw new Error('Session not found')
        }

        logger.info(`Applying new names for session ${sessionId}`)

        const formats = ['optimized-jpg', 'optimized-png', 'optimized-webp', 'optimized-avif']

        // Track successful renames
        const successfulRenames = []

        for (const mapping of nameMapping) {
            const { originalName, newName } = mapping

            // We assume originalName is the filename ON DISK (e.g. "photo-0.jpg")
            const originalBase = path.parse(originalName).name

            const updatedPaths = {}
            let anySuccess = false

            for (const formatDir of formats) {
                const fmt = formatDir.replace('optimized-', '')
                const oldFilename = `${originalBase}.${fmt}`
                const newFilename = `${newName}.${fmt}`

                const oldPath = path.join(sessionDir, formatDir, oldFilename)
                const newPath = path.join(sessionDir, formatDir, newFilename)

                try {
                    // Force rename on disk
                    if (await this.fileExists(oldPath)) {
                        await fs.rename(oldPath, newPath)
                        logger.info(`Renamed ${oldPath} -> ${newPath}`)

                        // Update tracking
                        updatedPaths[fmt] = `/downloads/${sessionId}/${formatDir}/${newFilename}`
                        anySuccess = true
                    } else if (await this.fileExists(newPath)) {
                        // Already renamed?
                        updatedPaths[fmt] = `/downloads/${sessionId}/${formatDir}/${newFilename}`
                        anySuccess = true
                    } else {
                        logger.warn(`File not found for renaming: ${oldPath}`)
                    }
                } catch (err) {
                    logger.error(`Failed to rename ${oldPath} to ${newPath}`, err)
                }
            }

            if (anySuccess) {
                successfulRenames.push({
                    originalFileName: originalName,
                    newFileName: newName,
                    updatedPaths: updatedPaths
                })
            }
        }

        // RE-GENERATE ZIP - STRICT MODE
        // We cannot use addLocalFolder because we want to be 100% sure of the names.
        // We will manually add each file that is currently in the directory.
        // Actually, we should add the files corresponding to `successfulRenames`.

        const zipFilename = `optimized-batch-${sessionId}-renamed.zip`
        const zip = new AdmZip()

        // Strategy: Iterate through successfulRenames and add those files to the ZIP
        // This ensures ONLY the renamed files (or kept files) are in the ZIP.
        // But what if the user only renamed *some* files? The ZIP should probably contain ALL files.
        // So better strategy: Iterate the directories and add whatever is there.
        // Since we physically renamed the files on disk, listing the directory will give us the NEW names.

        for (const folder of formats) {
            const folderPath = path.join(sessionDir, folder)
            if (existsSync(folderPath)) {
                const files = await fs.readdir(folderPath)
                for (const file of files) {
                    const filePath = path.join(folderPath, file)
                    // Add to ZIP with the filename found on disk (which is now the new name)
                    // We put it in a subfolder in the zip matching the format
                    zip.addFile(`${folder}/${file}`, await fs.readFile(filePath))
                }
            }
        }

        // Add log
        const renameLog = {
            renamedAt: new Date().toISOString(),
            changes: successfulRenames.map(r => ({ from: r.originalFileName, to: r.newFileName }))
        }
        zip.addFile('renaming-log.json', Buffer.from(JSON.stringify(renameLog, null, 2), 'utf8'))

        const zipPath = path.join(this.downloadsDir, zipFilename)
        zip.writeZip(zipPath)

        return {
            success: true,
            zipDownloadUrl: `/downloads/${zipFilename}`,
            results: successfulRenames
        }
    }

    async fileExists(path) {
        try {
            await fs.access(path)
            return true
        } catch {
            return false
        }
    }
}

export default new ImageOptimizerService()
