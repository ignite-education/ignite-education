# Progress Hub V2 — Redesign Plan

## Comprehensive Guide for the Ignite Education Progress Hub Redesign

---

## Executive Summary

**Goal:** Redesign the user progress hub from a fixed two-column layout (4,572-line monolith) into a modern, single-column scrollable page with new features — progress graph, user stats, and a dynamic AI summary.

**Approach:** Build on a separate `/progress-v2` route within the Vite SPA so the current `/progress` page remains untouched for users until V2 is ready to ship.

**Tech Stack:** Vite SPA (React 19, React Router 7) — this is an authenticated page with no SEO benefit, so Next.js is not needed.

**Current Status:** Phase 1 COMPLETE. All scaffolding, hooks, section components, and routing are built. Build passes. Ready for visual iteration and real data wiring.

---

## Design Overview

The redesigned progress hub is a **full-width, single-column scrollable page** with 5 sections:

| # | Section | Description | Status |
|---|---------|-------------|--------|
| 1 | **Introduction** | Ignite logo, user photo, greeting, dynamic progress summary, stats row, settings link | Built (stats & summary mocked) |
| 2 | **Course Details** | Course title, progress graph (mountain/wave SVG), lesson slider, office hours, community forum | Built (graph data mocked) |
| 3 | **Merchandise** | Product images linking to Shopify store | Built |
| 4 | **Blog** | Latest blog posts via existing BlogCarousel | Built |
| 5 | **Footer** | Standard site footer | Built (reuses existing Footer component) |

---

## File Structure

All new files live in `src/components/ProgressHubV2/`:

```
src/components/ProgressHubV2/
├── index.jsx                         # Barrel export
├── ProgressHubV2.jsx                 # Page orchestrator (~140 lines)
├── hooks/
│   ├── useProgressData.js            # Data fetching hook
│   └── useCourseProgress.js          # Progress computation hook
└── sections/
    ├── IntroSection.jsx              # Section 1: hero with greeting, stats, progress
    ├── CourseDetailsSection.jsx      # Section 2: wrapper for course content
    ├── ProgressGraph.jsx             # NEW: SVG mountain/wave chart
    ├── LessonSlider.jsx              # Extracted lesson carousel
    ├── OfficeHoursCard.jsx           # Extracted office hours + Calendly/Stripe
    ├── CommunityForumCard.jsx        # Simplified forum CTA
    ├── MerchandiseSection.jsx        # Section 3: product grid
    └── BlogSection.jsx              # Section 4: wraps BlogCarousel
```

**Only modified file:** `src/App.jsx` — added lazy import + `/progress-v2` route.

---

## Route Configuration

- **Route:** `/progress-v2`
- **Auth guard:** Wrapped in `<ProtectedRoute>` (same as `/progress`)
- **Lazy loaded:** `const ProgressHubV2 = lazy(() => import('./components/ProgressHubV2'))`
- **Vercel:** No `vercel.json` changes needed — SPA fallback already catches this route

---

## Data Architecture

### useProgressData Hook
Fetches all data the page needs after auth initializes:

| Data | Source | API Function |
|------|--------|-------------|
| Enrolled course | `supabase.from('users')` | Direct query |
| Course details | `supabase.from('courses')` | Direct query |
| Lessons by module | `src/lib/api.js` | `getLessonsByModule(courseId)` |
| Lessons metadata | `src/lib/api.js` | `getLessonsMetadata(courseId)` |
| Completed lessons | `src/lib/api.js` | `getCompletedLessons(userId, courseId)` |
| Coaches | `src/lib/api.js` | `getCoachesForCourse(courseId)` |
| Certificates | `src/lib/api.js` | `getUserCertificates(userId)` |
| User info | `useAuth()` | `firstName`, `profilePicture`, `isAdFree` |

**Deliberately excluded:** Reddit/community posts (CommunityForumCard is a simplified CTA, not the full forum).

### useCourseProgress Hook
Pure computation — no API calls:

- `progressPercentage` — % of lessons completed
- `upcomingLessons` — sorted array of all lessons
- `isLessonCompleted(module, lesson)` — check function
- `isLessonAccessible(module, lesson)` — unlock check
- `currentModule` / `currentLesson` — where the user is

---

## What's Mocked (Needs Real Implementation)

### 1. User Stats (IntroSection.jsx)
Currently hardcoded: "Top 15% of learners", "Late night learner", "134 learners in the UK"

**To implement:**
- Learner ranking — query all users' completion counts, compute percentile
- Activity pattern — analyze `last_active_at` timestamps to determine learning habits
- Geo count — count users by country/region (needs IP-based or self-reported location)
- May need new Supabase queries or API endpoints

### 2. AI Summary (IntroSection.jsx)
Currently static text: "Overall, you're scoring great..."

**Options:**
- **Template-based** — fill in course name, next lesson, percentage, strongest module
- **LLM-generated** — call Claude/GPT API with user progress data for personalized summary
- Decision deferred to future session

### 3. Progress Graph Scores (ProgressGraph.jsx)
Currently using `MOCK_MODULE_SCORES` array with hardcoded scores.

**To implement:** Wire up real quiz/assessment scores per module. Requires:
- A `quiz_scores` or `assessments` table in Supabase
- An API function to aggregate scores by module
- Replace mock data with real data in the hook

### 4. Settings (ProgressHubV2.jsx)
Settings link currently navigates to `/progress` (where the settings modal lives).

**To implement:** Extract the settings modal from `ProgressHub.jsx` (lines 3927-4293, ~370 lines) into a shared component that both `/progress` and `/progress-v2` can use.

---

## Existing Components Reused

| Component | File | Usage in V2 |
|-----------|------|-------------|
| Footer | `src/components/Footer.jsx` | Section 5 — used directly |
| BlogCarousel | `src/components/BlogCarousel.jsx` | Wrapped in BlogSection |
| CoursePageNavbar | `src/components/CoursePageNavbar.jsx` | Top navigation |
| useTypingAnimation | `src/hooks/useTypingAnimation.js` | Greeting name animation |
| ProtectedRoute | `src/components/ProtectedRoute.jsx` | Route auth guard |
| LoadingScreen | `src/components/LoadingScreen.jsx` | Loading state |

---

## Components Extracted from Monolith

These were **copied and adapted** from `src/components/ProgressHub.jsx` — the original file was NOT modified:

| Component | Source Lines | What Changed |
|-----------|-------------|--------------|
| LessonSlider | 2663-2899 + scroll handlers 1797-1940 | Self-contained scroll state, accepts props instead of reading parent state |
| OfficeHoursCard | 2901-3086 + Calendly/Stripe handlers 1554-1637 | Includes its own Calendly modal + Stripe upgrade flow |
| MerchandiseSection | 3088-3118 + shop handlers 1640-1654 | Self-contained with hardcoded Shopify URLs |
| CommunityForumCard | 3146-3400 (simplified) | Reduced to a CTA button linking to Reddit — no full forum integration |

---

## Implementation Phases

### Phase 1: Scaffolding & Initial Build ✅ COMPLETE
- [x] Create directory structure and barrel export
- [x] Add `/progress-v2` route to `App.jsx`
- [x] Build `useProgressData` hook (data fetching)
- [x] Build `useCourseProgress` hook (computed state)
- [x] Build IntroSection (greeting, mocked stats, progress bar)
- [x] Build ProgressGraph (custom SVG, mocked scores)
- [x] Extract LessonSlider from ProgressHub
- [x] Extract OfficeHoursCard from ProgressHub (with Calendly/Stripe)
- [x] Build CommunityForumCard (simplified CTA)
- [x] Extract MerchandiseSection from ProgressHub
- [x] Build BlogSection (wraps BlogCarousel)
- [x] Build page orchestrator (ProgressHubV2.jsx)
- [x] Verify build passes (`vite build` — clean)

### Phase 2: Visual Polish
- [ ] Iterate layout/spacing to match design mockup exactly
- [ ] Refine IntroSection layout (profile pic position, stats alignment)
- [ ] Tune ProgressGraph visual style (colors, line weight, gradients)
- [ ] Ensure consistent typography and spacing across sections
- [ ] Add section dividers/backgrounds matching the design

### Phase 3: Real Data Wiring
- [ ] Wire progress graph to real quiz/assessment scores per module
- [ ] Build user stats backend queries (ranking, activity pattern, geo)
- [ ] Wire user stats into IntroSection
- [ ] Build AI summary (template-based or LLM-generated)
- [ ] Wire community forum card to show recent post previews (optional)

### Phase 4: Shared Component Extraction
- [ ] Extract Settings modal from ProgressHub into shared component
- [ ] Wire Settings link in V2 to use extracted settings modal
- [ ] Consider extracting MobileBlockScreen into shared component

### Phase 5: Testing & Launch
- [ ] Verify all sections render with real user data
- [ ] Test auth guard (unauthenticated redirect, unenrolled redirect)
- [ ] Test lesson slider scroll/snap behavior
- [ ] Test Calendly modal opens correctly
- [ ] Test Stripe upgrade flow in OfficeHoursCard
- [ ] Verify original `/progress` still works identically
- [ ] When satisfied: swap `/progress` route to use V2, retire monolith

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/App.jsx` | Route config — has `/progress-v2` route |
| `src/components/ProgressHub.jsx` | Original monolith (4,572 lines) — DO NOT MODIFY |
| `src/components/ProgressHubV2/` | All V2 files |
| `src/lib/api.js` | API functions used by hooks |
| `src/contexts/AuthContext.jsx` | Auth context (`user`, `firstName`, `isAdFree`, `profilePicture`) |
| `src/hooks/useTypingAnimation.js` | Typing animation hook |
| `src/components/Footer.jsx` | Shared footer |
| `src/components/BlogCarousel.jsx` | Shared blog carousel |
| `src/components/CoursePageNavbar.jsx` | Shared top navbar |
| `vercel.json` | Route rewrites (no changes needed for V2) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Lesson slider scroll logic is complex (~15 handlers) | All scroll state is internal to LessonSlider.jsx — parent just passes lesson data |
| Calendly/Stripe dependency chain in office hours | Included fully in OfficeHoursCard with its own modal state |
| Settings modal not yet shared | Temporary workaround: Settings link navigates to `/progress` |
| Original ProgressHub could drift from V2 | V2 is a complete copy — no shared mutable state between the two |
| Bundle size increase | Route is lazy-loaded — only affects users visiting `/progress-v2` |
