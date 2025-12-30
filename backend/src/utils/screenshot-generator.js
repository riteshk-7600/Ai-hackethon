import sharp from 'sharp'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { logger } from './logger.js'
import path from 'path'
import fs from 'fs/promises'

export class ScreenshotGenerator {
    constructor() {
        this.outputDir = './uploads/screenshots'
        this.ensureOutputDir()
    }

    async ensureOutputDir() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true })
        } catch (err) {
            logger.error('Failed to create screenshot directory:', err)
        }
    }

    /**
     * Generate PNG from base64 screenshot
     */
    async savePNGFromBase64(base64Data, filename) {
        const buffer = Buffer.from(base64Data, 'base64')
        const outputPath = path.join(this.outputDir, filename)

        try {
            await sharp(buffer)
                .png()
                .toFile(outputPath)

            return outputPath
        } catch (error) {
            logger.error('Failed to save PNG:', error)
            throw error
        }
    }

    /**
     * Generate side-by-side comparison image
     */
    async createSideBySide(image1Base64, image2Base64, outputFilename) {
        try {
            const img1Buffer = Buffer.from(image1Base64, 'base64')
            const img2Buffer = Buffer.from(image2Base64, 'base64')

            const img1 = sharp(img1Buffer)
            const img2 = sharp(img2Buffer)

            const [img1Meta, img2Meta] = await Promise.all([
                img1.metadata(),
                img2.metadata()
            ])

            // Resize both to same height (use smaller height)
            const targetHeight = Math.min(img1Meta.height, img2Meta.height, 800)
            const targetWidth = Math.round(targetHeight * (img1Meta.width / img1Meta.height))

            const [resized1, resized2] = await Promise.all([
                img1.resize(targetWidth, targetHeight).toBuffer(),
                img2.resize(targetWidth, targetHeight).toBuffer()
            ])

            // Create side-by-side
            const sideBySide = await sharp({
                create: {
                    width: targetWidth * 2 + 10,
                    height: targetHeight,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                }
            })
                .composite([
                    { input: resized1, top: 0, left: 0 },
                    { input: resized2, top: 0, left: targetWidth + 10 }
                ])
                .png()
                .toFile(path.join(this.outputDir, outputFilename))

            return path.join(this.outputDir, outputFilename)
        } catch (error) {
            logger.error('Failed to create side-by-side:', error)
            throw error
        }
    }

    /**
     * Generate pixel-diff image
     */
    async createPixelDiff(image1Base64, image2Base64, outputFilename) {
        try {
            const img1Buffer = Buffer.from(image1Base64, 'base64')
            const img2Buffer = Buffer.from(image2Base64, 'base64')

            // Load images
            const img1 = sharp(img1Buffer)
            const img2 = sharp(img2Buffer)

            const [img1Meta, img2Meta] = await Promise.all([
                img1.metadata(),
                img2.metadata()
            ])

            // Resize to same dimensions
            const targetWidth = Math.min(img1Meta.width, img2Meta.width, 1200)
            const targetHeight = Math.min(img1Meta.height, img2Meta.height, 800)

            const [raw1, raw2] = await Promise.all([
                img1.resize(targetWidth, targetHeight).ensureAlpha().raw().toBuffer(),
                img2.resize(targetWidth, targetHeight).ensureAlpha().raw().toBuffer()
            ])

            // Create diff using pixelmatch
            const diff = Buffer.alloc(targetWidth * targetHeight * 4)
            const numDiffPixels = pixelmatch(
                raw1,
                raw2,
                diff,
                targetWidth,
                targetHeight,
                {
                    threshold: 0.1,
                    includeAA: false,
                    diffColor: [255, 0, 0]
                }
            )

            // Calculate diff percentage
            const totalPixels = targetWidth * targetHeight
            const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2)

            // Save diff image
            await sharp(diff, {
                raw: {
                    width: targetWidth,
                    height: targetHeight,
                    channels: 4
                }
            })
                .png()
                .toFile(path.join(this.outputDir, outputFilename))

            return {
                diffImagePath: path.join(this.outputDir, outputFilename),
                diffPixels: numDiffPixels,
                totalPixels,
                diffPercentage: parseFloat(diffPercentage),
                similarity: (100 - parseFloat(diffPercentage)).toFixed(2)
            }
        } catch (error) {
            logger.error('Failed to create pixel diff:', error)
            throw error
        }
    }

    /**
     * Create thumbnail
     */
    async createThumbnail(imageBase64, width = 200, outputFilename) {
        const buffer = Buffer.from(imageBase64, 'base64')
        const outputPath = path.join(this.outputDir, outputFilename)

        try {
            await sharp(buffer)
                .resize(width, null, { withoutEnlargement: true })
                .png()
                .toFile(outputPath)

            return outputPath
        } catch (error) {
            logger.error('Failed to create thumbnail:', error)
            throw error
        }
    }

    /**
     * Capture element screenshot
     */
    async captureElement(page, selector) {
        try {
            const element = await page.$(selector)
            if (!element) {
                logger.warn(`Element not found: ${selector}`)
                return null
            }

            const screenshot = await element.screenshot({
                encoding: 'base64',
                type: 'png'
            })

            return screenshot
        } catch (error) {
            logger.error(`Failed to capture element ${selector}:`, error)
            return null
        }
    }
}

export default new ScreenshotGenerator()
