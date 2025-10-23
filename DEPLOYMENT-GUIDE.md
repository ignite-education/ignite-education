# 🚀 Deployment Guide - Ignite Learning Platform

This guide will help you deploy your Ignite Learning Platform to a production domain.

## 📦 What You're Deploying

- **Frontend**: React + Vite application
- **Backend**: Node.js Express server (for payments & AI features)
- **Database**: Supabase (already hosted)
- **Storage**: Supabase Storage (already hosted)

---

## 🎯 Recommended: Deploy with Vercel (Frontend) + Railway (Backend)

### Part 1: Deploy Frontend to Vercel

#### Step 1: Prepare Your Code

1. **Ensure your code is on GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ignite-learning.git
   git push -u origin main
   ```

2. **Update environment variables for production**:
   - You'll add these in Vercel dashboard (don't commit `.env` file!)

#### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables** (click Environment Variables):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_REDDIT_CLIENT_ID=your_reddit_client_id
   VITE_REDDIT_CLIENT_SECRET=your_reddit_client_secret
   VITE_REDDIT_REDIRECT_URI=https://yourdomain.com/auth/reddit/callback
   VITE_REDDIT_USER_AGENT=Ignite-Learning-Platform/1.0
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

6. Click **"Deploy"**

7. Wait ~2 minutes - you'll get a URL like: `https://ignite-learning.vercel.app`

#### Step 3: Add Custom Domain

1. In Vercel dashboard → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `ignite.education`)
4. Follow DNS instructions to point domain to Vercel
5. SSL certificate auto-configured! ✅

---

### Part 2: Deploy Backend to Railway

Your backend (`server.js`) handles:
- Stripe payments (`/api/create-checkout-session`)
- AI features (`/api/knowledge-check/question`)

#### Step 1: Prepare Backend for Deployment

1. **Create `Procfile`** in root:
   ```
   web: node server.js
   ```

2. **Update `server.js` for production**:
   ```javascript
   // Add at the top
   const PORT = process.env.PORT || 3001;

   // Update CORS to allow your domain
   app.use(cors({
     origin: ['https://yourdomain.com', 'http://localhost:5174'],
     credentials: true
   }));

   // At the bottom
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

#### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway auto-detects Node.js and deploys!

5. **Add Environment Variables** in Railway dashboard:
   ```
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

6. Get your Railway URL (e.g., `https://your-app.railway.app`)

#### Step 3: Update Frontend to Use Production API

1. In your frontend code, update API URLs:
   ```javascript
   // Instead of: http://localhost:3001/api/...
   // Use: https://your-app.railway.app/api/...
   ```

2. Create `.env.production`:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```

3. Update fetch calls:
   ```javascript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
   fetch(`${API_URL}/api/create-checkout-session`, ...)
   ```

4. Redeploy frontend to Vercel (automatic if using Git)

---

## 🌐 Alternative: All-in-One Deployment

### Option A: Netlify (Frontend Only)

1. Go to [netlify.com](https://netlify.com)
2. Drag & drop your `dist` folder OR connect GitHub
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables
5. Add custom domain in Settings → Domain Management

### Option B: Render (Full-Stack)

1. Go to [render.com](https://render.com)
2. Create **Web Service** for backend
3. Create **Static Site** for frontend
4. Both get free SSL and custom domains

---

## 🔐 Security Checklist Before Going Live

### 1. Environment Variables
- [ ] Never commit `.env` files
- [ ] Set all env vars in hosting platform
- [ ] Use production URLs for Reddit OAuth callback
- [ ] Use production Stripe keys

### 2. Supabase Security
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Review RLS policies for production
- [ ] Set proper CORS origins in Supabase dashboard

### 3. API Security
- [ ] Add rate limiting to backend
- [ ] Validate all inputs
- [ ] Use HTTPS only
- [ ] Set secure CORS origins

### 4. Reddit OAuth
- [ ] Update Reddit app settings with production callback URL
- [ ] Update `VITE_REDDIT_REDIRECT_URI` to production domain

### 5. Stripe
- [ ] Switch from test mode to live mode
- [ ] Update webhook URLs to production
- [ ] Test payment flow in production

---

## 📝 Post-Deployment Steps

### 1. Update Reddit OAuth App
1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Edit your app
3. Update **redirect uri** to: `https://yourdomain.com/auth/reddit/callback`

### 2. Update Supabase CORS
1. Go to Supabase Dashboard → Settings → API
2. Add your domain to allowed origins

### 3. Configure Stripe Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-backend-url.railway.app/webhook`
3. Select events to listen for

### 4. Test Everything
- [ ] User registration/login
- [ ] Lesson completion
- [ ] Community posts
- [ ] Reddit integration
- [ ] Stripe payments
- [ ] Google Ads (need real domain)
- [ ] Calendly booking
- [ ] Curriculum upload

---

## 🐛 Common Deployment Issues & Fixes

### Issue: Build Fails
**Fix**: Check build logs, ensure all dependencies in `package.json`

### Issue: Environment Variables Not Working
**Fix**: Prefix with `VITE_` for frontend, restart after adding

### Issue: API Calls Failing
**Fix**: Update CORS settings, check API URL, verify env vars

### Issue: Reddit OAuth Fails
**Fix**: Update callback URL in Reddit app settings AND env var

### Issue: Stripe Payments Not Working
**Fix**: Check webhook URL, verify live keys, test in live mode

### Issue: Google Ads Not Showing
**Fix**: AdSense needs approved domain, verify ad code, disable ad blocker

---

## 💰 Cost Breakdown

### Free Tier (Perfect for Starting)
- **Vercel**: Free (includes custom domain + SSL)
- **Railway**: $5/month free credit (backend)
- **Netlify**: Free alternative
- **Supabase**: Free tier (2 projects, 500MB database)

### Domain Cost
- **Domain**: ~$10-15/year (Namecheap, GoDaddy)

### Total: ~$10-15/year (+ $5/month if Railway credits run out)

---

## 🚀 Quick Start Commands

```bash
# Build production frontend
npm run build

# Test production build locally
npm run preview

# Check for errors
npm run lint

# Deploy backend (if using Railway CLI)
railway up

# Check deployment
curl https://your-domain.com
```

---

## 📞 Need Help?

1. **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
2. **Railway Docs**: [docs.railway.app](https://docs.railway.app)
3. **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

---

**Ready to deploy? Start with Vercel for the frontend - it's the easiest! 🎉**
