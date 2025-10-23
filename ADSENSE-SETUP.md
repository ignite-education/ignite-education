# Google AdSense Setup Guide

## Step 1: Get Your Google AdSense Publisher ID

### If you already have a Google AdSense account:
1. Go to [Google AdSense](https://www.google.com/adsense)
2. Sign in with your Google account
3. Click on **Account** in the left sidebar
4. Look for your **Publisher ID** - it looks like: `ca-pub-1234567890123456`
5. Copy this ID (you'll need it in Step 2)

### If you DON'T have a Google AdSense account yet:
1. Go to [Google AdSense](https://www.google.com/adsense/start/)
2. Click **Get Started**
3. Fill out the application form:
   - Enter your website URL: `https://ignite.education`
   - Connect your Google account
   - Enter your payment details
4. **IMPORTANT**: AdSense review takes 1-2 weeks. Google will review your site to ensure it meets their policies:
   - Original content
   - Privacy policy page
   - Sufficient content (✓ you have this)
   - No prohibited content
5. Once approved, you'll get your **Publisher ID** (ca-pub-XXXXXXXXX)

## Step 2: Add Publisher ID to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your **ignite-education** project
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Click **Add New** button
6. Fill in:
   - **Key**: `VITE_GOOGLE_ADSENSE_CLIENT_ID`
   - **Value**: Your Publisher ID (e.g., `ca-pub-1234567890123456`)
   - **Environments**: Select all three:
     - ✓ Production
     - ✓ Preview
     - ✓ Development
7. Click **Save**
8. **Important**: Click **Redeploy** button at the top of your project dashboard to apply the new variable

## Step 3: Create Ad Units (After AdSense Approval)

Once your AdSense account is approved:

1. In Google AdSense dashboard, click **Ads** in the left sidebar
2. Click **By ad unit** tab
3. Click **Display ads** (for general website ads)
4. Configure your first ad unit:
   - **Name**: e.g., "Ignite Learning - Sidebar"
   - **Ad type**: Choose "Responsive" (recommended)
5. Click **Create**
6. Copy the **data-ad-slot** ID (looks like: `1234567890`)
7. Repeat for different ad placements:
   - "Ignite Learning - Header"
   - "Ignite Learning - Content"
   - "Ignite Learning - Footer"

## Step 4: Update Your Code with Ad Slot IDs

After you have your slot IDs, you can update the GoogleAd component usage throughout your site.

### Current placeholder code (example):
```jsx
<GoogleAd
  adClient={import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID}
  adSlot="placeholder"
  style={{ minHeight: '100px' }}
/>
```

### Update to:
```jsx
<GoogleAd
  adClient={import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID}
  adSlot="1234567890"  // Replace with your actual slot ID
  style={{ minHeight: '100px' }}
/>
```

## Step 5: Test Your Ads

1. After redeploying, visit https://ignite.education
2. Open browser DevTools (F12) → Console tab
3. You should see ads loading (may take a few minutes for first render)
4. **Note**: Initially, you may see blank spaces or PSA ads until AdSense learns your audience

## Important Notes

### Timeline:
- **Week 1-2**: Submit application, wait for approval
- **Week 3+**: Ads start showing, AdSense learns your audience
- **Week 4+**: Relevant ads begin appearing, revenue starts

### AdSense Policies:
- Don't click your own ads (will get banned)
- Don't ask users to click ads
- Must have privacy policy (you should add this)
- Must comply with content policies

### The "Duplicate Initialization" Error:
The error you're seeing (`adsbygoogle.push() error: All 'ins' elements in the DOM with class=adsbygoogle already have ads in them`) is a React re-rendering issue. It won't prevent your ads from working once you have valid credentials, but we can fix it later if needed.

### Placeholders vs Real Ads:
- **Without credentials**: Gray placeholders show (current state)
- **With credentials, before approval**: Placeholders still show
- **With credentials, after approval**: Real ads show

## Quick Start (If You Already Have AdSense)

If you already have an AdSense account and just need to add it:

1. Get your Publisher ID from AdSense dashboard
2. Add `VITE_GOOGLE_ADSENSE_CLIENT_ID` to Vercel environment variables
3. Click **Redeploy** in Vercel
4. Visit your site - ads should appear within a few minutes

## Troubleshooting

### "Ads not showing after adding credentials"
- Wait 10-15 minutes (AdSense needs time to serve first ads)
- Check browser console for errors
- Verify Publisher ID is correct in Vercel
- Make sure you redeployed after adding the variable

### "Still seeing placeholders"
- AdSense account might not be approved yet
- Ad units might not be created yet
- Browser ad blocker might be blocking (test in incognito mode)

### "Revenue is low"
- Takes time for AdSense to optimize
- Need more traffic for better earnings
- Consider ad placement optimization later

## Next Steps After Setup

1. **Add Privacy Policy page** (required by AdSense)
2. **Monitor performance** in AdSense dashboard
3. **Optimize ad placement** based on earnings data
4. **Don't obsess over revenue** early on - focus on content and users

---

## Your Current Status

✓ Code is ready for AdSense
✓ GoogleAd component implemented
✓ Placeholders working correctly
⏳ Waiting for: Publisher ID to be added to Vercel
⏳ Waiting for: AdSense approval (if new account)
