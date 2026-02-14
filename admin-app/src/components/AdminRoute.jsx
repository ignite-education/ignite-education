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
  const { user, isInitialized, userRole } = useAuth();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  // Not authenticated → redirect to main site sign-in
  if (!user) {
    window.location.href = 'https://ignite.education/sign-in?redirect=admin';
    return <LoadingScreen />;
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
