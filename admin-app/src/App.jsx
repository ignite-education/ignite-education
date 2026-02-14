import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';
import LoadingScreen from './components/LoadingScreen';

const CurriculumUpload = lazy(() => import('./pages/CurriculumUpload'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const CoursesDashboard = lazy(() => import('./pages/CoursesDashboard'));
const BlogManagement = lazy(() => import('./pages/BlogManagement'));
const ReleaseNotes = lazy(() => import('./pages/ReleaseNotes'));

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Navigate to="/curriculum" replace />} />

            {/* Teacher + Admin */}
            <Route path="/curriculum" element={
              <AdminRoute>
                <AdminLayout><CurriculumUpload /></AdminLayout>
              </AdminRoute>
            } />

            {/* Admin only */}
            <Route path="/analytics" element={
              <AdminRoute requireAdmin>
                <AdminLayout><AnalyticsDashboard /></AdminLayout>
              </AdminRoute>
            } />
            <Route path="/courses" element={
              <AdminRoute requireAdmin>
                <AdminLayout><CoursesDashboard /></AdminLayout>
              </AdminRoute>
            } />
            <Route path="/blog" element={
              <AdminRoute requireAdmin>
                <AdminLayout><BlogManagement /></AdminLayout>
              </AdminRoute>
            } />
            <Route path="/release-notes" element={
              <AdminRoute requireAdmin>
                <AdminLayout><ReleaseNotes /></AdminLayout>
              </AdminRoute>
            } />

            <Route path="*" element={<Navigate to="/curriculum" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
