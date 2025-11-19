# LinkedIn Posts Integration - Setup Guide

This guide explains how to set up the LinkedIn posts feed on your marketing page using Bright Data's **Web Scraper API**.

## Overview

The LinkedIn posts integration fetches the latest posts from [Ignite Courses LinkedIn page](https://www.linkedin.com/school/ignite-courses/) and displays them on your marketing page with:

- ✅ Latest 5 posts with engagement metrics (likes, comments, shares)
- ✅ 24-hour caching to minimize API costs (~$0.30-1/month)
- ✅ Automatic daily updates at 3 AM
- ✅ Fallback to mock data if API is unavailable
- ✅ No LinkedIn OAuth or browser automation required

## What Bright Data Product to Use

**✅ USE THIS**: **Web Scraper API - LinkedIn Company Scraper**
- Product page: https://brightdata.com/products/web-scraper/linkedin/company
- This is a simple REST API (HTTP calls)
- No browser automation needed
- Dataset ID: `gd_l1vikfnt1wgvvqz95w`

**❌ DON'T USE**: 
- Browser automation products
- Scraping Browser
- Proxy services

## Cost Breakdown

- **Bright Data Web Scraper API**: ~$0.001-0.01 per request
- **With daily updates**: ~30 requests/month = **$0.30-$1/month**
- **Free trial**: Available when you sign up
- **Much cheaper** than the $0.05 per request I initially mentioned

## Setup Instructions

### 1. Sign Up for Bright Data

1. Go to [brightdata.com](https://brightdata.com/)
2. Create a free account
3. Navigate to **Products** → **Web Scraper** → **LinkedIn**
4. Select **LinkedIn Company Scraper**

### 2. Get Your API Key

1. Go to your Bright Data dashboard
2. Navigate to **API & Datasets** section
3. Click on **Access Parameters** or **API Tokens**
4. Create a new API token or copy your existing one
5. Copy your API key (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 3. Add API Key to Environment Variables

Add to your `.env` file:

```bash
BRIGHT_DATA_API_KEY=your_api_key_here
```

### 4. Start Your Server

```bash
npm run dev  # or your start command
```

The server will automatically:
- Initialize the LinkedIn posts cache
- Schedule daily updates at 3 AM
- Use mock data until you add the API key

### 5. Verify It's Working

**Option 1: Check the marketing page**
- Visit your auth/marketing page (usually `/` or `/welcome`)
- Scroll to the "Latest from Ignite" section
- You should see LinkedIn posts loading

**Option 2: Test the API endpoint directly**
```bash
curl http://localhost:3001/api/linkedin/posts?count=5
```

You should see JSON with 5 posts (mock data if no API key, real data if configured).

**Option 3: Manual cache refresh**
```bash
curl http://localhost:3001/api/linkedin/refresh
```

This forces a fresh fetch from Bright Data.

## How It Works

### Backend (server.js)

1. **Caching Layer**: Uses `node-cache` with 24-hour TTL
   - First request fetches from Bright Data
   - Subsequent requests use cached data (instant)
   - Cache auto-expires after 24 hours

2. **Bright Data Web Scraper API**:
   - Sends POST request with LinkedIn school URL
   - Gets snapshot_id back
   - Fetches actual data using snapshot_id
   - Transforms data into standardized format
   - Falls back to mock data if API fails

3. **Cron Job**:
   - Runs daily at 3 AM (configurable timezone)
   - Clears cache and fetches fresh data
   - Ensures cache is always warm for users

### Frontend (Auth.jsx)

1. Fetches posts from `/api/linkedin/posts?count=5`
2. Displays in carousel format with:
   - Post text
   - Engagement metrics (likes, comments, shares)
   - Links to original LinkedIn posts
3. Auto-rotates every 5 seconds
4. Loading states and error handling

## API Endpoints

### GET `/api/linkedin/posts`

Fetch LinkedIn posts (uses cache if available)

**Query Parameters:**
- `count` (optional): Number of posts to return (default: 5)

**Example:**
```bash
curl http://localhost:3001/api/linkedin/posts?count=5
```

**Response:**
```json
[
  {
    "id": "post-url",
    "text": "Want to get into Product Management? Every week, we round up the best opportunities...",
    "created": 1705190400000,
    "author": "Ignite Education",
    "likes": 47,
    "comments": 8,
    "shares": 12,
    "url": "https://www.linkedin.com/school/ignite-courses/"
  }
]
```

### GET `/api/linkedin/refresh`

Manually refresh the LinkedIn posts cache (forces fresh fetch from Bright Data)

**Example:**
```bash
curl http://localhost:3001/api/linkedin/refresh
```

**Response:**
```json
{
  "success": true,
  "message": "LinkedIn posts cache refreshed",
  "posts": [...],
  "cachedUntil": "2025-11-20T03:00:00.000Z"
}
```

## Troubleshooting

### Posts not loading / Showing mock data

1. **Check if API key is set:**
   ```bash
   echo $BRIGHT_DATA_API_KEY
   ```

2. **Check server logs for errors:**
   ```bash
   # Look for LinkedIn-related logs
   tail -f server.log | grep -i linkedin
   ```

3. **Test the endpoint directly:**
   ```bash
   curl -v http://localhost:3001/api/linkedin/posts
   ```

4. **Manually refresh cache:**
   ```bash
   curl http://localhost:3001/api/linkedin/refresh
   ```

### Common Error Messages

**"BRIGHT_DATA_API_KEY not configured - using mock data"**
- Solution: Add API key to `.env` file and restart server

**"Error fetching from Bright Data"**
- Check that your API key is valid in Bright Data dashboard
- Verify you have credits/balance in your account
- Check Bright Data service status

**"No posts found in Bright Data response"**
- The LinkedIn page might have no recent posts
- Or Bright Data couldn't scrape the page
- Falls back to mock data automatically

### Cron job not running

1. **Check timezone setting** in `server.js`:
   ```javascript
   cron.schedule('0 3 * * *', async () => {
     // ...
   }, {
     timezone: "America/New_York" // Update to your timezone
   });
   ```

2. **Verify cron is scheduled:**
   - Server log should show: `⏰ LinkedIn posts cron job scheduled: Daily at 3 AM`

3. **Manually trigger refresh to test:**
   ```bash
   curl http://localhost:3001/api/linkedin/refresh
   ```

## Monitoring & Maintenance

### Check Cache Status

```bash
# Fetch posts and check server logs
curl http://localhost:3001/api/linkedin/posts
# Look for "Returning cached LinkedIn posts" or "Cache miss - fetching fresh"
```

### Monitor API Usage in Bright Data

1. Log into [Bright Data dashboard](https://brightdata.com/cp)
2. Go to **Billing** or **Usage** section
3. Check request count and costs
4. Set up spending alerts if available

### Update Schedule

To change the update frequency, edit the cron schedule in `server.js`:

```javascript
// Current: Daily at 3 AM
cron.schedule('0 3 * * *', ...)

// Every 12 hours: 
cron.schedule('0 */12 * * *', ...)

// Twice daily (3 AM and 3 PM):
cron.schedule('0 3,15 * * *', ...)

// Weekly (Sundays at 3 AM):
cron.schedule('0 3 * * 0', ...)
```

**Note**: More frequent updates = higher costs

## Cost Optimization Tips

1. **✅ Use caching**: Already implemented (24-hour cache)
2. **✅ Adjust update frequency**: Daily is optimal for balance of freshness and cost
3. **✅ Monitor usage**: Check Bright Data dashboard regularly
4. **✅ Set spending alerts**: Prevent unexpected charges

## Bright Data Web Scraper API - Technical Details

### Request Format

```bash
POST https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l1vikfnt1wgvvqz95w&format=json

Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json

Body:
[
  { "url": "https://www.linkedin.com/school/ignite-courses/" }
]
```

### Response Format

**Step 1 - Trigger response:**
```json
{
  "snapshot_id": "s_abc123xyz"
}
```

**Step 2 - Data fetch:**
```bash
GET https://api.brightdata.com/datasets/v3/snapshot/s_abc123xyz
```

**Step 2 - Response:**
```json
[
  {
    "name": "Ignite Education",
    "posts": [
      {
        "text": "Post content...",
        "posted_date": "2025-01-13",
        "num_likes": 47,
        "num_comments": 8,
        "num_reposts": 12,
        "post_url": "https://www.linkedin.com/..."
      }
    ]
  }
]
```

## Alternative: Manual Curation

If you prefer not to use Bright Data (or want to test without it):

1. The system automatically uses mock data when no API key is set
2. Update `getMockLinkedInPosts()` in `server.js` with your actual posts
3. Manually update posts as needed (weekly, monthly, etc.)

This is **free** but requires **manual work** to keep posts current.

## Next Steps Checklist

- [ ] Sign up for Bright Data account
- [ ] Get API key from Bright Data dashboard
- [ ] Add `BRIGHT_DATA_API_KEY` to `.env` file
- [ ] Restart server
- [ ] Test endpoint: `curl http://localhost:3001/api/linkedin/posts`
- [ ] Visit marketing page to see posts
- [ ] Set up spending alerts in Bright Data
- [ ] Monitor usage after first week

## Support & Resources

- **Bright Data Docs**: https://docs.brightdata.com/
- **LinkedIn Company Scraper**: https://brightdata.com/products/web-scraper/linkedin/company
- **API Reference**: https://docs.brightdata.com/api-reference/web-scraper-api
- **Support**: Contact Bright Data support through dashboard

---

**Questions?** Check the server logs for detailed error messages, or test the `/api/linkedin/refresh` endpoint to see real-time API behavior.
