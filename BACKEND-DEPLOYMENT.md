# Backend Deployment Guide

## Backend API Endpoints

Your backend (`server.js`) provides these endpoints:
- `POST /api/chat` - AI tutor chat
- `GET /api/health` - Health check
- `POST /api/knowledge-check/question` - Generate knowledge check questions
- `POST /api/knowledge-check/evaluate` - Evaluate student answers
- `POST /api/generate-flashcards` - Generate flashcards
- `POST /api/generate-suggested-question` - Generate suggested questions
- `POST /api/create-checkout-session` - Stripe checkout
- `POST /api/webhook/stripe` - Stripe webhooks
- `POST /api/text-to-speech` - AWS Polly text-to-speech
- `GET /api/reddit-posts` - Fetch Reddit posts
- `POST /api/fetch-jobs` - Fetch job listings

## Deploy to Render

### 1. Create Render Account
- Go to https://render.com
- Sign up with GitHub

### 2. Create New Web Service
- Click "New +" → "Web Service"
- Connect your GitHub repository: `ignite-education/ignite-education`
- Configure:
  - **Name**: `ignite-education-api` (or your choice)
  - **Region**: Choose closest to your users
  - **Branch**: `main`
  - **Root Directory**: Leave blank
  - **Runtime**: `Node`
  - **Build Command**: `npm install`
  - **Start Command**: `node server.js`
  - **Instance Type**: Free (or upgrade for better performance)

### 3. Add Environment Variables

Click "Environment" and add these variables:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
VITE_REDDIT_CLIENT_ID=your_reddit_client_id
VITE_REDDIT_CLIENT_SECRET=your_reddit_client_secret
```

### 4. Deploy
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
- Your API will be live at: `https://ignite-education-api.onrender.com`

### 5. Update Frontend API URLs

After deployment, you need to update your frontend code to use the production API URL instead of `localhost:3001`.

**Files to update:**
- Find all instances of `http://localhost:3001`
- Replace with your Render URL: `https://ignite-education-api.onrender.com`

**Command to find all instances:**
```bash
grep -r "localhost:3001" src/
```

### 6. Push Changes to GitHub
```bash
git add .
git commit -m "Update API URLs to production backend"
git push
```

Vercel will automatically redeploy your frontend with the new API URLs!

## Testing

Once both frontend and backend are deployed:

1. Visit https://ignite.education
2. Test knowledge checks (uses `/api/knowledge-check/*` endpoints)
3. Test AI tutor chat (uses `/api/chat`)
4. Test Stripe checkout (uses `/api/create-checkout-session`)
5. Test all features

## Monitoring

- **Render Logs**: View in Render dashboard → Logs
- **Check Health**: Visit `https://your-api.onrender.com/api/health`
- **Errors**: Monitor in Render dashboard

## Important Notes

- **Free Tier Limitations**: Render's free tier spins down after 15 minutes of inactivity. First request after spin-down may take 30-60 seconds.
- **Upgrade for Production**: Consider upgrading to paid tier ($7/month) for:
  - No spin-down
  - Better performance
  - More resources

## Environment Variables Reference

Copy these values from your local `.env` file when setting up Render.
