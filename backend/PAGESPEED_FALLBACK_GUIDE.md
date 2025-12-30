# 🛡️ Robust PageSpeed Backend (Google API + Local Fallback)

I have upgraded the backend to be **Production-Grade**. It now automatically detects Google API rate limits and seamlessly switches to a local Lighthouse audit.

## 🚀 How It Works

1.  **Attempt Google API**: Tries to fetch data from `googleapis.com`.
2.  **Detect Failure**: Checks for `429 Too Many Requests` or `403 Quota Exceeded`.
3.  **Auto-Switch**: If quota is hit, it launches a **headless Chrome** instance on the server.
4.  **Local Audit**: Runs a full Lighthouse audit locally using `puppeteer`.
5.  **Standardize**: Formats the local result to MATCH the Google API JSON structure exactly.
6.  **Return**: The frontend gets the data it needs, unaware of the failure.

## 📂 Architecture

-   **Controller**: `src/controllers/pagespeed.controller.js`
    -   Orchestrates the logic.
    -   Handles API calls.
    -   Catches errors and triggers fallback.
-   **Service**: `src/services/lighthouse.service.js`
    -   Manages `chrome-launcher`.
    -   Runs `lighthouse` core.
    -   Transforms complex Lighthouse JSON into our clean, flat format.

## 🧪 Response Indicators

The JSON response now includes a `mode` field:

```json
{
  "ok": true,
  "mode": "psi",                 // Served via Google API
  // OR
  "mode": "fallback-lighthouse", // Served via Local Fallback
  "scores": { ... },
  "metrics": { ... }
}
```

## 📋 Dependencies Added

-   `lighthouse`: Core auditing engine.
-   `chrome-launcher`: For launching headless Chrome.

## 🛠️ Configuration

No new configuration is needed. It uses the existing `GOOGLE_PAGESPEED_API_KEY`.
If the key is missing or invalid, the system will simply hit the quota limit faster and switch to local mode automatically.

## 🛑 Troubleshooting

**If Fallback Fails:**
- Ensure Chrome is installed on the server environment.
- Check server logs for `Local Lighthouse Fallback Failed`.
- Increase server memory if audits are crashing (Lighthouse is memory intensive).
