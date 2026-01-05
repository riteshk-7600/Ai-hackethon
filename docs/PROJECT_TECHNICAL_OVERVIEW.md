# 🚀 Frontend AI Quality & Automation Suite: Technical Documentation

## 📑 Executive Summary
The **Frontend AI Quality & Automation Suite** is an enterprise-grade, full-stack platform designed to automate frontend audits, ensure WCAG compliance, and bridge the gap between design and development using advanced Vision AI. It operates with zero-assumption analysis, meaning it crawls real URLs and processes real images to generate actionable code fixes.

---

## 🏗️ Technical Architecture

### 1. The Core Engine (Backend)
Built on **Node.js 18+** and **Express**, the backend acts as an orchestration layer for several specialized services:

*   **Automation Layer**: Uses **Puppeteer** (headless Chrome) to crawl websites, stabilize layouts (removing popups/cookie banners), and capture high-resolution snapshots.
*   **Vision AI Pipeline**: Integrates with **Google Gemini Flash**, **OpenAI GPT-4o**, and **Anthropic Claude**. It performs visual analysis to detect design drifts and reconstruct email templates from images.
*   **Performance Engine**: Uses a hybrid approach. It first attempts to use the **Google PageSpeed Insights API**; if unavailable, it falls back to a local **Lighthouse**-style audit via Puppeteer performance marks.
*   **Accessibility Engine**: Powered by **axe-core**, the industry standard for WCAG 2.1 compliance. It maps detected issues to specific CSS selectors.
*   **Image Optimization Engine**: Built with **Sharp**, a high-performance image processing library used to compress images and convert them to modern formats like WebP and AVIF.
*   **Comparison Engine**: Uses **Pixelmatch** to perform binary diffing between production (Live) and staging environments, highlighting visual regressions.

### 2. The Command Center (Frontend)
A modern, high-performance **React 18** application scaffolded with **Vite**:

*   **Design System**: Custom-built using **Tailwind CSS**, featuring dark-mode aesthetics, glassmorphism, and responsive layouts.
*   **Data Synchronization**: Managed by **TanStack Query (React Query)** for efficient caching and real-time state management.
*   **Visualizations**: Leverages **Recharts** for the high-level quality dashboard.
*   **Security**: Implements stateless **JWT (JSON Web Token)** authentication, ensuring all audit routes are protected and audit history is user-specific.

---

## 🔑 API Key Reference
The system is designed to be flexible. It requires a minimum of **one** AI key to function fully.

| Key Name | Platform | Purpose | Required? |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio | **Primary Vision AI**. Used for Email Design Reconstruction, Visual Audit explanations, and Image SEO naming. | Recommended |
| `OPENAI_API_KEY` | OpenAI | Fallback Vision AI (GPT-4o). Used if Gemini is unavailable. | Optional |
| `ANTHROPIC_API_KEY` | Anthropic | Fallback for complex text-based audit summaries. | Optional |
| `PAGESPEED_API_KEY` | Google Cloud | Used to fetch official Core Web Vitals and Lighthouse scores. | Optional (local fallback exists) |

---

## 🛠️ Module-by-Module Breakdown

### 1. Website Auditor
*   **Logic**: Crawls the DOM -> Extracts computed styles for 1200+ nodes -> Analyzes typography scales, spacing systems (4px/8px grid), and color contrast.
*   **Fixes**: Generates a **CSS Patch** based on detected inconsistencies.

### 2. Accessibility Checker
*   **Logic**: Runs `axe-core` in a headless browser environment.
*   **Outcome**: Maps issues to exact line numbers and provides a visual overlay of WCAG violations.

### 3. Live vs Stage Comparator
*   **Logic**: Renders both URLs side-by-side -> Stabilizes both (suppressing animations/popups) -> Captures snapshots -> Generates a **Visual Diff Mask**.

### 4. PageSpeed Analyzer
*   **Logic**: High-fidelity performance analysis. It checks LCP (Largest Contentful Paint), CLS (Layout Shift), and FCP (First Contentful Paint).

### 5. Email Template Generator (Vision Pipeline)
*   **Logic**: Upload image -> AI Analysis (Vision) -> `EmailTableBuilder` -> Pixel-perfect Table-based HTML (Outlook compatible).

---

## ❓ Frequently Asked Questions (Demo Readiness)

**Q: Does this use mock data?**  
**A:** No. Every audit is a live execution. We launch a headless browser, navigate to the target URL, and analyze the real DOM.

**Q: How does it handle popups/cookie banners?**  
**A:** We use a custom "Stabilization Script" that executes before audits. It identifies common IDs like `#onetrust-banner-sdk` and suppresses them to ensure the audit sees the actual UI.

**Q: Is the HTML email code compatible with Outlook?**  
**A:** Yes. The backendUses a specialized `VML (Vector Markup Language)` generator for circular icons and rounded buttons, ensuring compatibility with the Microsoft Word-based rendering engine in Outlook.

**Q: Why do audits take 15-30 seconds?**  
**A:** Reliability. We perform a "Slow-Scroll" during crawling to trigger all lazy-loaded images and wait for the network to be completely idle before analyzing.

---

## 📦 Tech Stack Summary
*   **Backend**: Node.js, Express, Puppeteer, Sharp, Winston, JWT, Pixelmatch.
*   **Frontend**: React, Vite, Tailwind, React Query, Recharts, Lucide.
*   **DevOps**: Docker ready, `.env` driven configuration.
