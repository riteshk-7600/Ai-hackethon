# Frontend AI Quality & Automation Suite

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

A production-ready, full-stack AI automation web application for comprehensive frontend quality auditing. This tool covers the entire project lifecycle from planning to maintenance with 7 powerful modules.

## 🚀 Features

### Core Modules

1. **Website Auditor** - Analyze layout, spacing, typography, and design consistency
2. **Accessibility Checker** - Ensure WCAG 2.1 compliance with automated testing
3. **Live vs Stage Comparator** - Compare production and staging environments
4. **Image Optimizer** - Detect oversized images and suggest optimizations
5. **PageSpeed Analyzer** - Measure Core Web Vitals and performance metrics
6. **Auto Documentation Generator** - Generate component docs from HTML/CSS
7. **Newsletter Tester** - Test email templates for compatibility

### AI-Powered Features

- **Intelligent Issue Explanations** - AI explains problems in plain language
- **Automated Code Fixes** - Generate code snippets to resolve issues
- **Client-Friendly Reports** - AI-generated summaries for non-technical stakeholders
- **Visual Analysis** - Vision AI for screenshot comparison and alignment detection

## 📋 Prerequisites

- Node.js 18+ and npm
- API Keys:
  - OpenAI, Anthropic, or Google Gemini (for AI features)
  - Google PageSpeed Insights API (free tier available)

## 🛠️ Installation

### 1. Clone or Navigate to Project

```bash
cd frontend-ai-suite
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 3. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
PAGESPEED_API_KEY=your_key_here
```

## 🚀 Running the Application

### Development Mode

```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:5000
```

### Production Build

```bash
npm run build
```

## 📖 Usage

1. **Open Dashboard** - Navigate to `http://localhost:3000`
2. **Select Module** - Choose from sidebar (Website Auditor, Accessibility, etc.)
3. **Enter URL** - Paste the website URL you want to audit
4. **Run Audit** - Click the primary action button
5. **Review Results** - View scores, issues, and AI insights
6. **Export Report** - Download PDF report for clients

## 🏗️ Project Structure

```
frontend-ai-suite/
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Module pages
│   │   └── App.jsx          # Main app with routing
│   └── package.json
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── controllers/     # API endpoint handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   └── server.js        # Express server
│   └── package.json
└── docs/                     # Documentation
```

## 🔌 API Endpoints

### Audit Endpoints

```
POST /api/audit/website          # Website quality audit
POST /api/audit/accessibility    # WCAG compliance check
POST /api/audit/performance      # PageSpeed analysis
POST /api/audit/images           # Image optimization check
POST /api/audit/compare          # Live vs Stage comparison
POST /api/audit/docs             # Generate documentation
POST /api/audit/newsletter       # Email template testing
```

See [docs/API.md](docs/API.md) for detailed API documentation.

## 🎨 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **React Query** - Data fetching
- **Recharts** - Data visualization

### Backend
- **Node.js + Express** - Server framework
- **Puppeteer** - Web crawling and automation
- **axe-core** - Accessibility testing
- **OpenAI/Anthropic SDK** - AI integration
- **Sharp** - Image processing
- **Winston** - Logging

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Render/Railway)

```bash
cd backend
# Use included Dockerfile or deploy directly
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## 🎯 Use Cases

✅ **Hackathon Demo** - Impressive full-stack AI project  
✅ **Internal QA Automation** - Automate frontend quality checks  
✅ **Client Reporting** - Generate professional audit reports  
✅ **Accessibility Audits** - Ensure WCAG compliance  
✅ **Performance Monitoring** - Track Core Web Vitals  
✅ **Newsletter Testing** - Validate email templates  

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Built with modern web technologies
- Powered by AI (OpenAI, Anthropic, Google)
- Accessibility testing by axe-core
- Performance metrics from Google PageSpeed Insights

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for frontend quality automation**
