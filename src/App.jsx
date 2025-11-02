import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

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

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/welcome" element={<Auth />} />
            <Route path="/auth-design" element={<AuthDesign />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
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
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App