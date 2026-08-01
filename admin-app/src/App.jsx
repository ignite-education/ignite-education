import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';
import LoadingScreen from './components/LoadingScreen';

const CurriculumUpload = lazy(() => import('./pages/CurriculumUpload'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const BlogManagement = lazy(() => import('./pages/BlogManagement'));
const ReleaseNotes = lazy(() => import('./pages/ReleaseNotes'));
const PromptsManagement = lazy(() => import('./pages/PromptsManagement'));
const ResourcesManagement = lazy(() => import('./pages/ResourcesManagement'));
const NotificationsManagement = lazy(() => import('./pages/NotificationsManagement'));
const OfficeHours = lazy(() => import('./pages/office-hours/index'));

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Navigate to="/courses" replace />} />

            {/* Teacher + Admin.
                Courses, lessons, requests and coaches are all one page — the
                old standalone /courses dashboard duplicated course CRUD without
                writing module_structure, so courses created there had no
                outline. /curriculum redirects for existing bookmarks. */}
            <Route path="/courses" element={
              <AdminRoute>
                <AdminLayout><CurriculumUpload /></AdminLayout>
              </AdminRoute>
            } />
            <Route path="/curriculum" element={<Navigate to="/courses" replace />} />
            <Route path="/office-hours" element={
              <AdminRoute>
                <AdminLayout><OfficeHours /></AdminLayout>
              </AdminRoute>
            } />

            {/* Admin only */}
            <Route path="/analytics" element={
              <AdminRoute requireAdmin>
                <AdminLayout><AnalyticsDashboard /></AdminLayout>
              </AdminRoute>
            } />
            <Route path="/blog" element={
              <AdminRoute requireAdmin>
                <AdminLayout><BlogManagement /></AdminLayout>
              </AdminRoute>
            } />
            <Route path="/prompts" element={
              <AdminRoute requireAdmin>
                <AdminLayout><PromptsManagement /></AdminLayout>
              </AdminRoute>
            } />
            <Route path="/release-notes" element={
              <AdminRoute requireAdmin>
                <AdminLayout><ReleaseNotes /></AdminLayout>
              </AdminRoute>
            } />

            <Route path="/resources" element={
              <AdminRoute requireAdmin>
                <AdminLayout><ResourcesManagement /></AdminLayout>
              </AdminRoute>
            } />

            <Route path="/notifications" element={
              <AdminRoute requireAdmin>
                <AdminLayout><NotificationsManagement /></AdminLayout>
              </AdminRoute>
            } />

            <Route path="*" element={<Navigate to="/courses" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
