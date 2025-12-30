# ⚡ PageSpeed Insights Backend Guide

## 🔌 API Endpoint

**URL**: `GET /api/pagespeed`

**Parameters**:
- `url` (required): The URL to analyze (e.g., `https://example.com`)
- `device` (optional): `mobile` (default) or `desktop`

**Authentication**:
- Requires `GOOGLE_PAGESPEED_API_KEY` in `.env`.

---

## 💻 Frontend Integration Example

```javascript
import axios from 'axios';

const runPageSpeedTest = async (url, device = 'mobile') => {
  try {
    const response = await axios.get('/api/pagespeed', {
      params: { url, device }
    });

    if (response.data.ok) {
      console.log('Scores:', response.data.scores);
      console.log('Metrics:', response.data.metrics);
      return response.data;
    }
  } catch (error) {
    console.error('PageSpeed Analysis Failed:', error.response?.data || error.message);
  }
};

// Usage
runPageSpeedTest('https://google.com', 'desktop');
```

---

## 📦 JSON Response Format

The backend returns a strictly typed JSON object matching your requirements (data simplified for brevity):

```json
{
  "ok": true,
  "device": "mobile",
  "finalScreenshot": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "scores": {
    "performance": 92,
    "accessibility": 100,
    "bestPractices": 95,
    "seo": 100
  },
  "metrics": {
    "fcp": 1200,      // First Contentful Paint (ms)
    "lcp": 2400,      // Largest Contentful Paint (ms)
    "cls": 0.005,     // Cumulative Layout Shift
    "tbt": 150,       // Total Blocking Time (ms)
    "fid": 12,        // First Input Delay (ms)
    "speedIndex": 1850, // Speed Index
    "si": 1850
  },
  "opportunities": [
    {
      "id": "render-blocking-resources",
      "title": "Eliminate render-blocking resources",
      "description": "Resources are blocking the first paint of your page...",
      "savingsMs": 540,
      "savingsKB": 45
    },
    {
      "id": "unused-javascript",
      "title": "Reduce unused JavaScript",
      "description": "Reduce unused JavaScript and defer loading scripts...",
      "savingsMs": 120,
      "savingsKB": 150
    }
  ],
  "diagnostics": [
    {
      "id": "mainthread-work-breakdown",
      "title": "Minimize main-thread work",
      "value": 2450,
      "description": "Reduce the time complete parsing, compiling and executing JS..."
    }
  ],
  "passedAudits": [
    "image-aspect-ratio",
    "uses-rel-preconnect",
    "viewport"
  ],
  "waterfallScreenshotFrames": [
    "data:image/jpeg;base64/...",
    "data:image/jpeg;base64/...",
    "data:image/jpeg;base64/..."
  ],
  "rawLighthouseResult": { ... } // Original Google API response
}
```

---

## ⚙️ Configuration

1. Get an API Key from [Google Cloud Console](https://developers.google.com/speed/docs/insights/v5/get-started).
2. Add it to your `backend/.env` file:

```env
GOOGLE_PAGESPEED_API_KEY=your_actual_api_key_here
```

---

## 🚀 Internal Layout

- **Controller**: `backend/src/controllers/pagespeed.controller.js`
- **Routes**: `backend/src/routes/pagespeed.routes.js`
- **Util**: Uses standard `axios` for requests.

This implementation provides a **1:1 match** with Google PageSpeed Insights data structure.
