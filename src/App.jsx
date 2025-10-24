import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProgressHub from './components/ProgressHub'
import RedditCallback from './components/RedditCallback'
import LearningHub from './components/LearningHub'
import Auth from './components/Auth'
import ProtectedRoute from './components/ProtectedRoute'
import CurriculumUploadNew from './pages/CurriculumUploadNew'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/welcome" element={<Auth />} />
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
          <Route path="/auth/reddit/callback" element={<RedditCallback />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App