# Image Optimizer API Documentation

## Overview

The Image Optimizer module provides three endpoints:
1. **Analysis Only** - Analyzes images without downloading/optimizing
2. **Full Optimization** - Downloads, optimizes, and provides downloadable ZIP
3. **Upload Analysis** - Analyzes uploaded image files

---

## 1. Full Image Optimization (NEW)

### Endpoint
```
POST /api/audit/images/optimize
```

### Description
Downloads all images from a URL, optimizes them to WebP/AVIF/optimized JPG formats, and generates a downloadable ZIP file.

### Request Body
```json
{
  "url": "https://example.com"
}
```

### Response
```json
{
  "ok": true,
  "summary": {
    "totalImages": 15,
    "brokenImages": 1,
    "oversizedImages": 3,
    "successfullyOptimized": 14,
    "averageReductionPercent": 67.45
  },
  "optimized": [
    {
      "originalSrc": "https://example.com/image1.jpg",
      "originalSizeKB": 245.67,
      "optimizedWebPSizeKB": 78.23,
      "optimizedAVIFSizeKB": 65.12,
      "optimizedJPGSizeKB": 98.45,
      "sizeReductionPercent": 73.48,
      "recommendedFormat": "avif",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "broken": false
    }
  ],
  "downloadZipUrl": "/downloads/optimized-images-1734252330000.zip"
}
```

### How to Download ZIP

**Frontend JavaScript:**
```javascript
const response = await fetch('http://localhost:5000/api/audit/images/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' })
})

const data = await response.json()

if (data.ok) {
  // Download ZIP file
  window.location.href = `http://localhost:5000${data.downloadZipUrl}`
  
  // Or use fetch for more control
  const zipResponse = await fetch(`http://localhost:5000${data.downloadZipUrl}`)
  const blob = await zipResponse.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'optimized-images.zip'
  a.click()
}
```

### ZIP Structure
```
optimized-images-1734252330000.zip
├── webp/
│   ├── image-0.webp
│   ├── image-1.webp
│   └── ...
├── avif/
│   ├── image-0.avif
│   ├── image-1.avif
│   └── ...
├── optimized/
│   ├── image-0.jpg
│   ├── image-1.png
│   └── ...
└── README.txt
```

### README.txt Contents
```
IMAGE OPTIMIZATION REPORT
Generated: 2025-12-15T07:35:15.000Z
==============================================

SUMMARY:
Total images optimized: 14
Failed images: 1

OPTIMIZATION DETAILS:
==============================================

1. hero-image.jpg
   Original Size: 245.67 KB
   WebP Size: 78.23 KB
   AVIF Size: 65.12 KB
   Optimized JPG/PNG Size: 98.45 KB
   Size Reduction: 73.48%
   Recommended Format: avif
   Dimensions: 1920x1080
...
```

### Error Responses

**Invalid URL:**
```json
{
  "error": "URL is required"
}
```

**Server Error:**
```json
{
  "error": "Failed to optimize images",
  "message": "Navigation timeout exceeded"
}
```

---

## 2. Image Analysis (No Optimization)

### Endpoint
```
POST /api/audit/images/analyze
```

### Description
Analyzes images on a webpage without downloading or optimizing them. Returns issues and recommendations.

### Request Body
```json
{
  "url": "https://example.com"
}
```

### Response
```json
{
  "score": 74,
  "issues": [
    {
      "severity": "warning",
      "element": "https://example.com/large-image.jpg",
      "description": "Large image detected (2.45MB)",
      "fix": "Compress image or use responsive images"
    },
    {
      "severity": "minor",
      "element": "https://example.com/image.png",
      "description": "Consider using WebP format (current: image/png)",
      "fix": "Convert to WebP for better compression"
    }
  ],
  "categories": {
    "size": 80,
    "format": 70,
    "lazyLoading": 85
  },
  "metadata": {
    "totalImages": 15,
    "missingImages": 1,
    "timestamp": "2025-12-15T07:35:15.000Z"
  }
}
```

---

## 3. Upload Image Analysis

### Endpoint
```
POST /api/audit/images/upload
```

### Description
Analyzes uploaded image files.

### Request
**Content-Type:** `multipart/form-data`

**Form Data:**
- `images` - One or more image files (max 10, max 10MB each)

### Response
```json
{
  "score": 85,
  "issues": [
    {
      "severity": "warning",
      "element": "photo1.jpg",
      "description": "Large image detected (1.5MB)",
      "fix": "Compress image or use responsive images"
    }
  ],
  "categories": {
    "size": 75,
    "format": 90,
    "lazyLoading": 100
  },
  "metadata": {
    "totalImages": 3,
    "totalSize": "4.2MB",
    "timestamp": "2025-12-15T07:35:15.000Z"
  }
}
```

---

## Technical Details

### Image Optimization Process

1. **Download**: Each image is downloaded using axios
2. **Sharp Processing**:
   - WebP conversion: Quality 85
   - AVIF conversion: Quality 80
   - JPG optimization: Quality 85, mozjpeg enabled
   - PNG optimization: Quality 85, compression level 9
   - Max width: 1920px (maintains aspect ratio)
3. **Size Comparison**: Determines smallest format
4. **ZIP Generation**: Uses adm-zip to package all formats
5. **Cleanup**: Temporary files removed after 1 minute

### Supported Image Formats

**Input:**
- JPEG / JPG
- PNG (transparency preserved)
- GIF
- WebP
- SVG (analyzed but not optimized)

**Output:**
- WebP (85% quality)
- AVIF (80% quality)
- Optimized JPG (85% quality, mozjpeg)
- Optimized PNG (85% quality, level 9 compression)

### File Size Limits

- Maximum uploaded file size: 10MB per file
- Maximum files per upload: 10 files
- Downloaded images: No limit, but timeout at 10s per image

### Temporary File Management

- Temp files stored in: `./uploads/temp/session-{timestamp}/`
- Optimized files in: `./uploads/optimized/session-{timestamp}/`
- ZIP files in: `./uploads/downloads/`
- Auto-cleanup: 1 minute after ZIP generation

---

## Frontend Integration Example

### React Component

```jsx
import React, { useState } from 'react'

function ImageOptimizer() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  const handleOptimize = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/audit/images/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (results?.downloadZipUrl) {
      window.location.href = `http://localhost:5000${results.downloadZipUrl}`
    }
  }

  return (
    <div>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
      />
      <button onClick={handleOptimize} disabled={loading}>
        {loading ? 'Optimizing...' : 'Optimize Images'}
      </button>

      {results?.ok && (
        <div>
          <h3>Results</h3>
          <p>Total Images: {results.summary.totalImages}</p>
          <p>Successfully Optimized: {results.summary.successfullyOptimized}</p>
          <p>Average Reduction: {results.summary.averageReductionPercent}%</p>
          
          <button onClick={handleDownload}>
            Download Optimized ZIP
          </button>

          <div>
            {results.optimized.map((img, idx) => (
              <div key={idx}>
                <p>{img.originalSrc}</p>
                <p>Original: {img.originalSizeKB} KB</p>
                <p>Optimized ({img.recommendedFormat}): {img[`optimized${img.recommendedFormat.toUpperCase()}SizeKB`]} KB</p>
                <p>Reduction: {img.sizeReductionPercent}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageOptimizer
```

---

## Testing

### cURL Examples

**Full Optimization:**
```bash
curl -X POST http://localhost:5000/api/audit/images/optimize \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Analysis Only:**
```bash
curl -X POST http://localhost:5000/api/audit/images/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Upload:**
```bash
curl -X POST http://localhost:5000/api/audit/images/upload \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.png"
```

---

## Performance Considerations

- **Optimization Time**: ~1-3 seconds per image
  - 10 images: ~10-30 seconds
  - 50 images: ~50-150 seconds (2-3 minutes)

- **Memory Usage**: Sharp is memory-efficient but large images may require significant RAM

- **Recommended Use**:
  - For pages with < 50 images: Direct optimization
  - For pages with > 50 images: Consider background job queue

---

## Error Handling

All endpoints return proper HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing URL, no files uploaded, etc.)
- `500` - Server Error (processing failed, network timeout, etc.)

Errors include:
- Clear error messages
- Original error details (in development mode)

---

## Security

- **URL Validation**: URLs are validated before processing
- **File Type Validation**: Only image files allowed for uploads
- **Size Limits**: Prevents excessive file uploads
- **Timeout Protection**: 10s timeout per image download
- **Auto Cleanup**: Temporary files removed automatically

---

## Future Enhancements (Optional)

1. **Progress Tracking**: WebSocket for real-time progress
2. **Batch Processing**: Queue system for large jobs
3. **Custom Quality Settings**: User-defined quality levels
4. **Cloud Storage**: Upload to S3/GCS instead of local ZIP
5. **Image Transformations**: Crop, resize, watermark options
