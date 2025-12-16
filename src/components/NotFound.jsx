import { useNavigate } from 'react-router-dom';
import SEO from './SEO';
import Breadcrumbs from './Breadcrumbs';

const NotFound = () => {
  const navigate = useNavigate();

  const suggestedCourses = [
    {
      title: 'Product Management',
      description: 'Master product strategy, roadmapping, and stakeholder management',
      path: '/welcome',
    },
    {
      title: 'Cyber Security Analyst',
      description: 'Learn threat detection, security analysis, and incident response',
      path: '/welcome',
    },
    {
      title: 'Data Analyst',
      description: 'Master data visualization, SQL, and business intelligence',
      path: '/welcome',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <SEO
        title="Page Not Found - 404"
        description="The page you're looking for doesn't exist. Explore Ignite Education's courses in Product Management, Cyber Security, Data Analysis, and UX Design."
        url="https://ignite.education/404"
      />

      {/* Header */}
      <div className="w-full bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/welcome')}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <img
              src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png"
              alt="Ignite Education Logo"
              className="w-32 h-12 object-contain object-left"
              width="128"
              height="48"
            />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-8">
          <Breadcrumbs customItems={[
            { name: 'Home', href: '/' },
            { name: '404 - Page Not Found' }
          ]} />
        </div>
        <div className="max-w-2xl w-full text-center mx-auto">
          {/* 404 */}
          <h1 className="text-9xl font-bold text-[#ec4899] mb-4">404</h1>

          {/* Message */}
          <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-gray-400 text-lg mb-8">
            Oops! The page you're looking for doesn't exist.
            It might have been moved or deleted.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => navigate('/welcome')}
              className="px-8 py-3 bg-[#ec4899] hover:bg-[#db2777] text-white font-medium rounded-lg transition-colors"
            >
              Go to Homepage
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>

          {/* Suggested Courses */}
          <div className="mt-16">
            <h3 className="text-xl font-semibold mb-6 text-gray-300">
              While you're here, explore our courses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedCourses.map((course, index) => (
                <button
                  key={index}
                  onClick={() => navigate(course.path)}
                  className="p-6 bg-gray-900 hover:bg-gray-800 rounded-lg transition-all hover:scale-105 text-left"
                >
                  <h4 className="text-[#ec4899] font-semibold mb-2">{course.title}</h4>
                  <p className="text-sm text-gray-400">{course.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full bg-gray-900 border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400 text-sm">
          <p>© 2025 Ignite Education. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <span>•</span>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
