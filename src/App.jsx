import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
const Auth = lazy(() => import('./components/Auth'))
const AuthDesign = lazy(() => import('./components/AuthDesign'))
const ResetPassword = lazy(() => import('./components/ResetPassword'))
const CurriculumUploadNew = lazy(() => import('./pages/CurriculumUploadNew'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))
const CoursesDashboard = lazy(() => import('./pages/CoursesDashboard'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Certificate = lazy(() => import('./components/Certificate'))
const CoursePage = lazy(() => import('./pages/CoursePage'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'))
const BlogManagement = lazy(() => import('./pages/BlogManagement'))
const ReleaseNotes = lazy(() => import('./pages/ReleaseNotes'))
const ReleaseNotesManagement = lazy(() => import('./pages/ReleaseNotesManagement'))
const NotFound = lazy(() => import('./components/NotFound'))

// Component to redirect authenticated users away from auth pages
function AuthRoute({ children }) {
  const { user, isInitialized } = useAuth();

  // Don't render anything until auth is initialized to prevent flicker
  if (!isInitialized) {
    return (
      <Suspense fallback={<SimpleLoader />}>
        <LoadingScreen showTimeoutMessage={false} />
      </Suspense>
    );
  }

  // If user is authenticated, redirect to progress page
  if (user) {
    return <Navigate to="/progress" replace />;
  }

  // User is not authenticated, show the auth page
  return children;
}

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
            <Route path="/welcome" element={
              <AuthRoute>
                <Auth />
              </AuthRoute>
            } />
            <Route path="/auth-design" element={
              <AuthRoute>
                <AuthDesign />
              </AuthRoute>
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/release-notes" element={<ReleaseNotes />} />
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
            <Route path="/certificate/:certificateId" element={<Certificate />} />
            <Route path="/courses/:courseSlug" element={<CoursePage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
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