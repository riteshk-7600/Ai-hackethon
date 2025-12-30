# 🔥 PageSpeed Auto-Fix Engine Architecture

This document details the architecture of the **PageSpeed Analysis + Auto-Fix Engine**, designed to provide deep file-level debugging and actionable code fixes.

## 🏗️ System Architecture

The system consists of three main layers:

1.  **Controller Layer (`pagespeed.controller.js`)**
    *   Handles incoming HTTP requests.
    *   Orchestrates the analysis flow (Google API vs. Local Fallback).
    *   Unifies the response format.
2.  **Analysis Service Layer (`lighthouse.service.js`)**
    *   Manages the local Lighthouse instance.
    *   Configured with **High-Fidelity PSI Settings** (throttling, emulation).
    *   Extracts raw audit data.
3.  **Auto-Fix Engine (`autofix.service.js`)**
    *   **The Brain**: Analyzes raw Lighthouse results (LHR).
    *   **Deep Scan**: Maps audits to specific files (URLs).
    *   **Patch Generator**: Creates `FixAction` objects with specific code commands or snippets.

---

## 🚀 API Endpoint

**GET** `/api/pagespeed?url=https://example.com&device=mobile`

### Response Shape (Enhanced)

```json
{
  "ok": true,
  "mode": "psi", // or "fallback-lighthouse"
  "scores": { "performance": 85, ... },
  "metrics": { "fcp": 1200, "lcp": 2500, ... },
  
  // 🔥 NEW: Deep Issue Map
  "issues": [
    {
      "id": "unused-css-rules",
      "title": "Remove Unused CSS",
      "file": "https://example.com/assets/main.css",
      "wastedKB": 45,
      "severity": "critical",
      "cause": "This file contains 60% unused styles",
      "fixAction": {
        "canAutoFix": true,
        "patchType": "purge-css",
        "command": "npm run purge-css -- --content src/**/*.html --css main.css",
        "description": "Run PurgeCSS to automatically remove unused rules."
      }
    }
  ],
  
  "autoFixSummary": {
    "totalFixable": 5,
    "requiresManual": 2
  },
  
  "fixPriorityList": [
    { "priority": 1, "issueId": "unused-css-rules", "impact": "High" }
  ]
}
```

---

## 🛠️ Auto-Fix Capabilities

The `AutoFixService` currently generates patches for:

1.  **Unused CSS**: Suggests `PurgeCSS` commands.
2.  **Unused JS**: Suggests Code Splitting / Tree Shaking config changes.
3.  **Render Blocking**: Suggests `defer / async` attribute updates.
4.  **Unoptimized Images**: Suggests `cwebp` conversion commands.
5.  **CLS**: Suggests CSS `min-height` rules.
6.  **Server Time**: Suggests Infrastructure/Caching improvements.

---

## 🔌 Frontend Integration Guide

To connect the frontend to this new engine:

1.  **Fetch Data**: Call the API endpoint.
2.  **Display Issues**: Iterate through `response.issues`.
3.  **Show Fixes**:
    *   Check `issue.fixAction`.
    *   If `canAutoFix` is `true`, display a **"🪄 Auto Fix"** button.
    *   On click, show a modal with the `fixAction.command` or `fixAction.suggestion`.
    
### Example Frontend Logic

```javascript
/* Inside your IssueCard component */
{issue.fixAction?.canAutoFix && (
  <div className="bg-gray-800 p-4 rounded mt-4">
    <h4 className="text-green-400 font-bold mb-2">🪄 Recommended Fix</h4>
    <p className="text-sm text-gray-300 mb-2">{issue.fixAction.description}</p>
    
    {issue.fixAction.command && (
      <code className="block bg-black p-2 rounded text-xs font-mono text-yellow-300">
        {issue.fixAction.command}
      </code>
    )}
    
    {issue.fixAction.suggestion && (
      <div className="mt-2">
         <span className="text-xs text-gray-400">Add this to your HTML:</span>
         <code className="block bg-black p-2 rounded text-xs font-mono text-blue-300">
            {issue.fixAction.suggestion}
         </code>
      </div>
    )}
  </div>
)}
```
