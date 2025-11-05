import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { AnimationProvider } from './contexts/AnimationContext'
import LoadingScreen from './components/LoadingScreen'

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
const Certificate = lazy(() => import('./components/Certificate'))

function App() {
  return (
    <BrowserRouter>
      <AnimationProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingScreen showTimeoutMessage={true} />}>
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
            <Route path="/certificate/:certificateId" element={<Certificate />} />
          </Routes>
        </Suspense>
      </AuthProvider>
      </AnimationProvider>
    </BrowserRouter>
  )
}

export default App