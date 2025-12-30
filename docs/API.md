# API Documentation

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

Currently, the API does not require authentication. In production, implement JWT-based auth.

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP

---

## Endpoints

### 1. Website Audit

Analyze website for layout, spacing, and typography issues.

**Endpoint:** `POST /audit/website`

**Request Body:**
```json
{
  "url": "https://example.com",
  "platform": "custom"
}
```

**Parameters:**
- `url` (required): Website URL to audit
- `platform` (optional): Platform type - `custom`, `elementor`, `shopify`, `gutenberg`, `woocommerce`

**Response:**
```json
{
  "score": 78,
  "issues": [
    {
      "severity": "critical",
      "type": "layout",
      "description": "Inconsistent padding detected",
      "element": "footer",
      "fix": "Apply uniform padding: p-8",
      "aiExplanation": "...",
      "aiFix": "..."
    }
  ],
  "categories": {
    "layout": 82,
    "typography": 75,
    "spacing": 80,
    "consistency": 74
  },
  "metadata": {
    "url": "https://example.com",
    "platform": "custom",
    "loadTime": 1234,
    "consoleErrors": 0,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Accessibility Check

Test WCAG 2.1 compliance using axe-core.

**Endpoint:** `POST /audit/accessibility`

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "score": 72,
  "issues": [
    {
      "severity": "critical",
      "wcag": "WCAG 2.1 Level A",
      "rule": "1.1.1 Non-text Content",
      "description": "Image missing alt attribute",
      "element": "<img src=\"hero.jpg\">",
      "target": "body > main > img",
      "fix": "Add alt=\"Description\"",
      "impact": "serious",
      "aiExplanation": "..."
    }
  ],
  "categories": {
    "perceivable": 68,
    "operable": 75,
    "understandable": 80,
    "robust": 70
  },
  "metadata": {
    "url": "https://example.com",
    "totalIssues": 12,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3. Performance Analysis

Analyze Core Web Vitals using Google PageSpeed Insights.

**Endpoint:** `POST /audit/performance`

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "score": 91,
  "metrics": {
    "fcp": { "value": 1.2, "rating": "good" },
    "lcp": { "value": 2.1, "rating": "good" },
    "cls": { "value": 0.05, "rating": "good" },
    "fid": { "value": 45, "rating": "good" }
  },
  "issues": [
    {
      "severity": "warning",
      "description": "Render-blocking resources",
      "fix": "Defer non-critical CSS"
    }
  ],
  "categories": {
    "performance": 91,
    "accessibility": 88,
    "bestPractices": 92,
    "seo": 95
  }
}
```

---

### 4. Image Optimization

Analyze images for size and format optimization.

**Endpoint:** `POST /audit/images`

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "score": 85,
  "issues": [
    {
      "severity": "warning",
      "description": "Large image detected (2.5MB)",
      "element": "hero-image.jpg",
      "fix": "Compress image or use WebP format"
    }
  ],
  "categories": {
    "size": 80,
    "format": 90,
    "lazyLoading": 85
  }
}
```

---

### 5. Environment Comparison

Compare live and staging environments.

**Endpoint:** `POST /audit/compare`

**Request Body:**
```json
{
  "liveUrl": "https://example.com",
  "stageUrl": "https://staging.example.com"
}
```

**Response:**
```json
{
  "differences": [
    {
      "type": "content",
      "description": "Text changed in footer",
      "severity": "minor"
    }
  ],
  "metadata": {
    "liveUrl": "https://example.com",
    "stageUrl": "https://staging.example.com",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 6. Documentation Generation

Generate component documentation from HTML/CSS files.

**Endpoint:** `POST /audit/docs`

**Request Body:**
```json
{
  "files": "base64_encoded_zip"
}
```

**Response:**
```json
{
  "components": [
    {
      "name": "Button",
      "type": "component",
      "usage": "<button class=\"btn-primary\">Click me</button>"
    }
  ]
}
```

---

### 7. Newsletter Testing

Test email templates for compatibility.

**Endpoint:** `POST /audit/newsletter`

**Request Body:**
```json
{
  "emailHtml": "<html>...</html>"
}
```

**Response:**
```json
{
  "score": 88,
  "issues": [
    {
      "severity": "warning",
      "description": "Dark mode compatibility issue",
      "fix": "Add dark mode media query support"
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (missing parameters)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Example Usage

### cURL

```bash
curl -X POST http://localhost:5000/api/audit/website \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "platform": "custom"}'
```

### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:5000/api/audit/website', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    url: 'https://example.com',
    platform: 'custom'
  })
})

const data = await response.json()
console.log(data.score)
```

### Axios

```javascript
import axios from 'axios'

const { data } = await axios.post('/api/audit/accessibility', {
  url: 'https://example.com'
})

console.log(data.issues)
```
