# Reddit OAuth Setup Guide

## The Error: "You Broke Reddit"

This error occurs when Reddit receives an OAuth request with missing or invalid credentials. It means the environment variables are not configured.

## Step-by-Step Setup

### 1. Create a Reddit App

1. **Log in to Reddit** with the account you want to use for posting
2. **Go to**: https://www.reddit.com/prefs/apps
3. **Scroll down** and click **"create another app..."** (or "are you a developer? create an app..." if first time)

4. **Fill in the form**:
   ```
   name: Ignite Learning Platform
   App type: ○ web app (select this radio button)
   description: (leave empty or add description)
   about url: (leave empty)
   redirect uri: http://localhost:5173/auth/reddit/callback
   ```

5. **Click "create app"**

### 2. Get Your Credentials

After creating the app, you'll see:

```
Ignite Learning Platform                               [edit] [delete]
web app                                                developed by u/YourUsername
description: (your description if you added one)
http://localhost:5173/auth/reddit/callback

personal use script    YOUR_CLIENT_ID_HERE             [edit] [delete]
secret                 YOUR_CLIENT_SECRET_HERE
```

- **Client ID**: The string under "personal use script" (looks like: `AbCdEfGhIjKlMnO`)
- **Client Secret**: The string next to "secret" (looks like: `AbCdEfGhIjKlMnOpQrStUvWxYz`)

### 3. Update Your .env File

Open the `.env` file in your project root and replace the placeholder values:

```env
VITE_REDDIT_CLIENT_ID=AbCdEfGhIjKlMnO
VITE_REDDIT_CLIENT_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz
VITE_REDDIT_REDIRECT_URI=http://localhost:5173/auth/reddit/callback
VITE_REDDIT_USER_AGENT=Ignite-Learning-Platform/1.0
```

**Important**: Use your actual values, not the examples above!

### 4. Restart Your Dev Server

After updating the `.env` file, you MUST restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

Vite only loads environment variables on startup, so changes won't take effect until you restart.

### 5. Test the Integration

1. Open http://localhost:5173
2. Click to create a new post
3. Check "Also post to r/ProductManagement on Reddit"
4. Click "Post"
5. You should be redirected to Reddit's authorization page
6. Click "Allow" to authorize the app
7. You'll be redirected back to your app
8. Your post should appear on both platforms!

## Troubleshooting

### Still Getting "You Broke Reddit"?

1. **Check your .env file**: Make sure you saved it with actual credentials (not placeholders)
2. **Restart dev server**: Press Ctrl+C and run `npm run dev` again
3. **Check browser console**: Open DevTools (F12) and look for error messages
4. **Verify redirect URI**: Make sure it exactly matches in both:
   - Your Reddit app settings: `http://localhost:5173/auth/reddit/callback`
   - Your .env file: `VITE_REDDIT_REDIRECT_URI=http://localhost:5173/auth/reddit/callback`

### "Invalid redirect_uri" Error?

The redirect URI in your Reddit app settings must EXACTLY match the one in your .env file:
- ✅ `http://localhost:5173/auth/reddit/callback`
- ❌ `http://localhost:5173/auth/reddit/callback/` (extra slash)
- ❌ `https://localhost:5173/auth/reddit/callback` (https instead of http)

### Environment Variables Not Loading?

Check your console logs. When you try to post, you should see:
```
🔗 Redirecting to Reddit OAuth: https://www.reddit.com/api/v1/authorize?client_id=...
```

If you see an alert about missing credentials, the .env file isn't being read.

## Security Notes

- **Never commit** your `.env` file to git (it's already in `.gitignore`)
- **Never share** your Client Secret publicly
- For production deployment, update the redirect URI in both:
  - Reddit app settings
  - Environment variables

## Need Help?

If you're still having issues:
1. Check the browser console (F12 → Console tab)
2. Look for any error messages or logs
3. Verify your Reddit app is set to "web app" type (not "script" or "installed app")
