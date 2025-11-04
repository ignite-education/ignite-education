import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect } from 'react'
import Lottie from 'lottie-react'
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
const Certificate = lazy(() => import('./components/Certificate'))

// Loading fallback component with Ignite branded animation
const LoadingFallback = () => {
  const [lottieData, setLottieData] = useState(null);
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    // Load Ignite animation for loading screen
    fetch('/icon-animation.json')
      .then(response => response.json())
      .then(data => setLottieData(data))
      .catch(error => console.error('Error loading animation:', error));

    // Show timeout message after 15 seconds
    const timeoutTimer = setTimeout(() => {
      console.warn('Loading took longer than expected');
      setShowTimeout(true);
    }, 15000);

    return () => clearTimeout(timeoutTimer);
  }, []);

  if (showTimeout) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-white text-xl mb-4">Taking longer than expected...</div>
          <div className="text-gray-400 text-sm mb-6">
            There might be a connection issue. Please check your internet connection.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {lottieData && Object.keys(lottieData).length > 0 ? (
        <Lottie
          animationData={lottieData}
          loop={true}
          autoplay={true}
          style={{ width: 200, height: 200 }}
        />
      ) : (
        <div className="w-32 h-32 flex items-center justify-center" />
      )}
    </div>
  );
}

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
            <Route path="/certificate/:certificateId" element={<Certificate />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App