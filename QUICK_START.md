# LinkedIn Posts Integration - Quick Start

## TL;DR

Your LinkedIn posts integration is **ready to go**! Just add your Bright Data API key to start showing real LinkedIn posts.

## What's Been Built

✅ Backend API endpoint that fetches posts from Bright Data
✅ 24-hour caching to minimize costs (~$0.30-1/month)  
✅ Daily auto-refresh at 3 AM
✅ Frontend already displays posts in carousel format
✅ Fallback to mock data if API unavailable

## Get Started in 3 Steps

### 1. Sign up for Bright Data (5 minutes)

Go to: **https://brightdata.com/products/web-scraper/linkedin/company**

- Click "Start free trial"
- Create account
- Get your API key from the dashboard

### 2. Add API key to .env (30 seconds)

```bash
echo "BRIGHT_DATA_API_KEY=your_api_key_here" >> .env
```

### 3. Restart server (30 seconds)

```bash
npm run dev
```

## Verify It Works

Visit your marketing page and check the "Latest from Ignite" section, or:

```bash
curl http://localhost:3001/api/linkedin/posts?count=5
```

## What Product to Use on Bright Data

✅ **Web Scraper API - LinkedIn Company Scraper**

**NOT**:
- ❌ Browser automation
- ❌ Proxy services  
- ❌ Datasets (that's different)

Dataset ID you need: `gd_l1vikfnt1wgvvqz95w`

## Costs

- **Per request**: ~$0.001-0.01
- **Per month**: ~$0.30-1 (with daily updates)
- **Free trial**: Available when you sign up

Much cheaper than LinkedIn's official API!

## Files Modified

- `server.js` - Bright Data integration with caching
- `src/components/Auth.jsx` - Already configured to use the endpoint
- `package.json` - Added dependencies

## Files Created

- `.env.example` - Environment variable template
- `LINKEDIN_SETUP.md` - Complete setup guide
- `QUICK_START.md` - This file

## Support

Full documentation: See `LINKEDIN_SETUP.md`

Test endpoint: `curl http://localhost:3001/api/linkedin/posts`

Manual refresh: `curl http://localhost:3001/api/linkedin/refresh`

---

**That's it!** The code is ready. Just add your Bright Data API key and it works.
