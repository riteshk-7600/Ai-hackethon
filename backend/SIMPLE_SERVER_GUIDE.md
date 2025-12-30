# Simple Comparison Server Guide

## 📦 Installation

```bash
cd backend
npm install express cors axios jsdom
```

## 🚀 Running the Server

```bash
# Option 1: Run the simple server directly
node simple-server.js

# Option 2: Add to package.json scripts
# Add this to your package.json:
# "simple": "node simple-server.js"
# Then run:
npm run simple
```

## ✅ Testing the Server

### 1. Health Check
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2025-12-05T05:39:27.848Z"}
```

### 2. Root Endpoint
```bash
curl http://localhost:5000/
```

**Expected Response:**
```
API is running! Use POST /api/compare to compare URLs.
```

### 3. Compare Endpoint

**Using curl:**
```bash
curl -X POST http://localhost:5000/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "liveUrl": "https://example.com",
    "stageUrl": "https://example.org"
  }'
```

**Using JavaScript (fetch):**
```javascript
fetch('http://localhost:5000/api/compare', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    liveUrl: 'https://example.com',
    stageUrl: 'https://example.org'
  })
})
.then(res => res.json())
.then(data => console.log(data))
```

**Expected Response:**
```json
{
  "ok": true,
  "textChanged": true,
  "images": {
    "onlyInLive": [...],
    "onlyInStage": [...],
    "totalLive": 5,
    "totalStage": 4
  },
  "sections": {
    "onlyInLive": [...],
    "onlyInStage": [...],
    "totalLive": 12,
    "totalStage": 10
  },
  "metadata": {
    "liveUrl": "https://example.com",
    "stageUrl": "https://example.org",
    "timestamp": "2025-12-05T05:39:27.848Z"
  }
}
```

## 🔍 Console Output

When you run a comparison, you'll see detailed logs:

```
=== NEW COMPARISON REQUEST ===
Request body: { liveUrl: '...', stageUrl: '...' }
📥 Fetching Live URL: https://example.com
📥 Fetching Stage URL: https://example.org
✅ Both URLs fetched successfully
🔍 Parsing HTML with JSDOM...
📊 Extracting data from Live...
  - Extracting text from Live...
  - Extracting images from Live...
  - Extracting sections from Live...
  ✓ Live: 1234 chars, 5 images, 12 sections
📊 Extracting data from Stage...
  - Extracting text from Stage...
  - Extracting images from Stage...
  - Extracting sections from Stage...
  ✓ Stage: 1156 chars, 4 images, 10 sections
🔄 Comparing data...
✅ Comparison complete!
Results: {
  textChanged: true,
  imagesOnlyInLive: 1,
  imagesOnlyInStage: 0,
  sectionsOnlyInLive: 2,
  sectionsOnlyInStage: 0
}
```

## ❌ Error Handling

### Missing URLs
```bash
curl -X POST http://localhost:5000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"liveUrl": "https://example.com"}'
```

**Response (400):**
```json
{
  "ok": false,
  "error": "Both liveUrl and stageUrl are required"
}
```

### Failed to Fetch URL
If a URL is unreachable:

**Response (500):**
```json
{
  "ok": false,
  "error": "Comparison failed",
  "message": "Failed to fetch Live URL: getaddrinfo ENOTFOUND invalid-url.com",
  "details": "Error stack trace (in development mode)"
}
```

## 🔧 Troubleshooting

### Port Already in Use
If you see `EADDRINUSE: address already in use :::5000`:

```bash
# Find and kill the process
lsof -ti:5000 | xargs kill -9

# Then restart
node simple-server.js
```

### CORS Errors
The server already has CORS enabled. If you still see CORS errors, check that:
1. Frontend is calling `http://localhost:5000` (not `https`)
2. Server is actually running

### Timeout Errors
If URLs take too long to load, the server has a 30-second timeout. You can adjust it in `simple-server.js`:

```javascript
axios.get(url, {
    timeout: 60000, // Change to 60 seconds
    // ...
})
```

## 📝 Integration with Frontend

Update your frontend to use the correct endpoint:

```javascript
const handleCompare = async () => {
    setIsLoading(true)
    setResults(null)
    
    try {
        const response = await fetch('http://localhost:5000/api/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ liveUrl, stageUrl })
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setResults(data)
    } catch (error) {
        console.error('Comparison failed:', error)
        setResults({
            error: true,
            message: error.message
        })
    } finally {
        setIsLoading(false)
    }
}
```

## 🎯 Key Differences from Puppeteer Version

| Feature | Puppeteer | Axios + JSDOM |
|---------|-----------|---------------|
| Speed | Slower (launches browser) | Faster (direct HTTP) |
| Memory | High (~100MB per browser) | Low (~10MB) |
| Screenshots | ✅ Yes | ❌ No |
| JavaScript Execution | ✅ Yes | ❌ No |
| Reliability | Can timeout/crash | More stable |
| Setup | Requires Chromium | Just npm packages |

## ✨ Summary

This simple server:
- ✅ Returns proper JSON responses
- ✅ Has clear error messages
- ✅ Logs everything to console
- ✅ Handles CORS automatically
- ✅ Works without Puppeteer/Chromium
- ✅ Faster and more reliable for basic HTML comparison

**Perfect for comparing static HTML content!**
