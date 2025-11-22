import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';

/**
 * CourseRedirect - SEO-optimized landing pages for individual courses
 * Redirects to /welcome with course parameter to open course modal
 */
const CourseRedirect = () => {
  const navigate = useNavigate();
  const { courseSlug } = useParams();

  // Course metadata for SEO
  const courseData = {
    'product-manager': {
      title: 'Product Management Course - Ignite Education',
      description: 'Master product strategy, roadmapping, stakeholder management, and Agile methodologies. Comprehensive product management training with AI-powered learning.',
      keywords: 'product management course, product manager training, product strategy, product roadmap, agile product management, stakeholder management',
      canonicalUrl: 'https://www.ignite.education/courses/product-manager',
      teaches: ['Product Strategy', 'Product Roadmapping', 'User Research', 'Agile Methodologies', 'Stakeholder Management', 'Product Analytics'],
      duration: 'PT15H',
      level: 'Beginner to Advanced',
    },
    'cyber-security-analyst': {
      title: 'Cyber Security Analyst Course - Ignite Education',
      description: 'Learn threat detection, security analysis, incident response, and network security. Become a certified cyber security professional with hands-on training.',
      keywords: 'cyber security course, security analyst training, threat detection, incident response, network security, cybersecurity certification',
      canonicalUrl: 'https://www.ignite.education/courses/cyber-security-analyst',
      teaches: ['Threat Detection', 'Security Analysis', 'Incident Response', 'Network Security', 'Vulnerability Assessment', 'Security Operations'],
      duration: 'PT20H',
      level: 'Beginner to Advanced',
    },
    'data-analyst': {
      title: 'Data Analyst Course - Ignite Education',
      description: 'Master data visualization, SQL, Python, business intelligence, and statistical analysis. Learn to transform data into actionable insights.',
      keywords: 'data analyst course, data analysis training, SQL course, Python for data analysis, data visualization, business intelligence, statistics',
      canonicalUrl: 'https://www.ignite.education/courses/data-analyst',
      teaches: ['Data Visualization', 'SQL', 'Python for Data Analysis', 'Business Intelligence', 'Statistical Analysis', 'Excel Advanced'],
      duration: 'PT18H',
      level: 'Beginner to Advanced',
    },
    'ux-designer': {
      title: 'UX Designer Course - Ignite Education',
      description: 'Learn user research, wireframing, prototyping, usability testing, and design systems. Master UX design principles and create exceptional user experiences.',
      keywords: 'ux design course, user experience training, ux designer certification, wireframing, prototyping, usability testing, design systems',
      canonicalUrl: 'https://www.ignite.education/courses/ux-designer',
      teaches: ['User Research', 'Wireframing', 'Prototyping', 'Usability Testing', 'Information Architecture', 'Design Systems'],
      duration: 'PT16H',
      level: 'Beginner to Advanced',
    },
  };

  const course = courseData[courseSlug];

  useEffect(() => {
    // Redirect to welcome page with course parameter after brief delay
    // This gives search engines time to index the SEO metadata
    const timer = setTimeout(() => {
      navigate(`/welcome?course=${courseSlug}`, { replace: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [courseSlug, navigate]);

  // Inject Course structured data
  useEffect(() => {
    if (!course) return;

    const courseSchema = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": course.title.replace(' - Ignite Education', ''),
      "description": course.description,
      "provider": {
        "@type": "EducationalOrganization",
        "name": "Ignite Education",
        "url": "https://www.ignite.education"
      },
      "educationalLevel": course.level,
      "courseMode": "online",
      "availableLanguage": "en",
      "teaches": course.teaches,
      "hasCourseInstance": {
        "@type": "CourseInstance",
        "courseMode": "online",
        "courseWorkload": course.duration
      },
      "url": course.canonicalUrl
    };

    let courseScriptTag = document.querySelector('script[data-schema="course-redirect"]');
    if (!courseScriptTag) {
      courseScriptTag = document.createElement('script');
      courseScriptTag.setAttribute('type', 'application/ld+json');
      courseScriptTag.setAttribute('data-schema', 'course-redirect');
      document.head.appendChild(courseScriptTag);
    }
    courseScriptTag.textContent = JSON.stringify(courseSchema);

    // Add BreadcrumbList structured data
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.ignite.education"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Courses",
          "item": "https://www.ignite.education/welcome"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": course.title.replace(' - Ignite Education', ''),
          "item": course.canonicalUrl
        }
      ]
    };

    let breadcrumbScriptTag = document.querySelector('script[data-schema="breadcrumb"]');
    if (!breadcrumbScriptTag) {
      breadcrumbScriptTag = document.createElement('script');
      breadcrumbScriptTag.setAttribute('type', 'application/ld+json');
      breadcrumbScriptTag.setAttribute('data-schema', 'breadcrumb');
      document.head.appendChild(breadcrumbScriptTag);
    }
    breadcrumbScriptTag.textContent = JSON.stringify(breadcrumbSchema);

    // Cleanup on unmount
    return () => {
      const courseTag = document.querySelector('script[data-schema="course-redirect"]');
      if (courseTag) courseTag.remove();
      const breadcrumbTag = document.querySelector('script[data-schema="breadcrumb"]');
      if (breadcrumbTag) breadcrumbTag.remove();
    };
  }, [course]);

  // 404 if course not found
  if (!course) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs customItems={[
            { name: 'Home', href: '/' },
            { name: 'Courses', href: '/welcome' },
            { name: 'Course Not Found' }
          ]} />
          <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">Course Not Found</h1>
              <p className="text-gray-400 mb-6">The course you're looking for doesn't exist.</p>
              <button
                onClick={() => navigate('/welcome')}
                className="px-6 py-3 bg-[#ec4899] hover:bg-[#db2777] text-white font-medium rounded-lg transition-colors"
              >
                Browse All Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO
        title={course.title}
        description={course.description}
        keywords={course.keywords}
        url={course.canonicalUrl}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs customItems={[
          { name: 'Home', href: '/' },
          { name: 'Courses', href: '/welcome' },
          { name: course.title.replace(' - Ignite Education', '').replace(' Course', '') }
        ]} />

        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 border-4 border-[#ec4899] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading course details...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseRedirect;
