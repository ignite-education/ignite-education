import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AnimationProvider } from './contexts/AnimationContext'

// Lazy-load LoadingScreen to defer ui-vendor chunk (lottie-react)
const LoadingScreen = lazy(() => import('./components/LoadingScreen'))

// Simple CSS-only loader as fallback while LoadingScreen chunk loads
const SimpleLoader = () => (
  <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center">
    <div className="w-12 h-12 border-3 border-[#EF0B72] border-t-transparent rounded-full animate-spin" />
  </div>
)

// Lazy load all route components for code splitting
const ProgressHub = lazy(() => import('./components/ProgressHub'))
const RedditCallback = lazy(() => import('./components/RedditCallback'))
const LinkedInCallback = lazy(() => import('./components/LinkedInCallback'))
const LearningHub = lazy(() => import('./components/LearningHub'))
const CurriculumUploadNew = lazy(() => import('./pages/CurriculumUploadNew'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))
const CoursesDashboard = lazy(() => import('./pages/CoursesDashboard'))
const BlogManagement = lazy(() => import('./pages/BlogManagement'))
const ReleaseNotesManagement = lazy(() => import('./pages/ReleaseNotesManagement'))
const ProgressHubV2 = lazy(() => import('./components/ProgressHubV2'))
const NotFound = lazy(() => import('./components/NotFound'))

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
                <ProgressHub />
              </ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute>
                <ProgressHub />
              </ProtectedRoute>
            } />
            <Route path="/progress-v2" element={
              <ProtectedRoute>
                <ProgressHubV2 />
              </ProtectedRoute>
            } />
            <Route path="/learning" element={
              <ProtectedRoute>
                <LearningHub />
              </ProtectedRoute>
            } />
            <Route path="/admin/curriculum" element={
              <ProtectedRoute>
                <CurriculumUploadNew />
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/courses" element={
              <ProtectedRoute>
                <CoursesDashboard />
              </ProtectedRoute>
            } />
            <Route path="/auth/reddit/callback" element={<RedditCallback />} />
            <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
            <Route path="/admin/blog" element={
              <ProtectedRoute>
                <BlogManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/release-notes" element={
              <ProtectedRoute>
                <ReleaseNotesManagement />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
      </AnimationProvider>
    </BrowserRouter>
  )
}

export default App