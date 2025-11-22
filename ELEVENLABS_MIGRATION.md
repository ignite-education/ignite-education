# ElevenLabs Text-to-Speech Migration Guide

## Overview
This document outlines the migration from Amazon Polly to ElevenLabs for text-to-speech voice-over functionality in the Ignite Education learning hub.

## Migration Summary

### What Changed
- **From:** Amazon Web Services (AWS) Polly
- **To:** ElevenLabs Text-to-Speech API
- **Voice:** British female (Alice) - natural, AI-generated voice
- **Model:** `eleven_multilingual_v2` - High quality with emotional range

### Why ElevenLabs?
1. **Superior Voice Quality:** More natural, human-like speech with better emotional range
2. **Simpler Integration:** Direct REST API without complex AWS SDK setup
3. **Better Pricing:** Transparent, usage-based pricing
4. **Higher Character Limits:** 5000 characters vs 3000 for Polly Neural voices
5. **Advanced Features:** Voice cloning, style control, and customization options

---

## Technical Changes

### 1. Dependencies Updated

#### Removed:
```json
"@aws-sdk/client-polly": "^3.913.0"
```

#### Added:
```json
"@elevenlabs/elevenlabs-js": "^0.8.3"
```

### 2. Environment Variables

#### Removed:
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

#### Added:
```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=Xb7hH8MSUJpSbSDYk0k2  # Alice - British female (optional, defaults to Alice)
```

### 3. Backend Implementation (server.js)

#### Before (AWS Polly):
```javascript
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// In endpoint:
const params = {
  Text: text,
  OutputFormat: 'mp3',
  VoiceId: 'Arthur',
  Engine: 'neural',
  TextType: 'text'
};
const command = new SynthesizeSpeechCommand(params);
const response = await pollyClient.send(command);
```

#### After (ElevenLabs):
```javascript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// In endpoint:
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2';
const audio = await elevenlabs.textToSpeech.convert(voiceId, {
  text: text,
  model_id: 'eleven_multilingual_v2',
  output_format: 'mp3_44100_128',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  }
});
```

### 4. Frontend Changes
**NO CHANGES REQUIRED** - The frontend (LearningHub.jsx) continues to use the same API endpoint (`/api/text-to-speech`) with identical request/response format. The UX remains exactly the same.

---

## Setup Instructions

### Step 1: Get ElevenLabs API Key

1. Go to [elevenlabs.io](https://elevenlabs.io/)
2. Create an account or sign in
3. Navigate to your profile settings
4. Generate an API key
5. Copy the API key

### Step 2: Choose a Voice (Optional)

#### Recommended British Female Voices:
- **Alice** (Default): `Xb7hH8MSUJpSbSDYk0k2` - Captivating, expressive, clear
- **Anna**: Informative and trustworthy, lower register
- **Brianna**: Middle-aged Yorkshire accent, soft and soothing

To find more voices:
1. Visit [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Filter by "British" and "Female"
3. Listen to samples
4. Copy the Voice ID from your chosen voice

### Step 3: Update Environment Variables

**Local Development (.env):**
```bash
ELEVENLABS_API_KEY=sk_your_actual_api_key_here
ELEVENLABS_VOICE_ID=Xb7hH8MSUJpSbSDYk0k2  # Optional: defaults to Alice
```

**Production (Render):**
1. Go to your Render dashboard
2. Navigate to your backend service
3. Go to Environment tab
4. Add new environment variables:
   - `ELEVENLABS_API_KEY`: Your API key
   - `ELEVENLABS_VOICE_ID`: Your chosen voice ID (optional)
5. Save changes
6. Redeploy the service

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Test Locally
```bash
# Terminal 1: Start backend server
npm run server

# Terminal 2: Start frontend dev server
npm run dev
```

Navigate to a lesson and click the voice-over button to test.

---

## API Comparison

| Feature | AWS Polly | ElevenLabs |
|---------|-----------|------------|
| **Voice Quality** | Good (slightly robotic) | Excellent (very natural) |
| **Character Limit** | 3,000 (Neural) | 5,000 (Standard plan) |
| **Latency** | ~1-2 seconds | ~75ms (Flash model) |
| **Emotional Range** | Limited | High (contextual) |
| **British Female Voices** | Amy, Emma | Alice, Anna, Brianna, etc. |
| **Setup Complexity** | AWS SDK + credentials | Simple REST API |
| **Pricing** | $4/1M characters | Tiered usage-based |

---

## Voice Settings Explained

```javascript
voice_settings: {
  stability: 0.5,           // 0-1: Lower = more expressive, Higher = more consistent
  similarity_boost: 0.75,   // 0-1: How closely to match the voice characteristics
  style: 0.0,              // 0-1: Style exaggeration (0 = neutral)
  use_speaker_boost: true  // Enhance voice clarity
}
```

### Recommended Settings for Educational Content:
- **Stability:** 0.5 (balanced)
- **Similarity Boost:** 0.75 (maintain voice characteristics)
- **Style:** 0.0 (neutral, clear delivery)
- **Speaker Boost:** true (enhanced clarity)

---

## Models Available

### eleven_multilingual_v2 (Current)
- **Best for:** High-quality educational content
- **Features:** Emotional awareness, natural pacing
- **Languages:** 32 languages
- **Speed:** ~1-2 seconds latency

### eleven_flash_v2_5 (Alternative)
- **Best for:** Real-time applications
- **Features:** Ultra-low latency (~75ms)
- **Languages:** 32 languages
- **Speed:** Fastest available
- **Use case:** If you need faster response times

---

## Pricing

### ElevenLabs Pricing Tiers (2025):
- **Free:** 10,000 characters/month
- **Starter:** $5/month - 30,000 characters
- **Creator:** $22/month - 100,000 characters
- **Pro:** $99/month - 500,000 characters
- **Enterprise:** Custom pricing

### Usage Estimation:
- Average lesson section: 200-500 characters
- Full lesson (10 sections): 2,000-5,000 characters
- 100 full lessons: ~250,000 characters/month

**Recommendation:** Start with Starter or Creator plan based on usage.

---

## Troubleshooting

### Issue: "Failed to generate speech"

**Solutions:**
1. Check API key is correct in environment variables
2. Verify ElevenLabs account has available character quota
3. Check text length doesn't exceed 5,000 characters
4. Ensure API key has not expired

### Issue: Voice sounds different than expected

**Solutions:**
1. Verify `ELEVENLABS_VOICE_ID` matches your chosen voice
2. Adjust `voice_settings` parameters
3. Try different British female voices from the library

### Issue: Slow response times

**Solutions:**
1. Consider switching to `eleven_flash_v2_5` model
2. Check network connection
3. Reduce text length per request
4. Implement caching for repeated content

---

## Frontend UX (Unchanged)

The user experience remains identical:

1. **Play/Pause Button:** Click to start/pause voice-over
2. **Sequential Playback:** Narrates lesson title, then sections in order
3. **Auto-scroll:** Content scrolls as narration progresses
4. **Notes Voice-over:** Speak icon on notes still works
5. **Visual Feedback:** Button color changes when active

---

## Files Modified

### Backend:
- ✅ `server.js` - Replaced AWS Polly with ElevenLabs client
- ✅ `package.json` - Updated dependencies
- ✅ `.env.example` - Updated environment variables

### Frontend:
- ✅ `src/pages/Privacy.jsx` - Updated service provider reference
- ✅ `vite.config.js` - Updated excluded packages
- ❌ `src/components/LearningHub.jsx` - NO CHANGES (API endpoint remains the same)

### Documentation:
- ✅ `.env.example` - Updated with ElevenLabs variables
- ✅ `ELEVENLABS_MIGRATION.md` - This file

---

## Rollback Instructions

If you need to revert to AWS Polly:

1. Reinstall AWS SDK:
```bash
npm install @aws-sdk/client-polly@^3.913.0
npm uninstall @elevenlabs/elevenlabs-js
```

2. Restore AWS environment variables in `.env`
3. Revert `server.js` import and client initialization
4. Revert the `/api/text-to-speech` endpoint implementation
5. Restart server

---

## Testing Checklist

- [ ] Voice-over plays on lesson page
- [ ] Sequential narration works (title → sections)
- [ ] Pause/resume functionality works
- [ ] Auto-scroll works as narration progresses
- [ ] Notes "read aloud" feature works
- [ ] British female voice sounds natural
- [ ] No errors in server console
- [ ] No errors in browser console
- [ ] Works on different browsers
- [ ] Works on mobile devices

---

## Support & Resources

### ElevenLabs Documentation:
- API Reference: https://elevenlabs.io/docs/api-reference/text-to-speech
- Voice Library: https://elevenlabs.io/voice-library
- Models: https://elevenlabs.io/docs/models

### Contact:
For issues or questions about this migration, contact the development team.

---

## Future Enhancements

Possible improvements now that we're using ElevenLabs:

1. **Voice Customization:** Allow users to choose their preferred voice
2. **Speed Control:** Add playback speed options (0.75x, 1x, 1.25x, 1.5x)
3. **Voice Cloning:** Create a custom "Ignite Education" branded voice
4. **Caching:** Cache generated audio files to reduce API calls and costs
5. **Emotional Tone:** Adjust voice settings based on content type
6. **Multilingual:** Support multiple languages for international students

---

**Migration Date:** 2025-01-22
**Version:** 1.0
**Status:** ✅ Complete
