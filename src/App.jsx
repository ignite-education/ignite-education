import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { AnimationProvider } from './contexts/AnimationContext'
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay'
import SuspenseLoadingSignal from './components/SuspenseLoadingSignal'
import { releaseBootClaim } from './lib/loadingStore'

// Redirect old /admin/* routes to admin.ignite.education
const AdminRedirect = () => {
  useEffect(() => {
    window.location.href = 'https://admin.ignite.education'
  }, [])
  return null
}

// Lazy load all route components for code splitting
const RedditCallback = lazy(() => import('./components/RedditCallback'))
const LinkedInCallback = lazy(() => import('./components/LinkedInCallback'))
const LearningHub = lazy(() => import('./components/LearningHub'))
const ProgressHubV2 = lazy(() => import('./components/ProgressHubV2'))
const VideoChat = lazy(() => import('./components/VideoChat/VideoChat'))
const NotFound = lazy(() => import('./components/NotFound'))
const OfficeHoursPreview = lazy(() => import('./components/VideoChat/OfficeHoursPreview'))
const LearningHubV2 = lazy(() => import('./components/LearningHubV2'))

function App() {
  // Signal to prerenderer that the page is ready
  useEffect(() => {
    document.dispatchEvent(new Event('render-complete'));

    // The overlay is visible from the very first paint via a synthetic boot claim.
    // Child effects flush before this one, so any real claim (auth check, suspended
    // chunk, hub data) has already taken over by the time it's released.
    releaseBootClaim();
  }, []);

  return (
    <BrowserRouter>
      <AnimationProvider>
        <AuthProvider>
          <Suspense fallback={<SuspenseLoadingSignal />}>
          <Routes>
            {/* "/" is not a page of this app. In production the apex 308s it to
                /welcome before the SPA is ever reached, so rendering the hub here
                only ever created a second URL for /progress — and a second
                homepage candidate for Google to pick over /welcome. Kept as a
                redirect because `vite dev` has no vercel.json, so "/" is still
                the local entry point. */}
            <Route path="/" element={<Navigate to="/progress" replace />} />
            <Route path="/progress" element={
              <ProtectedRoute>
                <ProgressHubV2 />
              </ProtectedRoute>
            } />
            {/* requireCourse: these render course content, so an unenrolled user
                is sent to /progress to pick a course first. Without it they'd
                silently get the 'product-manager' default in useLessonData. */}
            <Route path="/office-hours/:sessionId" element={
              <ProtectedRoute requireCourse>
                <VideoChat />
              </ProtectedRoute>
            } />
            <Route path="/learning" element={
              <ProtectedRoute requireCourse>
                <LearningHubV2 />
              </ProtectedRoute>
            } />
            <Route path="/learning-v1" element={
              <ProtectedRoute requireCourse>
                <LearningHub />
              </ProtectedRoute>
            } />
            <Route path="/auth/reddit/callback" element={<RedditCallback />} />
            <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
            <Route path="/dev/lobby" element={<OfficeHoursPreview />} />
            <Route path="/admin/*" element={<AdminRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
      {/* Mounted for the lifetime of the document — outside <Suspense> and <Routes>
          so nothing can ever unmount it and the Lottie player is created once. */}
      <GlobalLoadingOverlay />
      </AnimationProvider>
    </BrowserRouter>
  )
}

export default App