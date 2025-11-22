# Quick Setup Guide: ElevenLabs Voice-Over

## 🚀 Quick Start (5 Minutes)

### 1. Get Your API Key
1. Visit [elevenlabs.io](https://elevenlabs.io/)
2. Sign up or log in
3. Go to your Profile → API Keys
4. Copy your API key

### 2. Update Environment Variables

**Local Development:**
Create or update `.env` file:
```bash
ELEVENLABS_API_KEY=sk_your_api_key_here
```

**Production (Render):**
1. Go to Render dashboard
2. Select your backend service
3. Click "Environment" tab
4. Add: `ELEVENLABS_API_KEY` = `your_api_key`
5. Save & redeploy

### 3. Install & Start
```bash
npm install
npm run server  # Start backend
```

### 4. Test
Navigate to any lesson and click the voice-over button (speaker icon).

---

## 📊 Current Configuration

### Voice Settings
- **Voice:** Alice (British female) - Natural, clear, expressive
- **Model:** `eleven_multilingual_v2` - High quality with emotional range
- **Format:** MP3, 44.1kHz, 128kbps
- **Character Limit:** 5,000 per request

### Voice Parameters
```javascript
{
  stability: 0.5,           // Balanced expressiveness
  similarity_boost: 0.75,   // Maintain voice characteristics
  style: 0.0,              // Neutral delivery
  use_speaker_boost: true  // Enhanced clarity
}
```

---

## 🎙️ Change Voice (Optional)

### Available British Female Voices:
- **Alice** (Default): `Xb7hH8MSUJpSbSDYk0k2` ✅
- **Anna**: Trustworthy, lower register
- **Brianna**: Yorkshire accent, soothing

### To Change Voice:
Add to your `.env`:
```bash
ELEVENLABS_VOICE_ID=Xb7hH8MSUJpSbSDYk0k2  # Replace with your choice
```

Find more voices at: [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)

---

## 💰 Pricing

### Free Tier:
- 10,000 characters/month
- Good for testing

### Recommended Plan:
- **Starter:** $5/month (30,000 chars)
- **Creator:** $22/month (100,000 chars)

### Usage Estimate:
- Average lesson: ~2,000-5,000 characters
- 100 lessons: ~250,000 characters

---

## ⚙️ Customization Options

### Adjust Voice Settings
Edit `server.js` line ~837:

```javascript
voice_settings: {
  stability: 0.5,        // 0.0-1.0 (Lower = more expressive)
  similarity_boost: 0.75, // 0.0-1.0 (Voice matching)
  style: 0.0,           // 0.0-1.0 (Style exaggeration)
  use_speaker_boost: true
}
```

### Switch to Faster Model
For real-time applications, change model in `server.js` line ~835:

```javascript
model_id: 'eleven_flash_v2_5',  // Ultra-low latency (~75ms)
```

---

## 🔧 Troubleshooting

### Error: "Failed to generate speech"
✅ Check API key is correct
✅ Verify you have character quota remaining
✅ Check text length < 5,000 characters

### Voice sounds wrong
✅ Verify `ELEVENLABS_VOICE_ID` is correct
✅ Try adjusting `voice_settings` parameters
✅ Test different voices from the library

### Slow response
✅ Switch to `eleven_flash_v2_5` model
✅ Check network connection
✅ Consider implementing caching

---

## 📚 Resources

- **Full Migration Guide:** See `ELEVENLABS_MIGRATION.md`
- **API Docs:** [elevenlabs.io/docs](https://elevenlabs.io/docs)
- **Voice Library:** [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)

---

## ✅ What Changed from AWS Polly?

| Aspect | Change |
|--------|--------|
| **Voice Quality** | More natural, human-like |
| **Character Limit** | 3,000 → 5,000 |
| **Setup** | Simpler (no AWS credentials) |
| **API** | Direct REST API |
| **Frontend** | No changes needed ✅ |
| **User Experience** | Exactly the same ✅ |

---

**Need Help?** Check `ELEVENLABS_MIGRATION.md` for detailed documentation.
