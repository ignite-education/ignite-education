# Ignite Learning Platform

A modern learning platform built with React, Vite, Supabase, and Reddit integration.

## Features

- Product Management course with modular lessons
- Community forum with local and Reddit posts
- Direct Reddit posting with OAuth authentication
- Progress tracking
- Responsive design with Tailwind CSS

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

### 3. Configure Supabase

Get your Supabase credentials from [https://supabase.com](https://supabase.com):

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Configure Reddit OAuth

To enable posting to Reddit, you need to create a Reddit app:

1. Go to [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click "Create App" or "Create Another App"
3. Fill in the details:
   - **name**: Ignite Learning Platform (or your preferred name)
   - **App type**: Select "web app"
   - **description**: Optional
   - **about url**: Optional
   - **redirect uri**: `http://localhost:5173/auth/reddit/callback` (for development)
4. Click "Create app"
5. Copy your credentials:
   - **Client ID**: The string under "web app" (below your app name)
   - **Client Secret**: Click "edit" to reveal the secret

Add these to your `.env` file:

```env
VITE_REDDIT_CLIENT_ID=your_reddit_client_id_here
VITE_REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
VITE_REDDIT_REDIRECT_URI=http://localhost:5173/auth/reddit/callback
VITE_REDDIT_USER_AGENT=Ignite-Learning-Platform/1.0
```

**Important Notes:**
- Keep your `VITE_REDDIT_CLIENT_SECRET` secure and never commit it to version control
- For production, update the redirect URI to your production domain (e.g., `https://yourdomain.com/auth/reddit/callback`)
- Update the redirect URI in your Reddit app settings when deploying to production

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173)

## Reddit Integration

### How It Works

1. Users can create posts in the community forum
2. When creating a post, they can check "Also post to r/ProductManagement on Reddit"
3. If not authenticated with Reddit:
   - User is redirected to Reddit OAuth authorization
   - After approval, they return to the app
   - Post is automatically submitted to both the local forum and Reddit
4. If already authenticated:
   - Post is submitted directly to both platforms

### Authentication Status

The post creation modal shows:
- Green checkmark with username when connected to Reddit
- Yellow note when Reddit posting is selected but not authenticated

### Token Management

- Access tokens are stored in localStorage
- Tokens automatically refresh when expired
- Refresh tokens allow persistent authentication
- Users can disconnect by clearing browser data

## Project Structure

```
src/
├── components/
│   ├── ProgressHub.jsx      # Main dashboard component
│   └── RedditCallback.jsx   # OAuth callback handler
├── lib/
│   ├── api.js               # Supabase API functions
│   ├── reddit.js            # Reddit OAuth & API
│   └── supabase.js          # Supabase client
└── App.jsx                  # Router configuration
```

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- React Router DOM
- Supabase (PostgreSQL database)
- Reddit OAuth 2.0 API
- Lucide React (icons)
