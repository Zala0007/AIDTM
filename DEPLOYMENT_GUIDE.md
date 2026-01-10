# Deployment Guide: Vercel (Frontend) + Render (Backend)

## Overview
This guide covers deploying the ClinkerFlow Optimization application with:
- **Frontend**: Next.js app on Vercel
- **Backend**: FastAPI app on Render

---

## Part 1: Deploy Backend to Render

### Step 1: Prepare Backend for Deployment

1. **Ensure requirements.txt is up to date** (already present in `/backend`)

2. **Verify main_v2.py uses PORT from environment**:
   ```python
   # Already configured to use $PORT from Render
   ```

### Step 2: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `clinkerflow-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your deployment branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main_v2:app --host 0.0.0.0 --port $PORT`

### Step 3: Configure Environment Variables on Render

Add these environment variables in Render dashboard:

```bash
APP_ENV=production
DEBUG=false
APP_NAME=ClinkerFlow Optimization API
APP_VERSION=0.1.0

# CRITICAL: Add your Vercel URL after frontend deployment
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app

# Security - Generate a secure random string
SECRET_KEY=your-secure-random-secret-key-here

# Python version
PYTHON_VERSION=3.12

# Optional: Optimization settings
MAX_PERIODS=52
DEFAULT_PERIODS=4
MAX_PLANTS=500
MAX_ROUTES=500
```

**Important Notes:**
- Replace `your-app.vercel.app` with your actual Vercel domain (you'll get this after frontend deployment)
- Use pattern `https://your-app-*.vercel.app` to allow preview deployments
- Generate a secure SECRET_KEY using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

### Step 4: Deploy Backend

1. Click **"Create Web Service"**
2. Wait for deployment to complete (5-10 minutes)
3. Note your backend URL: `https://clinkerflow-backend.onrender.com` (example)
4. Test the backend:
   ```bash
   curl https://your-backend-url.onrender.com/health
   ```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Update Frontend Configuration

1. **Update `.env.production` with your Render backend URL**:
   ```bash
   cd frontend
   ```
   
   Edit `.env.production`:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   NODE_ENV=production
   NEXT_PUBLIC_ENV=production
   ```

2. **Commit the changes**:
   ```bash
   git add .env.production
   git commit -m "Update production backend URL"
   git push
   ```

### Step 2: Deploy to Vercel (Option A: CLI)

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to production**:
   ```bash
   cd frontend
   vercel --prod
   ```

4. **Set environment variable** (if not using .env.production):
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   # Paste: https://your-backend-url.onrender.com
   ```

### Step 2: Deploy to Vercel (Option B: Dashboard)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. **Add Environment Variables**:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-backend-url.onrender.com`
   - Environment: Production

6. Click **"Deploy"**

### Step 3: Update Backend CORS Settings

After frontend deploys, Vercel will give you a URL like `https://your-app.vercel.app`

1. Go back to **Render Dashboard** → Your backend service
2. Update `ALLOWED_ORIGINS` environment variable:
   ```
   https://your-app.vercel.app,https://your-app-*.vercel.app
   ```
3. Click **"Save Changes"** - this will trigger a backend redeployment

---

## Part 3: Verify Deployment

### Test Backend Endpoints

```bash
# Health check
curl https://your-backend-url.onrender.com/health

# API endpoints
curl https://your-backend-url.onrender.com/api/sources
curl https://your-backend-url.onrender.com/api/destinations
curl https://your-backend-url.onrender.com/initial-data
```

### Test Frontend

1. Open `https://your-app.vercel.app`
2. Check browser console for errors
3. Navigate to "Advanced Optimization" page
4. Verify data loads properly

---

## Troubleshooting

### Issue: 502 Bad Gateway on Frontend

**Cause**: Frontend can't reach backend

**Solutions**:
1. Check `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Verify backend is running on Render
3. Check backend logs on Render dashboard
4. Ensure no trailing slash in API URL

### Issue: CORS Errors

**Cause**: Backend not allowing frontend origin

**Solutions**:
1. Add frontend URL to `ALLOWED_ORIGINS` on Render
2. Include both production and preview URLs: `https://your-app.vercel.app,https://your-app-*.vercel.app`
3. Redeploy backend after updating CORS settings

### Issue: Backend 500 Errors

**Cause**: Missing CSV data files or dependencies

**Solutions**:
1. Ensure `real_data` folder is in your repository
2. Check backend logs on Render
3. Verify all dependencies in requirements.txt
4. Check environment variables are set correctly

### Issue: Frontend Build Fails on Vercel

**Cause**: TypeScript errors or missing dependencies

**Solutions**:
1. Run `npm run build` locally first
2. Fix any TypeScript errors
3. Ensure all dependencies in package.json
4. Check Vercel build logs for specific errors

---

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `APP_ENV` | Yes | `production` | Application environment |
| `DEBUG` | Yes | `false` | Disable debug mode in production |
| `ALLOWED_ORIGINS` | Yes | `https://app.vercel.app` | Comma-separated CORS origins |
| `SECRET_KEY` | Yes | `random-string-here` | Secure random string |
| `PYTHON_VERSION` | Yes | `3.12` | Python runtime version |
| `MAX_PERIODS` | No | `52` | Maximum optimization periods |

### Frontend (Vercel)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `https://backend.onrender.com` | Backend API URL (no trailing slash) |
| `NODE_ENV` | Auto | `production` | Set automatically by Vercel |
| `NEXT_PUBLIC_ENV` | No | `production` | Custom environment flag |

---

## Maintenance

### Update Backend

```bash
git add .
git commit -m "Update backend"
git push
# Render auto-deploys from GitHub
```

### Update Frontend

```bash
git add .
git commit -m "Update frontend"
git push
# Vercel auto-deploys from GitHub
```

### Manual Redeployment

- **Render**: Click "Manual Deploy" → "Deploy latest commit"
- **Vercel**: Click "Deployments" → "Redeploy"

---

## Quick Reference: Current Setup

**Backend URL**: `https://clinkerflow-backend.onrender.com` (update with your actual URL)  
**Frontend URL**: `https://your-app.vercel.app` (update with your actual URL)

**Local Development URLs**:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8003`
