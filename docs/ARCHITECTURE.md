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

## Shared Code (`/shared`)

The three apps are otherwise fully independent (separate `package.json`, lockfile and `node_modules` each), and historically the only sharing mechanism was copy-paste. `/shared` is the one exception.

**What lives there:** the lesson rendering layer, shared by the student player (`src/components/LearningHubV2/`) and the admin curriculum editor (`admin-app/`).

```
shared/lesson/
  blockTypes.js          Block type registry, default content shapes, createBlock()
  blockAdapter.js        editor block ⇄ `lessons` row ⇄ renderer section
  groupSections.js       groupSectionsByHeading() + selectGroupMedia()  ← lesson pagination
  inlineMarkup / textNormalization.js
  hooks/                 useTypewriter, useIsMobile
  renderers/             ContentRenderer, MediaPanel, Section{Heading,Paragraph,List,Image,YouTube,SVG}
  styles/lesson.css      keyframes referenced by inline styles in the renderers
```

**Why it exists.** The admin editor's preview was a hand-copied fork of the student view. It drifted: it still rendered the v1 black-box design and silently dropped `svg` and `scored_question` blocks. Sharing the renderers *and* the pagination logic makes that class of drift structurally impossible.

`groupSectionsByHeading` is the important one — it turns a flat block list into the screens a student steps through (a heading starts a new screen; each paragraph and quiz gets its own; media and lists attach to the current one). The admin canvas draws its screen-break dividers from the same function the player paginates with.

### Rules for `/shared`

- **It may import React and nothing else.** Vercel runs `npm install` only inside each app's root directory, so any other dependency would resolve locally and fail in CI.
- **Never add a `package.json` or lockfile.** That would create a phantom workspace root and risks re-triggering the Next.js root inference that `next-app/next.config.ts`'s `turbopack.root` exists to suppress.
- **React files must be `.jsx`.** `@vitejs/plugin-react` filters by extension, not location.

### How it is wired

| Concern | Main app | Admin app |
|---|---|---|
| Alias | `@shared` → `./shared` | `@shared` → `../shared` |
| Dev server FS access | not needed (inside root) | `server.fs.allow: ['..']` |
| Tailwind sources | `@source "../shared"` | `@source "../../shared"` |
| Keyframes | `@import "../shared/lesson/styles/lesson.css"` | `@import "../../shared/lesson/styles/lesson.css"` |

Two non-obvious failure modes this configuration prevents:

1. **Tailwind silently dropping classes.** Neither app has an `@config` directive, so `tailwind.config.js` is *not* loaded under Tailwind v4 — both rely on automatic source detection, which does not follow outside the project root. Without the `@source` lines, utilities used only in `/shared` (`font-light`, `leading-relaxed`, `aspect-video`, `text-blue-600`) compile to nothing and the admin canvas renders unstyled with no error. A black link in the editor means this broke.
2. **Duplicate React in admin dev.** `/shared` sits above `admin-app/`, so Node resolution walks up from it and finds the *main app's* `node_modules/react` — two React copies in one bundle, i.e. `Invalid hook call`. `admin-app/vite.config.js` pins `react`/`react-dom` to its own `node_modules` and sets `dedupe`. This bites local dev only; the Vercel build container has no root `node_modules`.

> **Deployment prerequisite:** the admin Vercel project has Root Directory `admin-app`, so **"Include source files outside of the Root Directory in the Build Step" must be enabled** in its dashboard settings. Without it, `../shared` is not uploaded and the build fails on `Failed to resolve import "@shared/…"`.

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
| **Narration (live)** | `/api/admin/generate-lesson-audio`, `/api/admin/generate-blog-audio`, `/api/admin/lesson-audio-status/:courseId/:module/:lesson` | None |
| **Text-to-Speech (unused)** | `/api/text-to-speech`, `/api/text-to-speech-timestamps`, `/api/lesson-audio/:courseId/:module/:lesson` | None |
| **Office Hours** | `/api/office-hours/start`, `/api/office-hours/join`, `/api/office-hours/queue/*` | Auth / Teacher+Admin |
| **Payments** | `/api/webhook/stripe`, `/api/create-checkout-session` | Stripe signature / Auth |
| **Certificates** | `/api/certificate/generate`, `/api/certificate/:id`, `/api/certificate/verify/:number` | Varies |
| **Email** | `/api/send-email`, `/api/email-preferences/*`, `/api/unsubscribe` | Varies |
| **Reddit** | `/api/reddit-posts`, `/api/reddit-comments`, `/api/reddit-cache/refresh` | None |
| **LinkedIn** | `/api/linkedin/posts`, `/api/linkedin/refresh` | None |
| **Admin Content** | `/api/admin/generate-lesson-questions`, `/api/admin/generate-svg` | Teacher+Admin |
| **User Management** | `/api/users/:userId` (DELETE), `/api/delete-account` | Admin / Auth |
| **Notifications** | `/api/notifications/broadcast`, `/api/notifications/admin`, `/api/notifications/:id` (DELETE) | Admin |
| **Referrals** | `/api/referrals/claim`, `/api/referrals/me`, `/api/admin/referrals` | Auth / Admin |

#### Auth middleware levels

1. **`verifyAuth`** — Any authenticated user (JWT from Supabase)
2. **`verifyTeacherOrAdmin`** — Teacher or admin role (checked against `users.role`)
3. **`verifyAdmin`** — Admin role only

#### Narration

Narration is **pre-generated**, never synthesised at play time. Both players read
`lesson_audio` straight from Supabase (`useNarration.js`), so changing the voice
needs no frontend deploy — but students keep hearing the old voice until each
lesson's audio is rebuilt.

| Concern | Where |
|---------|-------|
| The voice | `NARRATION_VOICE_ID` in `server.js` — override with `ELEVENLABS_NARRATION_VOICE_ID` (set in the Render dashboard; `render.yaml` does not declare it) |
| TTS settings | `NARRATION_TTS` — model and voice settings, shared by lessons and blog posts |
| Staleness | `narrationHash(text, voiceId)` covers text **and** voice **and** settings, so a voice change correctly marks existing audio out of date |
| Cache busting | `narrationUrl()` appends `?v=<hash>`; the storage object is overwritten in place and served with `max-age=3600`, so a stable URL would pair a cached old MP3 with new word timings |
| Rollout tracking | `lesson_audio.voice_id` records what each lesson holds — the backfill worklist is exact and resumable |
| Bulk rebuild | `node scripts/renarrate-lessons.mjs --dry-run` (costs are per character; use `--limit` to stay inside a monthly quota) |

`ELEVENLABS_VOICE_ID` is legacy and only reaches the two unused
`/api/text-to-speech*` endpoints. Voice Library voices need a paid ElevenLabs
plan to use via the API; the premade voices do not.

#### Scheduled jobs (node-cron)

| Schedule | Task |
|----------|------|
| Daily 3 AM ET | LinkedIn posts refresh (Bright Data) |
| Daily 10 AM ET | Inactivity reminder emails (14+ days inactive) |
| Daily midnight UTC | Community stats + achievement percentile refresh (Supabase RPCs) |
| Weekly Sunday 4 AM UTC | User memory aggregation via Claude |
| Daily 2 AM UTC | Notification pruning (`prune_notifications` RPC) |
| Daily 6 AM UTC (Render cron) | Reddit cache refresh |

---

## Routing & Deployment

All three apps deploy from the **`main`** branch.

### How requests flow

The root `vercel.json` on `ignite.education` controls routing:

1. **`www.ignite.education`** → permanent redirect to `ignite.education`
2. **`/` (root)** → temporary redirect to `/welcome`
3. **Public/SEO paths** (`/welcome`, `/courses`, `/blog`, `/blog/*`, `/prompts*`, `/sign-in`, `/privacy`, `/terms`, `/certificate/*`, `/auth/callback`, `/_next/*`, `*/opengraph-image`, etc.) → rewritten to `next.ignite.education`
4. **`/admin/*`** → rewritten to `admin.ignite.education`
5. **`/sitemap.xml`** → rewritten to `next.ignite.education` (generated by `next-app/src/app/sitemap.ts`, ISR 1h)
6. **Authenticated SPA paths** (`/progress`, `/learning`, `/office-hours/*`) and catch-all `(.*)` → served by Vite SPA (`index.html`)

### Static images on public pages

Reference images by **absolute Supabase storage URL**, not by a root-relative
path into `next-app/public/`.

A Next.js page rendered at `ignite.education/...` arrived via rewrite, but the
browser then resolves relative asset paths against the **apex** origin, where
`next-app/public/` does not exist. Such requests hit the catch-all and return
the Vite `index.html` with a 404. Two traps make this easy to miss:

- Assets work when tested directly on `next.ignite.education` and only break on
  the apex domain.
- `next/image` rewrites the src to `/_next/image?url=...`. Vercel's image
  optimizer is a **built-in endpoint that the `/_next/:path*` rewrite does not
  capture**, so the apex project's own optimizer serves it, resolves the url
  against the Vite `public/`, and returns `400 INVALID_IMAGE_OPTIMIZE_REQUEST`.

Absolute Supabase URLs sidestep both. The bucket host is in `remotePatterns` for
both the apex (`vercel.json`) and next-app (`next.config.ts`), so images stay
optimized. SVGs still need `unoptimized` — the optimizer rejects SVG unless
`dangerouslyAllowSVG` is set. An `/images/:path*` rewrite exists as a backstop
so `next-app/public` resolves on the apex, but Supabase remains the convention.

**Corollary — the default OG image lives in the ROOT `public/`.** `og-image.png`
is referenced by both apps, so it sits at repo-root `public/og-image.png` and is
served from the apex project's own filesystem (checked before rewrites). Putting
it in `next-app/public/` would 404 on the apex for exactly the reason above —
and because the catch-all returns `index.html` at **HTTP 200**, social and AI
crawlers would receive an HTML document where a PNG was declared, with no error
to alert anyone. `npm run seo:validate` now fetches every `og:image` and asserts
it resolves to `image/*`.

### SEO traps worth knowing

Three non-obvious failure modes, all of which shipped to production undetected:

1. **`loading.tsx` turns `notFound()` into a soft 404.** A `loading.tsx` wraps
   its route in `<Suspense>`, so Next flushes the shell — with 200 already
   committed — before the page's data fetch resolves. `notFound()` thrown inside
   that boundary can only swap streamed content, not the status line. Do the
   existence check in a sibling `layout.tsx`, which renders outside the boundary.
   See `next-app/src/app/courses/[courseSlug]/layout.tsx`.

2. **Never put `X-Robots-Tag` in a `headers` rule on the Next project.** Vercel
   external rewrites forward upstream response headers to the client, so a
   `noindex` header set on `next.ignite.education` propagates onto **apex**
   responses and deindexes production. A middleware host-check can't help
   either — Vercel rewrites `Host` to the destination, so the Next app sees
   `next.ignite.education` on both direct and proxied requests. Containment of
   the duplicate origin is done with `next-app/src/app/robots.ts`, because
   robots.txt is scoped per-host and has no header to leak.

3. **Filesystem beats rewrites.** Vercel checks the apex project's build output
   before applying `rewrites`, which is why a committed `public/sitemap.xml`
   silently shadowed the `/sitemap.xml` rewrite for months. The sitemap now
   lives only in `next-app/src/app/sitemap.ts`; do not reintroduce a static one.

Also note: Next.js **replaces** rather than merges the `openGraph` object across
the layout/page boundary. Defaults declared in `app/layout.tsx` do NOT reach any
page that declares its own `openGraph` — spread `OG_DEFAULTS` and call
`ogImages()` from `@/lib/siteConfig` instead of relying on inheritance.

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
- `users` — profiles, roles, metadata. **Not** subscription status: Stripe state lives in
  `auth.users.raw_user_meta_data` and grants live in `insider_grants` (see below)
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
- `notifications` — Progress Hub notification feed (see below)
- `referrals`, `insider_grants` — profile-page referrals and the free weeks they earn (see below)

Supabase RPCs:
- `refresh_community_stats()` — nightly community metrics
- `refresh_achievement_percentile_stats()` — nightly percentile calculations
- `prune_notifications()` — nightly deletion of aged-out/expired notifications

### Notifications

Backs the bell in the Progress Hub icon row. Migrations:
`migrations/create_notifications_table.sql` then `create_notification_triggers.sql`
(hand-applied in the Supabase SQL editor).

- **One row per event, no fan-out.** Rows are either targeted (`audience = 'user'`,
  `user_id` set) or broadcast (`audience = 'all'`, `user_id` null). A published release
  note is one row, not one per learner.
- **`audience` is deliberately redundant** with `user_id IS NULL`: Realtime
  `postgres_changes` filters support only `eq/neq/lt/lte/gt/gte/in`, so a subscriber
  cannot filter on `user_id is null`. A `CHECK` keeps the two in sync.
- **Read state is not in the database.** The client keeps a last-seen timestamp in
  `localStorage` (`ignite:notifications:lastSeen:<userId>`) and derives the unread count,
  which is what lets one broadcast row serve every user.
- **Rows are written by `SECURITY DEFINER` triggers**, not app code — the source tables
  are written by three different clients with three different keys. Trigger types:
  `certificate`, `release_note`, `blog_post`, `office_hours`. The fifth type,
  `announcement`, is published by hand from the admin portal.
- **Admin portal**: `admin.ignite.education/notifications` composes and broadcasts
  announcements and lists/deletes every notification. Because the table has no
  INSERT/DELETE policy, that page goes through the Express endpoints above rather
  than its own Supabase client — unlike every other admin page.
- **RLS:** SELECT only (`audience = 'all' OR user_id = auth.uid()`). No INSERT/UPDATE/DELETE
  policy exists; the service role and the triggers are the only writers.
- This is the **first RLS-enabled table in the `supabase_realtime` publication**, so the
  websocket must carry the user JWT for the SELECT policy to be evaluated per subscriber
  — `useNotifications` calls `supabase.realtime.setAuth()` explicitly before subscribing.

### Referrals and Insider entitlement

Creating an account from a public profile (`ignite.education/{username}`) gives both sides a
free week of Ignite Insider. Migration: `migrations/add_referrals.sql` (hand-applied).

**Insider access has two independent sources.** Never read `is_ad_free` directly for gating —
use `resolveInsider()` in `server.js` or `isInsider` from `AuthContext`:

| Source | Where it lives | Set by |
|---|---|---|
| Stripe subscription | `auth.users.raw_user_meta_data.is_ad_free` | the Stripe webhooks |
| Referral week / comp | a `public.insider_grants` row with `expires_at > NOW()` | `/api/referrals/claim`, the qualification trigger |

- **Grants are deliberately not in `user_metadata`.** Any signed-in user can write their own
  metadata (`supabase.auth.updateUser({ data })`), so a grant kept there would be forgeable
  from the console — and the `checkout.session.completed` handler rewrites that object.
- **Expiry is evaluated at read time, not by a cron.** A grant self-expires, which also means
  a stale JWT cannot keep a lapsed week alive. `AuthContext` re-queries `insider_grants` in the
  same effect that fetches `users.role`, so a week appears and lapses without re-authenticating.
- **Grant-only Insiders have no Stripe customer**, so anything billing-related must branch on
  `insiderSource`. `SettingsModal` shows "Keep Ignite Insider" instead of "Manage" — the billing
  portal endpoint 400s without a `stripe_customer_id`.
- **There is no self-serve free trial.** The 14-day Stripe trial was retired; checkout charges
  immediately and a referral is the only free path in. The `has_used_trial` metadata keys are
  historic and no longer read.
- **The referrer's week is earned, not given**: `qualify_referral_on_lesson()` fires
  `AFTER INSERT ON lesson_completions` and grants it only once the referee completes a lesson,
  capped at 10 credited referrals per rolling 30 days. Grants **stack** onto the end of any live
  grant rather than overlapping, so two invites really are two weeks.
- **Every grant notifies its recipient** via `notify_insider_granted()`, an `AFTER INSERT` trigger
  on `insider_grants` rather than code inside the qualification path — so a referrer's earned
  week, a new signup's week and a manual comp all behave identically, and a hand-inserted grant
  is a faithful test. The body names the referee only for `source = 'referral_referrer'`.
  `source_id` is the grant id, so one grant is one notification; `expires_at` retires the row
  when the week does.
- **Attribution survives three journeys**: `?ref=` on the OAuth callback URL, an inline claim for
  Google One Tap (which never navigates), and a 30-day `localStorage` crumb written by
  `ProfileHero` for anyone who signs up later from `/sign-in` or a course page. All three hit the
  same endpoint; `UNIQUE(referee_id)` makes a double-claim a no-op. The crumb is `localStorage`
  rather than `sessionStorage` because profile pages open course cards in a new tab.
- **RLS:** SELECT only, own rows. Service role and the SECURITY DEFINER trigger are the only writers.

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
- Root-relative images in `next-app/public/` 404 on `ignite.education` (fine on `next.ignite.education`) — use Supabase storage URLs; see [Static images on public pages](#static-images-on-public-pages)
- `loading.tsx` silently downgrades `notFound()` to a soft 404 — do existence checks in a sibling `layout.tsx`; see [SEO traps worth knowing](#seo-traps-worth-knowing)
- A `headers` rule setting `X-Robots-Tag` on the Next project leaks through the apex rewrite and deindexes production — use `app/robots.ts` instead
- `openGraph` metadata is replaced, not merged, across layout→page — spread `OG_DEFAULTS` from `@/lib/siteConfig` per page
- Run `npm run seo:validate` (in `next-app/`) after any deploy that touches metadata, routing or the sitemap
- Insider entitlement has **two** sources — `user_metadata.is_ad_free` (Stripe) and `public.insider_grants` (referral/comp). Gate via `resolveInsider()` server-side or `isInsider` from `AuthContext`; never read `is_ad_free` directly. Anything billing-related must branch on `insiderSource` — a granted user has no Stripe customer. See [Referrals and Insider entitlement](#referrals-and-insider-entitlement)
- `user_metadata` is writable by the user it belongs to (`AuthContext.updateProfile` → `supabase.auth.updateUser`), so it must not hold anything that grants access. `is_ad_free` predates this and remains forgeable
