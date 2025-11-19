import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = ({ customItems = null }) => {
  const location = useLocation();

  // If custom items provided, use those
  if (customItems) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-gray-400">
        {customItems.map((item, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
            {item.href ? (
              <Link to={item.href} className="hover:text-white transition-colors">
                {item.name}
              </Link>
            ) : (
              <span className="text-white">{item.name}</span>
            )}
          </div>
        ))}
      </nav>
    );
  }

  // Auto-generate breadcrumbs from current path
  const pathnames = location.pathname.split('/').filter(x => x);

  // Don't show breadcrumbs on homepage
  if (pathnames.length === 0) return null;

  // Map route names to display names
  const routeNames = {
    'welcome': 'Welcome',
    'progress': 'Progress Hub',
    'learning': 'Learning Hub',
    'privacy': 'Privacy Policy',
    'terms': 'Terms of Service',
    'reset-password': 'Reset Password',
    'certificate': 'Certificate',
    'admin': 'Admin',
    'analytics': 'Analytics',
    'curriculum': 'Curriculum',
    'courses': 'Courses',
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-gray-400 mb-6">
      {/* Home */}
      <Link to="/" className="hover:text-white transition-colors flex items-center">
        <Home className="w-4 h-4" />
        <span className="ml-1">Home</span>
      </Link>

      {/* Path segments */}
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <div key={routeTo} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-2" />
            {isLast ? (
              <span className="text-white font-medium">{displayName}</span>
            ) : (
              <Link to={routeTo} className="hover:text-white transition-colors">
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
