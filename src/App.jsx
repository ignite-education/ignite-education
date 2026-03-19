import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AnimationProvider } from './contexts/AnimationContext'

// Lazy-load LoadingScreen to defer ui-vendor chunk (lottie-react)
const LoadingScreen = lazy(() => import('./components/LoadingScreen'))

// Simple CSS-only loader as fallback while LoadingScreen chunk loads
const SimpleLoader = () => (
  <div className="fixed inset-0 bg-white" />
)

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

  }, []);

  return (
    <BrowserRouter>
      <AnimationProvider>
        <AuthProvider>
          <Suspense fallback={<Suspense fallback={<SimpleLoader />}><LoadingScreen showTimeoutMessage={true} /></Suspense>}>
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
      </AnimationProvider>
    </BrowserRouter>
  )
}

export default App