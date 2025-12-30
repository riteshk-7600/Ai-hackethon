# Deployment Guide

## Overview

This guide covers deploying the Frontend AI Suite to production using Vercel (frontend) and Render/Railway (backend).

---

## Prerequisites

- GitHub account
- Vercel account (free tier available)
- Render or Railway account (free tier available)
- API keys configured

---

## Part 1: Deploy Backend

### Option A: Deploy to Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `backend` directory

3. **Configure Service**
   ```
   Name: frontend-ai-suite-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Add Environment Variables**
   - Go to "Environment" tab
   - Add all variables from `.env.example`:
     ```
     PORT=5000
     NODE_ENV=production
     AI_PROVIDER=openai
     OPENAI_API_KEY=your_key
     PAGESPEED_API_KEY=your_key
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://your-app.onrender.com`

### Option B: Deploy to Railway

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure**
   - Railway auto-detects Node.js
   - Add environment variables in "Variables" tab
   - Deploy automatically starts

4. **Get URL**
   - Find your URL in "Settings" → "Domains"

---

## Part 2: Deploy Frontend

### Deploy to Vercel

1. **Update API URL**
   
   Edit `frontend/vite.config.js`:
   ```javascript
   export default defineConfig({
     plugins: [react()],
     server: {
       port: 3000,
       proxy: {
         '/api': {
           target: 'https://your-backend-url.onrender.com', // Update this
           changeOrigin: true
         }
       }
     }
   })
   ```

2. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

3. **Import Project**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select `frontend` as root directory

4. **Configure Build**
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

5. **Environment Variables**
   - Add if needed:
     ```
     VITE_API_URL=https://your-backend-url.onrender.com
     ```

6. **Deploy**
   - Click "Deploy"
   - Wait for build (2-5 minutes)
   - Your app is live at: `https://your-app.vercel.app`

---

## Part 3: Custom Domain (Optional)

### For Vercel (Frontend)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### For Render (Backend)

1. Go to Settings → Custom Domains
2. Add your API subdomain (e.g., `api.yourdomain.com`)
3. Update DNS records

---

## Part 4: Environment Variables Reference

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=production

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Google PageSpeed
PAGESPEED_API_KEY=...

# Optional: Database
MONGODB_URI=mongodb+srv://...

# Security
JWT_SECRET=your_random_secret_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Part 5: Post-Deployment Checklist

- [ ] Backend health check: `https://your-backend.onrender.com/health`
- [ ] Frontend loads correctly
- [ ] API calls work (check browser console)
- [ ] Test each module:
  - [ ] Website Auditor
  - [ ] Accessibility Checker
  - [ ] PageSpeed Analyzer
- [ ] AI features working (requires API keys)
- [ ] Reports can be exported

---

## Troubleshooting

### Backend Issues

**Problem:** 500 errors on API calls  
**Solution:** Check Render logs, verify environment variables

**Problem:** Puppeteer fails  
**Solution:** Render includes Chrome, but ensure `--no-sandbox` flag is used

### Frontend Issues

**Problem:** API calls fail with CORS  
**Solution:** Ensure backend has CORS enabled (already configured)

**Problem:** Build fails  
**Solution:** Check Node version (use 18+)

---

## Monitoring

### Render

- View logs in real-time from dashboard
- Set up alerts for downtime

### Vercel

- Analytics available in dashboard
- View deployment logs

---

## Scaling

### Backend

- Upgrade Render plan for more resources
- Add Redis for caching (optional)
- Use MongoDB Atlas for audit history

### Frontend

- Vercel auto-scales
- Use CDN for static assets

---

## Cost Estimate

**Free Tier:**
- Vercel: Free (hobby plan)
- Render: Free (with limitations)
- Total: $0/month

**Production:**
- Vercel Pro: $20/month
- Render Standard: $25/month
- MongoDB Atlas: $0-9/month
- Total: ~$50/month

---

## Security Checklist

- [ ] Environment variables secured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] API keys rotated regularly
- [ ] CORS configured properly
- [ ] Input validation in place

---

## Support

For deployment issues:
1. Check service status pages
2. Review deployment logs
3. Consult platform documentation
4. Open GitHub issue if needed
