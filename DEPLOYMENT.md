# Deployment Guide for Ignite Learning

## Prerequisites
1. GitHub account
2. Vercel account (free)
3. Your environment variables ready

## Step 1: Push to GitHub

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Ignite Learning Platform"

# Create a new repository on GitHub (https://github.com/new)
# Then connect your local repository:
git remote add origin https://github.com/YOUR_USERNAME/ignite-learning.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### Frontend Deployment

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your `ignite-learning` repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (leave as root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variables (click "Environment Variables"):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_GOOGLE_ADSENSE_CLIENT_ID=your_adsense_client_id
```

6. Click "Deploy"

### Backend Deployment (Node.js Server)

You have two options:

#### Option A: Deploy to Render (Recommended for backend)

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click "New +" → "Web Service"
3. Connect your repository
4. Configure:
   - **Root Directory**: Leave blank (or specify if server is in a subfolder)
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js` (adjust path if needed)
   - **Environment**: Node

5. Add Environment Variables:
```
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

6. Click "Create Web Service"

7. Once deployed, update your frontend API calls to use the Render URL instead of `http://localhost:3001`

#### Option B: Keep localhost for now
- For initial deployment, you can keep the backend running locally
- Later migrate to a cloud service when you're ready for production

## Step 3: Update Frontend API URLs

After deploying your backend, update the API URLs in your frontend code:

Find and replace all instances of `http://localhost:3001` with your production API URL (e.g., `https://your-app.onrender.com`)

Files to check:
- `src/components/KnowledgeCheck.jsx`
- `src/lib/api.js`
- Any other files making API calls

## Step 4: Configure Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Make sure your production URL is added to **Site URL** under **Auth**
4. Add your Vercel domain to **Redirect URLs**:
   - `https://your-app.vercel.app/*`
   - `https://your-custom-domain.com/*` (if using custom domain)

## Step 5: Configure Stripe

1. Go to Stripe Dashboard
2. Switch to "Production" mode (top right toggle)
3. Update webhook URLs to point to your production backend
4. Replace test API keys with live API keys in Vercel environment variables

## Step 6: Test Everything

1. Visit your Vercel URL
2. Test user authentication (sign up, sign in, sign out)
3. Test lesson access and completion
4. Test knowledge checks
5. Test Stripe payments (use Stripe test mode first!)
6. Check all API integrations

## Making Changes After Deployment

### Development Workflow

```bash
# 1. Create a new branch for your changes
git checkout -b feature/your-feature-name

# 2. Make your changes and test locally
npm run dev

# 3. Commit your changes
git add .
git commit -m "Description of your changes"

# 4. Push to GitHub
git push origin feature/your-feature-name

# 5. Create a Pull Request on GitHub
# - Vercel will automatically create a preview deployment
# - Test the preview URL before merging

# 6. Merge to main
# - Vercel automatically deploys to production
# - Your live site updates within seconds
```

### Quick Fixes (Direct to main)

```bash
# Make your changes
git add .
git commit -m "Fix: description"
git push

# Vercel automatically deploys to production
```

## Environment Variables Reference

### Frontend (.env for local development)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-...
```

### Backend (.env for local development)
```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
PORT=3001
```

## Custom Domain (Optional)

1. In Vercel, go to your project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update Supabase redirect URLs to include your custom domain

## Monitoring & Analytics

- **Vercel Analytics**: Automatically enabled (check Analytics tab)
- **Supabase Logs**: Monitor in Supabase dashboard
- **Stripe Dashboard**: Monitor payments and webhooks

## Troubleshooting

### Build Fails
- Check build logs in Vercel
- Verify all environment variables are set
- Test build locally: `npm run build`

### API Not Working
- Check CORS settings on your backend
- Verify API URLs in frontend code
- Check backend logs in Render/Railway

### Authentication Issues
- Verify Supabase redirect URLs
- Check Site URL in Supabase settings
- Ensure environment variables are correct

## Support

If you need help:
1. Check Vercel documentation: https://vercel.com/docs
2. Check Render documentation: https://render.com/docs
3. Check Supabase documentation: https://supabase.com/docs
