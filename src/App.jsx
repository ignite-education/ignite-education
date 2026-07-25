import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
            <Route path="/" element={
              <ProtectedRoute>
                <ProgressHubV2 />
              </ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute>
                <ProgressHubV2 />
              </ProtectedRoute>
            } />
            <Route path="/office-hours/:sessionId" element={
              <ProtectedRoute>
                <VideoChat />
              </ProtectedRoute>
            } />
            <Route path="/learning" element={
              <ProtectedRoute>
                <LearningHubV2 />
              </ProtectedRoute>
            } />
            <Route path="/learning-v1" element={
              <ProtectedRoute>
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