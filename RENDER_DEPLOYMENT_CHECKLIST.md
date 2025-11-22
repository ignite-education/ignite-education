# Render Deployment Checklist - ElevenLabs Migration

## ✅ Code Changes (Already Complete)

- [x] Updated `server.js` to use ElevenLabs API
- [x] Installed `@elevenlabs/elevenlabs-js` package
- [x] Updated `package.json` dependencies
- [x] Updated `vite.config.js`
- [x] Updated `Privacy.jsx`
- [x] Updated `.env.example`
- [x] Created migration documentation
- [x] Committed changes (commit: `2cfd34f`)
- [x] Pushed to GitHub

---

## 🚀 Render Dashboard Setup (Do This Now)

### Step 1: Access Your Render Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Sign in to your account
3. Find and click on your backend service: **ignite-education-api**

### Step 2: Add Environment Variables

Click on the **"Environment"** tab, then add these variables:

#### Add These:
```
ELEVENLABS_API_KEY
Value: sk_87d81afcd2f99b2a9c4d76bfb699974ea9ca1d8d50b5a2e1
```

```
ELEVENLABS_VOICE_ID
Value: Xb7hH8MSUJpSbSDYk0k2
```

#### Remove These (Optional but Recommended):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### Step 3: Save Changes

1. Click **"Save Changes"** at the bottom
2. Render will automatically trigger a **new deployment**
3. Wait 2-5 minutes for deployment to complete

---

## 🔍 Verify Deployment

### Check Deployment Status

1. Go to the **"Events"** tab in Render
2. Look for: `Deploy live for...`
3. Check the build logs for:
   ```
   ✅ ElevenLabs configured: Yes
   ```

### Check Service Logs

1. Go to the **"Logs"** tab
2. Look for startup message:
   ```
   🤖 Claude chat server running on http://localhost:3001
   ✅ ElevenLabs configured: Yes
   ```

---

## ✅ Test in Production

### Test Voice-Over Feature

1. Go to your production site: [ignite.education](https://ignite.education)
2. Navigate to any lesson
3. Click the **voice-over button** (speaker icon)
4. Listen for:
   - Natural British female voice (Alice)
   - Clear, expressive narration
   - Higher quality than before

### What You Should Hear

**Before (AWS Polly - Arthur):**
- Male British voice
- Slightly robotic
- Authoritative tone

**After (ElevenLabs - Alice):**
- Female British voice
- Very natural and human-like
- Clear and expressive

---

## 🐛 Troubleshooting

### Issue: Voice-over button doesn't work

**Check:**
1. Render deployment completed successfully
2. Environment variables are saved in Render
3. Service restarted after adding env vars
4. Check Render logs for errors

### Issue: Still hearing old voice

**Solutions:**
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
2. Clear browser cache
3. Check Render logs show `ElevenLabs configured: Yes`
4. Verify deployment timestamp is recent

### Issue: "Failed to generate speech" error

**Check:**
1. API key is correct in Render
2. Voice ID is correct: `Xb7hH8MSUJpSbSDYk0k2`
3. ElevenLabs account has available quota
4. Check Render logs for specific error

---

## 📋 Environment Variables Summary

Your Render service should have these variables:

### Required for ElevenLabs:
- ✅ `ELEVENLABS_API_KEY` = `sk_87d81afcd2f99b2a9c4d76bfb699974ea9ca1d8d50b5a2e1`
- ✅ `ELEVENLABS_VOICE_ID` = `Xb7hH8MSUJpSbSDYk0k2`

### Other Variables (Keep These):
- `ANTHROPIC_API_KEY` - For Claude AI chat
- `SUPABASE_SERVICE_ROLE_KEY` - For database
- `STRIPE_SECRET_KEY` - For payments
- `STRIPE_WEBHOOK_SECRET` - For Stripe webhooks
- `RESEND_API_KEY` - For emails (optional)
- `VITE_SUPABASE_URL` - Frontend Supabase URL
- Any LinkedIn/Reddit API keys

### Remove (No Longer Needed):
- ❌ `AWS_ACCESS_KEY_ID`
- ❌ `AWS_SECRET_ACCESS_KEY`
- ❌ `AWS_REGION`

---

## 🎯 Success Criteria

- [ ] Render deployment shows "Live"
- [ ] Logs show "ElevenLabs configured: Yes"
- [ ] Voice-over plays in production
- [ ] Voice sounds like Alice (British female)
- [ ] Voice quality is noticeably better
- [ ] No errors in Render logs
- [ ] No errors in browser console

---

## 📞 Quick Access Links

- **Render Dashboard:** [dashboard.render.com](https://dashboard.render.com)
- **Production Site:** [ignite.education](https://ignite.education)
- **ElevenLabs Dashboard:** [elevenlabs.io](https://elevenlabs.io)
- **API Usage:** Check ElevenLabs dashboard for character usage

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong:

1. **Quick Fix:** Re-add AWS environment variables in Render
2. **Code Rollback:**
   ```bash
   git revert 2cfd34f
   git push origin main
   ```
3. **Redeploy:** Render will auto-deploy the reverted code

---

## ⏱️ Estimated Timeline

- Environment variables: **2 minutes**
- Render deployment: **3-5 minutes**
- Testing: **2 minutes**
- **Total: ~10 minutes**

---

## 📝 Post-Deployment Notes

Once deployed, monitor:

1. **ElevenLabs Usage:** Check your dashboard for character usage
2. **Cost:** Track monthly costs vs AWS Polly
3. **User Feedback:** Note any comments about improved voice quality
4. **Error Rates:** Monitor Render logs for any TTS failures

---

**Last Updated:** 2025-11-22
**Deployment Commit:** `2cfd34f`
**Status:** Ready to deploy ✅
