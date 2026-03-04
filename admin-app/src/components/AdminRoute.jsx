import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

/**
 * Route guard that enforces admin/teacher access.
 * - Not authenticated → redirect to ignite.education/sign-in?redirect=admin
 * - Student role → redirect to ignite.education/welcome
 * - Teacher on requireAdmin route → redirect to /curriculum
 * - Admin/Teacher → render children
 */
const AdminRoute = ({ children, requireAdmin = false }) => {
  const { user, isInitialized, userRole, roleError } = useAuth();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  // Not authenticated → redirect to main site sign-in
  if (!user) {
    window.location.href = 'https://ignite.education/sign-in?redirect=admin';
    return <LoadingScreen />;
  }

  // Role fetch failed → show error with recovery options
  if (roleError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white font-medium">Unable to load your account</p>
          <p className="text-gray-400 text-sm">
            We couldn't verify your admin access. This may be a temporary issue.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => { window.location.href = 'https://ignite.education/sign-in?redirect=admin'; }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sign In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Role not yet loaded
  if (userRole === null) {
    return <LoadingScreen />;
  }

  // Student → redirect to main site
  if (userRole === 'student') {
    window.location.href = 'https://ignite.education/welcome';
    return <LoadingScreen />;
  }

  // Teacher trying to access admin-only route
  if (requireAdmin && userRole !== 'admin') {
    return <Navigate to="/curriculum" replace />;
  }

  return children;
};

export default AdminRoute;
