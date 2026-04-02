# Ignite Education - Architecture Overview

> **Last updated:** 2026-03-24
>
> This document is the single source of truth for how the Ignite Education platform is structured.
> It should be updated whenever architectural changes are made (new apps, services, integrations, routes, or deployment changes).

---

## Platform Overview

Ignite Education is a learning platform built as a **multi-app architecture** with three frontend applications, a shared Express backend, and Supabase as the database/auth layer.

```
                        ignite.education (Vercel)
                              │
                ┌─────────────┼─────────────────┐
                │             │                  │
          Public pages   Authenticated      /admin/*
          (rewritten)      SPA pages        (rewritten)
                │             │                  │
                ▼             ▼                  ▼
         Next.js App     Vite SPA App      Admin App
     next.ignite.education  (root)    admin.ignite.education
                │             │                  │
                └─────────────┼──────────────────┘
                              │
                              ▼
                      Express API Server
              ignite-education-api.onrender.com
                              │
                              ▼
                     Supabase PostgreSQL
```

---

## Applications

### 1. Vite SPA (Main App)

| | |
|---|---|
| **Directory** | `/` (root `src/`) |
| **Framework** | React 19 + React Router 7 + Vite 6 |
| **Styling** | Tailwind CSS 4 (PostCSS) |
| **Domain** | `ignite.education` |
| **Deployment** | Vercel (root directory) |
| **Purpose** | Authenticated user experience — progress tracking, learning, video office hours |

**Key routes:**

| Path | Component | Auth |
|------|-----------|------|
| `/progress` | ProgressHubV2 | Protected |
| `/learning` | LearningHubV2 | Protected |
| `/office-hours/:sessionId` | VideoChat | Protected |
| `/auth/reddit/callback` | RedditCallback | Public |
| `/auth/linkedin/callback` | LinkedInCallback | Public |

**Build optimisation:** Rollup manual chunks split vendors (React, Supabase, Stripe, Anthropic, Lottie, Calendly, Lucide) for optimal caching.

**Config files:** [vite.config.js](../vite.config.js), [vercel.json](../vercel.json)

---

### 2. Next.js App (Public/SEO Pages)

| | |
|---|---|
| **Directory** | `next-app/` |
| **Framework** | Next.js 16.1.6 + React 19 + TypeScript |
| **Styling** | Tailwind CSS 4 (PostCSS), Geist font via `next/font/google` |
| **Domain** | `next.ignite.education` |
| **Deployment** | Vercel (root directory: `next-app`) |
| **Purpose** | Public-facing, SEO-optimised pages — landing, courses, blog, auth entry points |

**Key routes:**

| Path | Strategy | Revalidate | Notes |
|------|----------|------------|-------|
| `/welcome` | ISR | 3600s | Landing page with hero, courses, testimonials, FAQ |
| `/courses` | ISR | 3600s | Course catalog with ItemList + BreadcrumbList structured data |
| `/courses/[courseSlug]` | ISR | 3600s | Course detail with Course schema |
| `/blog/[slug]` | SSR | — | Blog posts with audio narration, BlogPosting schema |
| `/certificate/[id]` | ISR | 3600s | Certificate sharing with dynamic OG image generation |
| `/prompts` | SSR | — | AI prompt toolkit (3-level dynamic routing) |
| `/sign-in` | SSR | — | Auth entry with OAuth + email/password |
| `/reset-password` | SSR | — | Password recovery |
| `/privacy`, `/terms` | SSR | — | Static legal pages |
| `/release-notes` | ISR | 86400s | Release history |
| `/auth/callback` | API route | — | OAuth PKCE code exchange + user creation |

**Middleware:** `src/middleware.ts` refreshes Supabase sessions on all non-static routes.

**Config files:** [next.config.ts](../next-app/next.config.ts)

---

### 3. Admin App

| | |
|---|---|
| **Directory** | `admin-app/` |
| **Framework** | React 19 + React Router 7 + Vite 6 |
| **Styling** | Tailwind CSS 4 (dark theme) |
| **Domain** | `admin.ignite.education` |
| **Deployment** | Vercel (root directory: `admin-app`) |
| **Purpose** | Internal tools for content management, analytics, and office hours |

**Key routes:**

| Path | Access | Purpose |
|------|--------|---------|
| `/curriculum` | Teacher + Admin | Curriculum upload & management |
| `/office-hours` | Teacher + Admin | Live video session coordination |
| `/analytics` | Admin only | Analytics dashboard |
| `/courses` | Admin only | Course management |
| `/blog` | Admin only | Blog post CRUD |
| `/prompts` | Admin only | Prompt toolkit management |
| `/release-notes` | Admin only | Release notes management |
| `/resources` | Admin only | Resource management |

**Auth flow:** Unauthenticated users redirect to `ignite.education/sign-in?redirect=admin`. Students are redirected away. Teachers see only Curriculum and Office Hours.

**Config files:** [vite.config.js](../admin-app/vite.config.js), [vercel.json](../admin-app/vercel.json)

---

### 4. Express API Server

| | |
|---|---|
| **File** | `server.js` (~7,400 lines) |
| **Framework** | Express 5 |
| **Domain** | `ignite-education-api.onrender.com` |
| **Deployment** | Render (Oregon, free plan) |
| **Health check** | `GET /api/health` |

#### Endpoint groups

| Group | Example endpoints | Auth |
|-------|-------------------|------|
| **AI Chat & Tutoring** | `/api/chat`, `/api/score-answer`, `/api/generate-user-question` | None (API key server-side) |
| **Knowledge Checks** | `/api/knowledge-check/question`, `/api/knowledge-check/evaluate` | None |
| **Flashcards** | `/api/generate-flashcards`, `/api/lesson-scores/global/:courseId` | None |
| **Text-to-Speech** | `/api/text-to-speech`, `/api/text-to-speech-timestamps`, `/api/lesson-audio/:courseId/:module/:lesson` | None / Admin |
| **Office Hours** | `/api/office-hours/start`, `/api/office-hours/join`, `/api/office-hours/queue/*` | Auth / Teacher+Admin |
| **Payments** | `/api/webhook/stripe`, `/api/create-checkout-session` | Stripe signature / Auth |
| **Certificates** | `/api/certificate/generate`, `/api/certificate/:id`, `/api/certificate/verify/:number` | Varies |
| **Email** | `/api/send-email`, `/api/email-preferences/*`, `/api/unsubscribe` | Varies |
| **Reddit** | `/api/reddit-posts`, `/api/reddit-comments`, `/api/reddit-cache/refresh` | None |
| **LinkedIn** | `/api/linkedin/posts`, `/api/linkedin/refresh` | None |
| **Admin Content** | `/api/admin/generate-lesson-questions`, `/api/admin/generate-svg` | Teacher+Admin |
| **User Management** | `/api/users/:userId` (DELETE), `/api/delete-account` | Admin / Auth |
| **SEO** | `GET /sitemap.xml` | None |

#### Auth middleware levels

1. **`verifyAuth`** — Any authenticated user (JWT from Supabase)
2. **`verifyTeacherOrAdmin`** — Teacher or admin role (checked against `users.role`)
3. **`verifyAdmin`** — Admin role only

#### Scheduled jobs (node-cron)

| Schedule | Task |
|----------|------|
| Daily 3 AM ET | LinkedIn posts refresh (Bright Data) |
| Daily 10 AM ET | Inactivity reminder emails (14+ days inactive) |
| Daily midnight UTC | Community stats + achievement percentile refresh (Supabase RPCs) |
| Weekly Sunday 4 AM UTC | User memory aggregation via Claude |
| Daily 6 AM UTC (Render cron) | Reddit cache refresh |

---

## Routing & Deployment

All three apps deploy from the **`main`** branch.

### How requests flow

The root `vercel.json` on `ignite.education` controls routing:

1. **`www.ignite.education`** → permanent redirect to `ignite.education`
2. **`/` (root)** → temporary redirect to `/welcome`
3. **Public/SEO paths** (`/welcome`, `/courses`, `/blog/*`, `/sign-in`, `/privacy`, `/terms`, `/certificate/*`, `/auth/callback`, `/_next/*`, etc.) → rewritten to `next.ignite.education`
4. **`/admin/*`** → rewritten to `admin.ignite.education`
5. **`/sitemap.xml`** → rewritten to Express API
6. **Authenticated SPA paths** (`/progress`, `/learning`, `/office-hours/*`) and catch-all `(.*)` → served by Vite SPA (`index.html`)

---

## Authentication

All three apps use **Supabase Auth** with `@supabase/ssr` for cookie-based sessions.

- **Cookie domain:** `.ignite.education` — shared across all subdomains so a single sign-in works everywhere
- **Providers:** Google (One Tap + OAuth), LinkedIn, email/password
- **OAuth flow:** PKCE via `/auth/callback` route handler in Next.js
- **Roles:** `student`, `teacher`, `admin` — stored in `users.role` column
- **Session refresh:** Next.js middleware refreshes tokens on every request; Vite apps refresh via `onAuthStateChange`

After OAuth, the callback handler routes users by role:
- Admin/Teacher → `admin.ignite.education`
- Enrolled student → `/progress`
- New user → `/courses`

---

## Third-Party Integrations

| Service | Purpose | Used In |
|---------|---------|---------|
| **Supabase** | PostgreSQL database + Auth + Storage | All apps + API |
| **Vercel** | Hosting & CDN for all 3 frontend apps | Vite SPA, Next.js, Admin |
| **Render** | Hosting for Express API + cron jobs | Backend |
| **Anthropic Claude** | AI tutoring, question generation, flashcards, content generation (Haiku 4.5) | API |
| **Stripe** | Payments & subscriptions | API + Vite SPA |
| **ElevenLabs** | Text-to-speech with timestamps (multilingual v2) | API |
| **Daily.co** | Live video for office hours | API + Vite SPA + Admin |
| **Resend** | Transactional & marketing email | API + Next.js |
| **Bright Data** | LinkedIn company post scraping | API |
| **Reddit API** | Community content (ProductManagement, cybersecurity subreddits) | API |
| **Google Identity Services** | One Tap sign-in | Vite SPA + Next.js |

---

## Database

**Provider:** Supabase PostgreSQL

Key tables (non-exhaustive):
- `users` — profiles, roles, metadata, subscription status
- `courses`, `modules`, `lessons` — curriculum structure
- `user_progress` — lesson completion tracking
- `certificates` — course completion certificates
- `blog_posts` — blog content
- `lesson_audio` — cached TTS audio with timestamps
- `reddit_cache` — cached Reddit posts/comments
- `sign_in_history` — login audit log
- `office_hours_sessions`, `office_hours_queue` — live session state
- `email_preferences` — per-user email subscription settings
- `release_notes` — product changelog

Supabase RPCs:
- `refresh_community_stats()` — nightly community metrics
- `refresh_achievement_percentile_stats()` — nightly percentile calculations

---

## Caching Strategy

| Layer | What | TTL |
|-------|------|-----|
| **NodeCache (in-memory)** | LinkedIn posts | 24 hours |
| **NodeCache** | Reddit flairs | 24 hours |
| **NodeCache** | Global lesson scores | 1 hour |
| **Database** | Reddit posts/comments | 30 min (refresh via cron) |
| **Database** | TTS audio + timestamps | Permanent (until deleted) |
| **Vercel ISR** | Next.js public pages | 1 hour (courses, welcome) to 24 hours (release notes) |

---

## Local Development

Three dev servers run concurrently:

| App | Command | Port | Notes |
|-----|---------|------|-------|
| Vite SPA | `npm run dev` | 5174 | Proxies `/auth/callback` to Next.js |
| Next.js | `cd next-app && npm run dev` | 3000 | |
| Express API | `node server.js` | 3001 | Requires env vars |

OAuth works locally via Vite's dev server proxy and Supabase redirect URL allowlist.

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| [vercel.json](../vercel.json) | Root routing rules (rewrites, redirects, headers) |
| [vite.config.js](../vite.config.js) | Vite SPA build config + dev proxy |
| [next-app/next.config.ts](../next-app/next.config.ts) | Next.js config (turbopack root, image domains) |
| [admin-app/vite.config.js](../admin-app/vite.config.js) | Admin app build config |
| [admin-app/vercel.json](../admin-app/vercel.json) | Admin SPA rewrite + security headers |
| [render.yaml](../render.yaml) | Express API deployment on Render |
| [server.js](../server.js) | Express API server (~7,400 lines) |

---

## Known Quirks

- Root-level `next@16.0.10` (from `@react-email/preview-server`) conflicts with `next-app`'s `next@16.1.6` — resolved with `turbopack.root` in `next.config.ts`
- `next/font/google` loads Geist with hashed class names — use `var(--font-geist-sans)` not `'Geist'` in inline styles
- `vercel.json` rewrites must use flat array format (not `beforeFiles`/`afterFiles` — that's Next.js framework-only)
- Supabase cookie domain change requires users to sign out/in to regenerate cookies
