# Quick Deployment Setup

## What You Need to Do NOW:

### 1. Deploy Backend to Render (Do This First!)

**Option A: Using render.yaml (Recommended)**

1. Commit your code:
   ```bash
   cd E:\adani
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **"New +"** → **"Blueprint"**
4. Connect your repository and select the `render.yaml` file
5. Click **"Apply"**
6. Wait 5-10 minutes for deployment
7. **Copy your backend URL** (e.g., `https://adani-clinkerflow-api.onrender.com`)

**Option B: Manual Setup**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect repository
4. Settings:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main_v2:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (see DEPLOYMENT_GUIDE.md)
6. Deploy

---

### 2. Update Frontend with Backend URL

1. **Update .env.production**:
   ```bash
   cd E:\adani\frontend
   ```
   
   Edit `.env.production` and replace with your actual Render URL:
   ```env
   NEXT_PUBLIC_API_URL=https://adani-clinkerflow-api.onrender.com
   ```

2. **Commit the change**:
   ```bash
   git add .env.production
   git commit -m "Update production backend URL"
   git push
   ```

---

### 3. Deploy Frontend to Vercel

**From your PowerShell terminal (already open at E:\adani\frontend)**:

```bash
# Make sure you're in frontend directory
cd E:\adani\frontend

# Deploy to production
vercel --prod
```

**Follow the prompts**:
- Link to existing project? → **Yes** (if you've deployed before)
- Select your project → Choose `clinkerflow-optimization`
- Deploy to production? → **Yes**

**Alternative: Use Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project or import new
3. Root Directory: `frontend`
4. Click Deploy

---

### 4. Update Backend CORS (Critical!)

After Vercel gives you a URL (e.g., `https://clinkerflow-optimization.vercel.app`):

1. Go to **Render Dashboard** → Your web service
2. Click **"Environment"**
3. Edit `ALLOWED_ORIGINS`:
   ```
   https://clinkerflow-optimization.vercel.app,https://clinkerflow-optimization-*.vercel.app
   ```
4. Click **"Save Changes"**

---

## Testing Deployment

### Test Backend:
```bash
# Replace with your actual Render URL
curl https://adani-clinkerflow-api.onrender.com/health
curl https://adani-clinkerflow-api.onrender.com/api/sources
```

### Test Frontend:
1. Open your Vercel URL in browser
2. Open browser DevTools (F12) → Console
3. Navigate to "Advanced Optimization"
4. Check for any errors

---

## Current Issues Fixed ✅

1. ✅ API routes now use `NEXT_PUBLIC_API_URL` instead of `OPTIMIZER_API_BASE_URL`
2. ✅ Removed localhost fallbacks in production
3. ✅ Updated all 5 API route files
4. ✅ Set production environment variables
5. ✅ Configured CORS properly
6. ✅ Updated render.yaml with proper settings

---

## What Happens Next

When you run `vercel --prod`:
- Vercel reads `vercel.json` for configuration
- Uses `.env.production` for environment variables
- Builds your Next.js app
- Deploys to production
- Gives you a URL like `https://clinkerflow-optimization.vercel.app`

The 502 error will be fixed because:
- Frontend will use `NEXT_PUBLIC_API_URL` from `.env.production`
- This points to your Render backend (not localhost)
- Backend allows requests from your Vercel domain via CORS

---

## Quick Commands Summary

```bash
# 1. Backend - Push code (Render auto-deploys)
cd E:\adani
git add .
git commit -m "Deploy backend"
git push

# 2. Frontend - Update backend URL
cd frontend
# Edit .env.production with your Render URL
git add .env.production
git commit -m "Update backend URL"
git push

# 3. Frontend - Deploy to Vercel
vercel --prod

# 4. Test
curl https://your-backend.onrender.com/health
# Open https://your-frontend.vercel.app in browser
```

---

## Need Help?

Check `DEPLOYMENT_GUIDE.md` for detailed troubleshooting and environment variable reference.
