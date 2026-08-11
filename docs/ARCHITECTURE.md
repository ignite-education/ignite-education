# Ignite Education - Architecture Overview

> **Last updated:** 2026-08-08
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
  renderers/             ContentRenderer, MediaPanel, Section{Heading,Paragraph,List,Image,YouTube,SVG,BoxMatch}
  styles/lesson.css      keyframes referenced by inline styles in the renderers
```

**Why it exists.** The admin editor's preview was a hand-copied fork of the student view. It drifted: it still rendered the v1 black-box design and silently dropped `svg` and `scored_question` blocks. Sharing the renderers *and* the pagination logic makes that class of drift structurally impossible.

`groupSectionsByHeading` is the important one — it turns a flat block list into the screens a student steps through (a heading starts a new screen; each paragraph and quiz gets its own; media, lists and matching exercises attach to the current one). The admin canvas draws its screen-break dividers from the same function the player paginates with.

### Progression gates

Two block types stop a student advancing, and they gate by opposite mechanisms:

| | `scored_question` (Quiz) | `box_match` (Matching) |
|---|---|---|
| Screen | its own, full-screen takeover | inline, under the paragraph it follows |
| Renderer | none — `ContentRenderer` returns `null` and `LearningHubV2` owns the flow | `renderers/SectionBoxMatch.jsx` |
| How it gates | player intercepts in `handleSectionComplete` and returns `prev` | renderer withholds `onComplete()` until solved — no player branch needed |
| Released by | passing 5/10 on a Claude-graded answer | matching every pair |
| Admin authoring | `LessonCanvas/QuizCard.jsx` (read-only) | `LessonCanvas/MatchCard.jsx` (editable) |

Both must appear in `LearningHubV2`'s `groupHasGate`. That flag flows into `useNarration`, where `groupAudioMode = audioReady && !groupHasGate` — in audio mode every section on a screen renders at once and completion comes from `revealComplete` rather than `completedSections`, which walks straight past either gate. The cost is that a screen holding a gate is never narrated.

`box_match` is a positional reorder, not a drop-onto-target: the names are static down the left, and the student drags the description boxes on the right until each sits in the row opposite its name. It behaves as a sortable list — lifting a box and dropping it three rows down shifts the rows between it up by one, rather than swapping the two endpoints. A row that comes out correct locks and can no longer be moved or targeted, so "is this row correct" is derived from the arrangement rather than tracked separately, and locked rows are pinned out of the shuffle so a solved pairing is never disturbed. Because the pairing has to read *across* a row, the layout is a list of rows — a name cell beside a description cell — not two independently stacked columns, which would drift apart as soon as one description wrapped to a different number of lines.

`SectionBoxMatch` hand-rolls its drag on pointer events. No DnD library is installed in any app and `/shared` cannot take one (see the rules below); one pointer implementation also covers mouse, touch and pen, where HTML5 drag events would have needed a separate touch path. Tapping one description then another moves the first into the second's row, which is what makes it keyboard- and screen-reader-operable.

The reorder happens **live**: as the box passes another row, the list rearranges immediately and the rows it has passed shuffle out of its way, leaving a gap at the insertion point. Releasing only settles and scores the arrangement that is already on screen.

Two traps worth knowing if you touch the drag:

- The box being dragged is translated to follow the pointer, and `getBoundingClientRect` reports that translated position. It therefore sits under the cursor for the whole gesture, and the hit test must exclude it explicitly — otherwise every drop resolves to the dragged row itself and silently no-ops. Excluding it is also what stops the live reorder thrashing: once the box occupies the target slot the pointer is over the excluded row, so no further reorder fires until it genuinely crosses into another.
- A live reorder moves the box into a different row, so its *untransformed* position jumps by the height of everything that shuffled past it. A `useLayoutEffect` measures that delta and shifts the drag origin by exactly the same amount, which leaves the visual position unchanged and keeps the box glued to the pointer. Without it the box leaps away the instant the list rearranges. Row heights vary with how far each description wraps, so the delta has to be measured rather than assumed.

One consequence: a live reorder can carry the dragged box through its own correct row mid-gesture. It must stay enabled while that is true — disabling the element under the pointer drops the pointer capture and strands the drag.

Solved state lives in `LearningHubV2` (`matchSolvedIds`, keyed by section id), not in the exercise. The content container is keyed on `currentGroupIndex`, so Back unmounts the exercise — component-local state would silently re-lock a gate the student had already cleared. It resets per lesson, deliberately not per screen.

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
| `/jobs` | ISR | 300s | Job board — client-side filtering by profession + seniority |
| `/jobs/[professionSlug]` | ISR | 300s | Same board pre-filtered; the SEO asset for the feature |
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
| **Job board** | `/api/cron/ingest-jobs`, `/api/admin/jobs/ingest`, `/api/jobs/:id/apply` | `CRON_SECRET` / Admin / Auth |

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
| Daily 5:00 AM UTC (Render cron) | Job ingest — ATS feeds (Greenhouse, Lever, Ashby, Workable, Amazon) |
| Daily 5:10 AM UTC (Render cron) | Job ingest — enterprise ATS (Workday, Eightfold, Oracle, JSON-LD); `maxSeconds: 420` |
| Daily 5:45 AM UTC (Render cron) | Job summaries — `/api/cron/jobs-summaries` |
| _(not created)_ 5:25 AM UTC | Job ingest — aggregators. Reed is unkeyed, so this would be a nightly no-op for $1/month. Commented out in `render.yaml`; create it when a Reed key exists. |

Both job crons POST to `/api/cron/ingest-jobs` with a `Bearer $CRON_SECRET` header. They are
split so each run stays inside Render's free-plan limits, the sources' rate limits are
staggered, and each is independently visible in `job_ingest_runs`.

> **`render.yaml` is NOT Blueprint-synced.** Every Render service is created and edited by
> hand in the dashboard; the file is the written record, not the source of truth, and
> editing it deploys nothing. This has already cost real downtime: the jobs crons were
> added to `render.yaml` on 2026-08-09 and never existed in Render, so the board sat frozen
> at 29 listings while `job_ingest_runs` logged 61 manual runs and zero cron runs. Do not
> "fix" this by syncing the Blueprint — the web service was created manually and Render
> would stand up a duplicate rather than adopt it. Note also that Render cron jobs carry a
> $1/month minimum each and so cannot live on the web service's free plan.
>
> `CRON_SECRET` must be set on **each cron service** as well as the web service (`sync:
> false` never copies it across). A cron missing it sends `Authorization: Bearer ` and gets
> a 401; `curl --fail` then exits before the endpoint records anything, so the failure is
> visible only as an *absence* of rows in `job_ingest_runs` — never as an error.

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

4. **`cleanUrls: true` forbids `.html` in a rewrite destination.** Both
   `vercel.json` files set `cleanUrls`, which strips the extension from every
   HTML file — so `/index.html` stops being a servable path and becomes a 308
   to `/`. An SPA fallback rewriting to `/index.html` therefore matches, misses,
   and returns a raw `x-vercel-error: NOT_FOUND`. **The destination must be `/`.**

   This silently broke every deep link on `admin.ignite.education` (only `/`
   worked — client-side navigation hid it) and, on the apex, `/office-hours/*`,
   `/auth/*`, `/learning-v1`, `/dev/lobby` and the catch-all. `/progress` and
   `/learning` appeared healthy only because `scripts/inject-seo.js` prerenders
   real files at those paths, and filesystem beats rewrites (see 3).

   Symptom to recognise: a `text/plain` 404 carrying `x-vercel-error: NOT_FOUND`
   **plus** your own `headers` block — that combination means the config is
   loaded and the rewrite destination is what's wrong.

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
- Admin/Teacher (with `?redirect=admin`) → `admin.ignite.education`
- Everyone else → `/progress`

### Users with no enrolled course

`/progress` serves both enrolled and unenrolled users — **`/courses` is no longer an
onboarding destination**, only the public marketing catalog. `users.enrolled_course` being
null is a first-class state, not an error:

- [`useProgressData`](src/components/ProgressHubV2/hooks/useProgressData.js) returns a
  `hasCourse` flag and skips every course-scoped fetch when it is false. A failed or missing
  `users` row lands here too, so a transient DB error degrades the page rather than ejecting
  the user.
- Section 2 swaps `CourseDetailsSection` for
  [`CourseSelectorSection`](src/components/ProgressHubV2/sections/CourseSelectorSection.jsx) —
  the course catalog in the hub's dark theme. Both own `id="course-details"` so the intro
  copy's anchor lands either way. Sections 1, 3, 4 and the footer are unchanged; the intro
  gets a no-course copy variant.
- Cards link to `/courses/{slug}` in a **new tab** (a plain `<a>`, never a react-router
  `Link` — `/courses/*` is a Vercel rewrite to Next.js, so client-side routing would hit the
  SPA's catch-all). Enrolment stays on the existing `EnrollmentCTA`.
- [`useEnrollmentWatch`](src/components/ProgressHubV2/hooks/useEnrollmentWatch.js) re-checks
  `enrolled_course` when the tab regains focus, clears `enrollment_status_cache` and reloads —
  otherwise the hub would sit stale behind the tab where the user just enrolled.
- `ProtectedRoute` takes `requireCourse`. Only the course-content routes (`/learning`,
  `/learning-v1`, `/office-hours/:sessionId`) set it, and they redirect to `/progress`.
  Without it, `useLessonData` silently falls back to the `product-manager` course.

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
| **Greenhouse / Lever / Ashby / Workable** | Public ATS job-board feeds — no keys, full descriptions, direct employers. Startup ATSs; they cover almost none of the large brands | API (`server/jobs/sources/`) |
| **Workday / Eightfold / Oracle Recruiting Cloud** | Enterprise ATSs — public, unauthenticated, undocumented. The only route to Roche, Nike, LSEG, Mars, Netflix, M&S. Two-phase: one request per job for the description | API (`server/jobs/sources/`) |
| **schema.org JobPosting** | Vendor-agnostic — any careers site publishing `JobPosting` JSON-LD, read through its sitemap. British Airways today. The most durable adapter, because the format is a published standard | Sitemap + JSON-LD |
| **Amazon Jobs** | In-house ATS, the one case discovery cannot solve. Single-phase with inline descriptions, so its whole UK board costs nine requests and no per-job fetch | API (`server/jobs/sources/amazon.js`) |
| **Reed.co.uk** | UK job aggregation; its `graduate` flag is the best entry-level signal available. Key is not self-serve | API |

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
- `job_listings` + `job_listing_apply`, `job_sources`, `job_markets`, `job_queries`,
  `job_source_accounts`, `job_companies`, `job_ingest_runs`, `job_rejection_fingerprints`,
  `job_apply_clicks` — the job board (see below)

Database triggers on `public.users`:
- `on_auth_user_created` (`AFTER INSERT ON auth.users` → `handle_new_user()`) — mirrors every
  signup into `public.users`
- `ensure_public_profile_fields_on_insert` (`BEFORE INSERT`) — fills `username` (via
  `generate_username()`) and `avatar_url` (from `auth.users` metadata) whenever the insert
  omits them. This is what activates the public profile at `ignite.education/{username}`.
  It lives on `public.users` rather than only in `handle_new_user()` because three app code
  paths insert user rows directly and bypass the auth trigger entirely
  ([ProtectedRoute.jsx](src/components/ProtectedRoute.jsx), [enroll.ts](next-app/src/lib/enroll.ts),
  [EnrollmentCTA.tsx](next-app/src/app/courses/[courseSlug]/EnrollmentCTA.tsx)) — a row with a
  NULL username silently drops out of the `public_profiles` view and 404s
- `upgrade_placeholder_username_on_update` (`BEFORE UPDATE OF first_name, last_name`) — re-slugs
  only the `user` / `user-N` placeholder, for signups that collect the name after the row exists

See `migrations/fix_username_on_signup.sql`; `scripts/backfill-usernames.js` and
`scripts/backfill-profile-avatars.js` repair existing rows.

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

### Job board

Public board at `/jobs`, backed by a nightly ingest pipeline in `server/jobs/` and an admin
approval queue at `admin.ignite.education/jobs`. Modelled on `/prompts` — same profession
taxonomy (`courses` rows where `course_type = 'specialism'`), same filter UX, same public
Next.js + admin CRUD split.

**There are no per-job pages.** Job detail expands in place on the board, and `?job=<id>` makes a
listing linkable. That is a deliberate scope choice: it removes an entire route tree, the
soft-404-on-expiry problem, and the `JobPosting` structured-data question. The profession pages
(`/jobs/[professionSlug]`) are the SEO asset instead.

**No `JobPosting` JSON-LD anywhere.** With no per-job pages there is nothing to attach it to, and
emitting it would feed listings into the Google Jobs widget — which renders the vacancy inside
Google's own result and sends the click somewhere other than here, defeating the account gate. It
would also conflict with source terms that forbid redistribution to competing aggregators.

#### The sign-in-to-apply gate

Anyone can read the board; clicking through to a vacancy requires an account. The mechanism is
structural, not cosmetic:

| Layer | Guarantee |
|-------|-----------|
| Storage | `job_listing_apply` is a **separate table** with no anon or authenticated RLS policy |
| Page render | `jobsData.ts` uses the cookie-less anon client (needed for ISR), which cannot see that table at all |
| RSC payload | `<ApplyGate jobId={...} />` receives only an id — there is no URL to serialise |
| API | `GET /api/jobs/:id/apply` behind `verifyAuth` is the only reader, via the service role |

Do **not** move `apply_url` back onto `job_listings`. The separation is what makes the gate
unbypassable rather than merely un-rendered.

Resolution is entirely client-side after hydration, and must stay that way: the board is ISR, so
its HTML is a **shared** cache entry — resolving the URL server-side "when the user is signed in"
would bake one signed-in render into the cache and serve it to everyone. The endpoint returns
JSON rather than a 302 because Supabase cookies are scoped to `.ignite.education` while the API
is on `onrender.com`, so a plain `<a href>` would carry no session.

#### Ingest pipeline (`server/jobs/`)

Everything is driven by **database config** — adding a country or a company is an INSERT, not a
deploy. Adapters read their country identifier from `job_markets.source_params`.

| Concern | File |
|---------|------|
| Orchestrator + filter cascade + hydration | `server/jobs/index.js` |
| Startup ATS adapters | `server/jobs/sources/{greenhouse,lever,ashby,workable}.js` |
| Enterprise ATS adapters (two-phase) | `server/jobs/sources/{workday,eightfold,oracleOrc,jsonld}.js` |
| In-house ATS adapters (one employer each) | `server/jobs/sources/amazon.js` |
| Aggregator adapters | `server/jobs/sources/reed.js` |
| Board discovery | `server/jobs/lib/discover.js` + `scripts/discover-job-boards.mjs` |
| Seniority inference (pure, testable) | `server/jobs/lib/seniority.js` + `config/seniorityRules.js` |
| Profession mapping | `server/jobs/lib/profession.js` + `config/professionMap.js` |
| Dedupe | `server/jobs/lib/dedupe.js` |
| Rate limits + ToS budget | `server/jobs/lib/rateLimiter.js`, `lib/budget.js` |
| Expiry + outage guard | `server/jobs/lib/expire.js` |
| Employer logos | `server/jobs/lib/logos.js` |
| Local runner | `scripts/run-job-ingest.mjs` |

**Two-phase sources.** Workday, Oracle Recruiting Cloud and the JSON-LD careers-site adapter all
return a list with no advert text, so the description costs one HTTP request per job. Those
adapters set `needsDetail: true` and implement `hydrateOne()`; the orchestrator's hydrate step
calls it only after three cheap gates (blocked title, age, `couldMapProfession()` on the title
alone) and only for jobs not already in the database — a re-seen listing reads its description
from `job_listings`. Roche's board is 1,191 requisitions worldwide; the UK facet plus those gates
take a nightly run down to a handful of requests.

Two invariants in that step are load-bearing and non-obvious:

- **A job that cannot be hydrated is dropped (`not_hydrated`), never persisted.** `description_*`
  are `VOLATILE_FIELDS` in `persist.js`, so writing a re-seen job without its text would blank
  what it already had.
- **Detail fetches are counted in `job_ingest_runs.detail_calls`, never in `api_calls`.**
  `updateTypicalVolume()` matches history on `api_calls` as a proxy for configured scope; folding
  in a number that moves with nightly new-job volume would leave `typical_volume` permanently null
  and silently disarm the delisting outage guard.

Jobs are dropped **before** they become rows, counted into `job_ingest_runs.dropped`:
`too_old`, `title_blocked`, `company_not_allowed`, `no_profession`, `company_blocked`,
`wrong_market`, `executive`, `rejected_repeat`, `duplicate`. In a live dry run this took 4,306
fetched jobs down to 81 — that ratio is what makes a manual approval queue sustainable. The
`dropped` breakdown is where all tuning starts.

#### The company allowlist

The board displays **only brands explicitly approved in `job_companies.allowed`**. Anything else
is dropped at ingest into `company_not_allowed`, before profession mapping, so it never becomes a
row and never reaches the approval queue.

Matching is on `normaliseCompany()` output. The four ATS adapters take their company name from
`job_source_accounts.company` — a column we control — so those match exactly; `job_companies.aliases`
exists for aggregators, which report whatever the employer typed (`Marks and Spencer plc`, `M&S`).

Two properties follow from this that are easy to miss:

- **It is what makes aggregators safe to enable.** An aggregator's problem is always volume from
  employers nobody vetted. An allowlist reduces that to a known set — and it is what lets a
  company sweep work at all: aggregators have no company filter, so the query is a free-text
  search for the brand and the allowlist does the exact matching. An agency advertising "a role
  with Marks & Spencer" carries the *agency* as its company and is dropped. Measured on a live
  Adzuna dry run before that source was removed: 706 fetched, 642 dropped as
  `company_not_allowed`, 7 kept.
- **It removes the logo domain-guessing risk entirely**, because every allowed company carries a
  hand-checked `domain`.

Allowlist mode is on unless `JOBS_COMPANY_ALLOWLIST=false`. If it is on and the allowlist is
empty, the ingest **throws** — silently ingesting everything when an allowlist was requested is
the more dangerous failure.

#### Coverage: allowed is only half of it

Being `allowed` means we are *willing* to show a company's roles. It does not fetch anything. A
company also needs a **source**: a `job_source_accounts` board, or a `job_queries` row scoped to
it via `company_norm`. A company with neither sits on the allowlist producing nothing, and every
other admin screen looks entirely normal while it does — which is exactly how 27 of 38 allowlisted
brands ended up contributing zero listings.

Three things exist to stop that recurring:

| Piece | What it does |
|-------|--------------|
| `job_company_coverage()` RPC | One row per company: board count, enabled boards, failing boards, query count, live and pending listings, last seen |
| Admin **Coverage** tab | Zero-coverage companies sort to the top and stay amber. Boards are added, tested and removed in place |
| `scripts/discover-job-boards.mjs --gaps` | Fingerprints each uncovered company's careers site, derives the board config, verifies it returns in-market jobs, prints paste-ready SQL |

`job_source_accounts.company_norm` is a real foreign key to `job_companies`, so a board cannot be
attached to a company that is not in the registry — the old display-name string match let that
happen silently.

**`job_companies.careers_url` is the manual input into discovery.** Given only a domain, discovery
guesses four conventional addresses (`careers.x`, `x/careers`, `jobs.x`, `x/jobs`). That is right
for most companies and wrong for most of the ones still uncovered, whose boards sit on separate
brand domains or behind redirects — so the fingerprint lands on a marketing page, finds no vendor,
and reports "no board found" for a company that plainly has one. An admin types the real URL on the
Coverage tab (**save & find** runs discovery against it immediately); `discoverBoards()` fetches it
before the guesses and uses its origin first in the JSON-LD sitemap fallback. A typed URL is also a
domain hint, so a company added by name alone is still discoverable. It does **not** bypass
`DENYLIST` — that check walks up the host labels, so `jobs.apple.com` is refused exactly as
`apple.com` is — and robots.txt is still checked, now per-origin, because a careers subdomain
frequently has different rules from the company domain.

**In-house ATSs are the one case discovery cannot solve.** Amazon runs its own recruiting system,
so there is no vendor marker to fingerprint, no `/sitemap.xml`, and a careers page that is a
JS-rendered SPA with zero job links in its HTML — all four discovery stages are genuinely
exhausted and correctly report "no board found" for a company with a perfectly good public API
(`search.json`, 818 UK jobs, descriptions inline). The only fix is knowing the board exists, so
`IN_HOUSE` in `lib/discover.js` maps a domain to a hand-written adapter and probes it through the
real `fetchPage()`. The bar for adding one is deliberately high — an allowlisted company, a large
board, and no other route — because a hand-written adapter per employer does not scale.

**Boards we deliberately do not build.** Apple, Google, Microsoft, Meta, TikTok, Uber, LinkedIn
and JD.com all block automated access to their job data (401/403/private GraphQL; LinkedIn's
Greenhouse board holds only ATS test fixtures). Working around that would breach their terms, so
`DENYLIST` in `lib/discover.js` refuses to probe them and says why. They stay allowlisted and are
covered by the aggregator sweep only, where the employer has chosen to syndicate.

#### Market matching

`job_markets.location_matchers` has to be loose enough to catch "London", "Wales" and "UK"
wherever a source puts them. On a single-country startup ATS board that is harmless. On a global
Workday or Oracle board it is not: `\bwales\b` matches `AUS-New South Wales-Asquith` and
`\blondon\b` matches `CAN-Ontario-London`. `job_markets.location_excluders` is checked **first**
in `matchesMarket()`, so an explicit "this is somewhere else" always beats a loose city match.

#### Employer logos

Resolved once per **company** per 30 days (not per listing), re-hosted in the Supabase `assets`
bucket under `job-logos/`, and denormalised onto `job_listings.company_logo_url`. That last copy
is load-bearing, not redundant: `job_companies` has no anon SELECT policy, so the public board
cannot join to it.

Source is Google's `s2/favicons` endpoint, with DuckDuckGo `ip3` as fallback. Both were probed
against all 36 employer domains — Google returned a brand-correct raster for 36/36. Rejected:
**Clearbit** (the service is gone — `logo.clearbit.com` is NXDOMAIN) and **icon.horse**, which
fails *open* by returning HTTP 200 and a generated grey letter-tile for domains that do not
exist, so it would silently poison the table.

Re-hosting rather than hot-linking means the Supabase host is already in `remotePatterns`, so no
routing config changes; and if s2 disappears (it is undocumented and unversioned) logos stop
*refreshing* rather than breaking.

Three things here are counter-intuitive enough to be worth stating:

- **Check the HTTP status, not just the bytes.** Google returns a valid 726-byte grey-globe PNG
  *alongside* its 404 for unknown domains. Sniffing bytes without checking status stores globes.
- **Sniff the content type from magic bytes, never the response header.** Providers routinely
  mislabel (Trustpilot serves a real ICO as `application/octet-stream`). Supabase serves back
  whatever you set, and some browsers then refuse to render it — where the failure hides behind
  the perfectly normal-looking initial-tile fallback.
- **Domain guessing is off by default** (`JOBS_LOGO_GUESS_DOMAINS`). Measured against the 25 live
  employers with the curated mapping disabled, guessing picked the *wrong company* for 8 of them —
  `harvey.co.uk` is a water-softener firm, not the legal-AI company. Every wrong guess passed the
  homepage-title check, because a company genuinely called "Harvey" does have "Harvey" in its
  `<title>`. No cheap heuristic separates same-name-different-company, and a wrong logo is a
  trademark complaint rather than a rendering glitch.

The trusted path is `job_source_accounts.domain` — hand-filled, and it covers every ATS employer.
Companies with no domain keep the coloured initial tile. `logo_status = 'suppressed'` is the
permanent takedown lever and is never retried by the ingest.

**`company_logo_url` must never go back into `persist.js`'s `VOLATILE_FIELDS`.** Every adapter
hardcodes `companyLogoUrl: null` because no ATS API returns a logo, so "refreshing" that column
on a re-seen job overwrites a resolved logo with null — the whole board loses its logos on the
second ingest run. The column is owned by `lib/logos.js`, which re-asserts it onto each company's
listings every run so newly inserted rows pick it up without waiting out the 30-day refresh window.

#### The expiry volume guard can deadlock

`expire.js` skips the delist sweep when a run fetches less than half of `job_sources.typical_volume`,
so a source outage cannot mass-expire the board. The trap: the guard cannot distinguish an outage
from **us deliberately shrinking our own account list**, which produces an identical volume drop.

Before this was fixed, that deadlocked permanently — guard trips → run marked `partial` → a
`success`-only median never updates → the guard trips forever and withdrawn vacancies stay on the
board indefinitely. Enabling the allowlist triggered exactly this, taking ashby from ~2,800 jobs
to ~230.

`updateTypicalVolume()` therefore computes its median only over runs with the **same `api_calls`**
(the available proxy for configured scope), and runs for `partial` as well as `success`. A real
outage leaves scope unchanged, so the low run is one sample among ten and the guard stays armed; a
config change has no history at the new scope, so it re-baselines immediately.

#### Things that will bite you

- **`profession` and `seniority` are `GENERATED ALWAYS AS (COALESCE(override, inferred)) STORED`.**
  They cannot be written directly — every admin write must target `profession_override` /
  `seniority_override`. This is what stops a re-ingest clobbering an admin decision.
- **Never `.upsert()` `job_listings`.** Upsert replaces the row, resetting `status`, `approved_at`
  and the overrides — silently resurrecting rejected jobs every night. `persist.js` looks up by
  `(source, source_job_id)` and updates only volatile content fields.
- **The expiry outage guard is not optional.** The delisting rule ("we did not see it, so expire
  it") would wipe the whole board if a source had a partial outage, so it only runs when a run
  fetched ≥50% of `job_sources.typical_volume`. Otherwise only `expires_at` applies and the run
  records as `partial`.
- **ATS `posted_at` is unreliable, and the board now filters on it anyway.** Lever reports when
  the *requisition record* was created, which for evergreen roles can be a decade ago. `too_old`
  used to be skipped for `kind = 'ats'` for exactly that reason, with delisting as the only
  lifecycle rule. It no longer is: `MAX_POSTED_AGE_DAYS` (45, `expire.js`, overridable via
  `JOBS_MAX_POSTED_AGE_DAYS`) drops older postings at ingest **and** expires ones already held.
  This is a deliberate product trade, not a bug fix, and **it is the dial that governs board size
  far more than sourcing does**. Measured across all 18 enabled boards — 3,008 jobs fetched, of
  which 2,786 map to no specialism and 155 are out of market — the surviving count by window is
  21d → 20, 30d → 37, 45d → 45, 60d → 48, 90d → 49, uncapped → 67. It sat at 21 and was widened to
  45, where the curve flattens; at 21 the largest single group it was discarding was 25 Product
  Manager roles at LSEG, Deliveroo and Monzo that were all still live in the employer's own feed.
  Widen it before concluding the ingest is broken, and note that widening alone restores nothing
  already expired — `persistBatch` never rewrites `status`, so reviving needs an explicit UPDATE
  (`migrations/revive_jobs_for_45_day_window.sql` is the worked example, including the
  `last_seen_at` guard that separates "we hid it" from "the employer took it down"). If the intent
  ever becomes "drop what has gone cold on *our* board", the right column is `first_seen_at`,
  which is already what `computeExpiry()` anchors on.
- **The freshness cut is duplicated, on purpose.** `MAX_POSTED_AGE_DAYS` in `expire.js` (server)
  and in `next-app/src/data/jobsData.ts` (read time) — separate deploys, no shared imports.
  Change both together. Drift always resolves to the tighter of the two, so neither direction
  can leak a stale listing onto the board. The read-time copy also gates `getProfessionsWithJobs`,
  which decides indexing and sitemap membership.
- **An aggregator's monthly cap is the real ceiling**, not the daily one. `budget.js` enforces
  every window from the database rather than in process, because Render's free plan spins the
  service down and an in-memory counter cannot survive a restart — and the stated penalty for a
  breach is losing the key.
- **Attribution is contractual.** `SourceAttribution.tsx` renders from `job_sources.attribution`
  keyed on the listing's **`display_source`** (not `source` — a cross-source dedupe can elect a
  different canonical). Aggregators typically require their logo at a stated minimum pixel size
  on every advert and suspend access for non-compliance. **No ATS source requires anything** —
  a direct employer feed is ours to display, syndicated inventory is not. That distinction is
  why Adzuna was removed: its badge was not something the board should carry, and the data is
  not available without it. See `migrations/remove_adzuna_source.sql`.
- **No aggregate statistics over aggregator data** — no job counts, no average-salary widgets, no
  "X new jobs this week". Their terms restrict derived stats without written consent, which is
  why the board renders no result count.
- **`jobs` is a reserved username.** `/jobs` would otherwise collide with the `/{username}`
  rewrite. Kept in step in `scripts/backfill-usernames.js` and `public.is_reserved_username()`.

#### Coverage gap

ATS feeds are used almost exclusively by tech companies and digital agencies. A live probe of
~60 UK healthcare and renewable-energy employers found **zero** usable boards. So the ATS tier
serves UX Designer, Data Analyst, Cyber Security Analyst, Product Manager and Digital Marketing
Specialist, while **Healthcare Assistant, Mental Health Worker and Green Energy Technician have
no source at all** since Adzuna was removed — it operated DWP Find a Job and was the only feed
here reaching non-tech roles. Those three profession pages stay empty, and empty pages are hidden
from the filter, noindexed, and excluded from the sitemap. Restoring them means either accepting
an aggregator's attribution badge or finding direct employer boards in those sectors, where an
earlier survey of ~60 UK healthcare and renewable-energy employers found zero usable feeds.

**Excluded sources and why:** LinkedIn and Indeed have no readable API at any price (Indeed
retired its publisher API in 2024; LinkedIn's is write-only and not accepting partners), and
scraping either violates their terms — including indirectly via a scraping vendor. **Remotive**
is excluded because its terms forbid using its listings to collect signups, a direct conflict
with the account gate. **Jobicy** forbids redistribution to competing aggregators.


## Caching Strategy

| Layer | What | TTL |
|-------|------|-----|
| **NodeCache (in-memory)** | LinkedIn posts | 24 hours |
| **NodeCache** | Reddit flairs | 24 hours |
| **NodeCache** | Global lesson scores | 1 hour |
| **Database** | Reddit posts/comments | 30 min (refresh via cron) |
| **Database** | TTS audio + timestamps | Permanent (until deleted) |
| **Database** | Job listings (`job_listings`) | Daily ingest; expiry evaluated at read time in RLS |
| **Vercel ISR** | Next.js public pages | 5 min (jobs), 1 hour (courses, welcome) to 24 hours (release notes) |

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
