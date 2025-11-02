import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProgressHub from './components/ProgressHub'
import RedditCallback from './components/RedditCallback'
import LinkedInCallback from './components/LinkedInCallback'
import LearningHub from './components/LearningHub'
import Auth from './components/Auth'
import AuthDesign from './components/AuthDesign'
import ResetPassword from './components/ResetPassword'
import ProtectedRoute from './components/ProtectedRoute'
import CurriculumUploadNew from './pages/CurriculumUploadNew'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import CoursesDashboard from './pages/CoursesDashboard'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/welcome" element={<Auth />} />
          <Route path="/auth-design" element={<AuthDesign />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App