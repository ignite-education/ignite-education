# LinkedIn Posts Integration - Setup Guide

This guide explains how to set up the LinkedIn posts feed on your marketing page using Bright Data's API.

## Overview

The LinkedIn posts integration fetches the latest posts from [Ignite Courses LinkedIn page](https://www.linkedin.com/school/ignite-courses/) and displays them on your marketing page with:

- ✅ Latest 5 posts with engagement metrics (likes, comments, shares)
- ✅ 24-hour caching to minimize API costs (~$1.50/month)
- ✅ Automatic daily updates at 3 AM
- ✅ Fallback to mock data if API is unavailable
- ✅ No LinkedIn OAuth required

## Cost Breakdown

- **Bright Data API**: $0.05 per request
- **With daily updates**: ~30 requests/month = **$1.50/month**
- **Free tier**: 20 free API calls (covers first 3 weeks)
- **After free tier ends**: ~$1.50-2/month ongoing

## Setup Instructions

### 1. Sign Up for Bright Data

1. Go to [brightdata.com](https://brightdata.com/)
2. Create a free account
3. Navigate to **API & Datasets** section
4. Find **LinkedIn Company Scraper** dataset
5. You'll get 20 free API calls to start

### 2. Get Your API Key

1. Go to [brightdata.com/cp/api](https://brightdata.com/cp/api)
2. Create a new API token
3. Copy your API key

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
- Fetch posts on first request

### 5. Verify It's Working

**Option 1: Check the marketing page**
- Visit your auth/marketing page
- Scroll to the "Latest from Ignite" section
- You should see LinkedIn posts loading

**Option 2: Test the API endpoint directly**
```bash
curl http://localhost:3001/api/linkedin/posts?count=5
```

**Option 3: Manual cache refresh**
```bash
curl http://localhost:3001/api/linkedin/refresh
```

## How It Works

### Backend (server.js)

1. **Caching Layer**: Uses `node-cache` with 24-hour TTL
   - First request fetches from Bright Data
   - Subsequent requests use cached data
   - Cache auto-expires after 24 hours

2. **Bright Data Integration**:
   - Triggers scraping job for Ignite's LinkedIn page
   - Polls for results (max 1 minute)
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

**Response:**
```json
[
  {
    "id": "post-id",
    "text": "Post content...",
    "created": 1705190400000,
    "author": "Ignite Education",
    "likes": 47,
    "comments": 8,
    "shares": 12,
    "url": "https://www.linkedin.com/school/ignite-courses/",
    "image": null
  }
]
```

### GET `/api/linkedin/refresh`

Manually refresh the LinkedIn posts cache

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

### Posts not loading

1. Check server logs for errors:
   ```bash
   # Look for LinkedIn-related logs
   grep -i "linkedin" server.log
   ```

2. Verify API key is set:
   ```bash
   echo $BRIGHT_DATA_API_KEY
   ```

3. Test the endpoint directly:
   ```bash
   curl http://localhost:3001/api/linkedin/posts
   ```

### "Mock data" appearing

This means the Bright Data API call failed. Possible causes:

1. **No API key**: Add `BRIGHT_DATA_API_KEY` to `.env`
2. **Invalid API key**: Check your Bright Data dashboard
3. **Free tier exhausted**: Add payment method or wait for cache expiry
4. **Bright Data service issue**: Check [Bright Data status](https://status.brightdata.com/)

The system will automatically use mock data as fallback, so your site continues working.

### Cron job not running

1. Check timezone setting in `server.js`:
   ```javascript
   cron.schedule('0 3 * * *', async () => {
     // ...
   }, {
     timezone: "America/New_York" // Update to your timezone
   });
   ```

2. Verify cron is scheduled:
   - Server log should show: `⏰ LinkedIn posts cron job scheduled: Daily at 3 AM`

3. Manually trigger refresh to test:
   ```bash
   curl http://localhost:3001/api/linkedin/refresh
   ```

## Monitoring & Maintenance

### Check Cache Status

```bash
# Fetch posts and check if they're cached
curl -i http://localhost:3001/api/linkedin/posts
```

### Monitor API Usage

1. Log into Bright Data dashboard
2. Go to **API Usage** section
3. Check request count and costs

### Update Schedule

To change the update frequency, edit `server.js`:

```javascript
// Current: Daily at 3 AM
cron.schedule('0 3 * * *', ...)

// Every 12 hours: 
cron.schedule('0 */12 * * *', ...)

// Weekly (Sundays at 3 AM):
cron.schedule('0 3 * * 0', ...)
```

**Note**: More frequent updates = higher costs

## Cost Optimization Tips

1. **Use caching**: Already implemented (24-hour cache)
2. **Adjust update frequency**: Daily is optimal for costs
3. **Monitor usage**: Set up Bright Data spending alerts
4. **Free tier**: Maximize the 20 free calls first

## Bright Data Response Structure

The Bright Data API returns company data in this format:

```javascript
{
  status: 'ready',
  data: {
    posts: [
      {
        id: '...',
        text: '...',
        published_date: '2025-01-13',
        num_likes: 47,
        num_comments: 8,
        num_shares: 12,
        url: '...',
        image_url: '...'
      }
    ]
  }
}
```

Our code transforms this into the format expected by the frontend.

## Alternative: Manual Curation

If you prefer not to use Bright Data:

1. Comment out the Bright Data API call
2. Update `getMockLinkedInPosts()` in `server.js` with your actual posts
3. Manually update posts as needed

This is free but requires manual work.

## Support

- **Bright Data Docs**: https://docs.brightdata.com/
- **Bright Data Support**: support@brightdata.com
- **Cost Calculator**: https://brightdata.com/pricing/datasets

## Next Steps

1. ✅ API key added to `.env`
2. ✅ Server restarted
3. ✅ Posts loading on marketing page
4. 📊 Monitor costs in Bright Data dashboard
5. 🎨 Customize post display styling (optional)
