import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCoachesForCourse } from '../lib/api';
import SEO from '../components/SEO';
import { Home, ChevronRight } from 'lucide-react';
import { getTestimonialForCourse } from '../constants/testimonials';

/**
 * CoursePage - SEO-optimized standalone landing pages for individual courses
 * Dynamically fetches course data from Supabase
 */
const CoursePage = () => {
  const navigate = useNavigate();
  const { courseSlug } = useParams();

  // State
  const [course, setCourse] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typedTitle, setTypedTitle] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Fetch course data on mount
  useEffect(() => {
    fetchCourseData();
  }, [courseSlug]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch course by name/slug from courses table
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('name', courseSlug)
        .in('status', ['live', 'coming_soon'])
        .single();

      if (courseError || !courseData) {
        setError('Course not found');
        setLoading(false);
        return;
      }

      setCourse(courseData);

      // Fetch coaches for this course
      try {
        const coachesData = await getCoachesForCourse(courseSlug);
        setCoaches(coachesData || []);
      } catch (coachError) {
        console.error('Error fetching coaches:', coachError);
        setCoaches([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading course:', err);
      setError('Unable to load course. Please try again later.');
      setLoading(false);
    }
  };

  // Typing animation for title (75ms per character, 1 second delay)
  useEffect(() => {
    if (!course) return;

    let currentIndex = 0;
    const titleText = course.title;

    const timeoutId = setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (currentIndex <= titleText.length) {
          setTypedTitle(titleText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTypingComplete(true);
        }
      }, 75);

      return () => clearInterval(typingInterval);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [course]);

  // Helper function to generate AI-powered module intro based on lesson content
  const generateModuleIntro = (module) => {
    if (!module?.lessons || module.lessons.length === 0) {
      return "Comprehensive content designed to enhance your skills. Build practical expertise in this essential area.";
    }

    const moduleName = module.name || '';
    const lessonNames = module.lessons.map(l => l.name.toLowerCase()).join(' ');
    const lowerModuleName = moduleName.toLowerCase();

    // Generate contextual intro based on module name and actual lesson topics
    if (lowerModuleName.includes('foundation') || lowerModuleName.includes('fundamental')) {
      if (lessonNames.includes('role') || lessonNames.includes('responsibilit')) {
        return `Master the core responsibilities and key competencies that define professional success in this field. Build essential knowledge of industry practices, methodologies, and best practices.`;
      }
      if (lessonNames.includes('lifecycle') || lessonNames.includes('process')) {
        return `Understand fundamental processes, workflows, and lifecycle management from start to finish. Develop a comprehensive framework for approaching work systematically and effectively.`;
      }
      if (lessonNames.includes('stakeholder') || lessonNames.includes('management')) {
        return `Learn essential principles of stakeholder engagement, relationship management, and collaborative work. Build foundational skills for effective communication and cross-functional cooperation.`;
      }
      if (lessonNames.includes('research') || lessonNames.includes('analysis')) {
        return `Develop fundamental research and analytical capabilities to gather insights and inform decisions. Master core methodologies for understanding problems and identifying solutions.`;
      }
      return `Build a comprehensive foundation in essential concepts, principles, and practices. Develop core competencies and fundamental knowledge that supports all advanced work in this field.`;
    }

    // Cybersecurity specific modules
    if (lowerModuleName.includes('security') || lowerModuleName.includes('cybersecurity')) {
      if (lowerModuleName.includes('network')) {
        return `Master network security principles, protocols, and defensive techniques to protect against cyber threats. Learn to implement firewalls, detect intrusions, and secure network infrastructure.`;
      }
      if (lowerModuleName.includes('cloud')) {
        return `Develop expertise in cloud security architecture, data protection, and compliance frameworks for modern environments. Learn to secure cloud deployments, manage access controls, and implement best practices.`;
      }
      if (lowerModuleName.includes('ethical') || lowerModuleName.includes('penetration') || lowerModuleName.includes('testing')) {
        return `Learn ethical hacking methodologies and penetration testing techniques to identify vulnerabilities before attackers do. Develop skills in reconnaissance, exploitation, and security assessment.`;
      }
      if (lowerModuleName.includes('incident') || lowerModuleName.includes('response')) {
        return `Master incident response procedures, threat detection, and recovery strategies for security breaches. Learn to investigate attacks, contain threats, and restore normal operations.`;
      }
      if (lowerModuleName.includes('governance') || lowerModuleName.includes('compliance') || lowerModuleName.includes('risk')) {
        return `Understand security governance frameworks, compliance requirements, and risk management methodologies. Learn to develop security policies, conduct audits, and ensure regulatory compliance.`;
      }
      if (lowerModuleName.includes('threat') || lowerModuleName.includes('intelligence')) {
        return `Develop threat intelligence capabilities to identify, analyze, and respond to emerging cyber threats. Learn to leverage threat data, assess risks, and implement proactive defenses.`;
      }
      return `Build comprehensive cybersecurity knowledge to protect systems, data, and networks from evolving threats. Develop practical skills in security implementation, monitoring, and incident management.`;
    }

    // Marketing specific modules
    if (lowerModuleName.includes('marketing') || lowerModuleName.includes('digital marketing')) {
      if (lowerModuleName.includes('social') || lowerModuleName.includes('social media')) {
        return `Master social media marketing strategies, content creation, and community engagement techniques. Learn to build brand presence, drive engagement, and measure social media ROI.`;
      }
      if (lowerModuleName.includes('seo') || lowerModuleName.includes('search')) {
        return `Learn search engine optimization techniques to improve website visibility and organic traffic. Master keyword research, on-page optimization, and link building strategies.`;
      }
      if (lowerModuleName.includes('content')) {
        return `Develop content marketing expertise to create compelling stories that attract and engage audiences. Learn to plan, produce, and distribute content that drives business results.`;
      }
      if (lowerModuleName.includes('analytics') || lowerModuleName.includes('measurement')) {
        return `Master marketing analytics tools and techniques to measure campaign performance and ROI. Learn to interpret data, generate insights, and optimize marketing strategies.`;
      }
      return `Build comprehensive digital marketing skills to reach audiences, drive engagement, and achieve business goals. Learn to create integrated campaigns across multiple channels.`;
    }

    if (lowerModuleName.includes('strategic') || lowerModuleName.includes('planning') || lowerModuleName.includes('thinking')) {
      if (lessonNames.includes('roadmap') || lessonNames.includes('vision')) {
        return `Master strategic vision and roadmapping techniques to align product development with business objectives. Learn to identify market opportunities and translate them into actionable product strategies.`;
      }
      if (lessonNames.includes('priorit')) {
        return `Learn proven frameworks for strategic prioritization and effective resource allocation across product initiatives. Develop decision-making skills to balance competing demands and maximize business impact.`;
      }
      return `Develop strategic thinking capabilities for product planning, competitive positioning, and long-term business success. Master frameworks for analyzing market dynamics and creating winning product strategies.`;
    }

    if (lowerModuleName.includes('execution') || lowerModuleName.includes('implementation') || lowerModuleName.includes('delivery')) {
      return `Master practical execution strategies to turn plans into reality and deliver results on time. Learn agile methodologies, project management techniques, and ways to overcome common obstacles.`;
    }

    if (lowerModuleName.includes('stakeholder') || lowerModuleName.includes('influence') || lowerModuleName.includes('leadership')) {
      return `Develop strategies for effective stakeholder management, influence, and building consensus across diverse audiences. Learn to navigate complex organizational dynamics and secure buy-in for your initiatives.`;
    }

    if (lowerModuleName.includes('market') || lowerModuleName.includes('research') || lowerModuleName.includes('customer')) {
      return `Discover methodologies to understand market dynamics, customer needs, and competitive landscapes. Learn to conduct effective research that informs strategic decisions and product direction.`;
    }

    if (lowerModuleName.includes('technical') || lowerModuleName.includes('tool')) {
      if (lessonNames.includes('python') || lessonNames.includes('code') || lessonNames.includes('programming')) {
        return `Build hands-on technical skills with practical coding exercises and real-world implementation techniques. Develop proficiency in writing clean, efficient code for professional applications.`;
      }
      return `Gain proficiency in essential technical tools and methodologies used by industry professionals. Learn to leverage technology effectively for improved productivity and results.`;
    }

    if (lowerModuleName.includes('analysis') || lowerModuleName.includes('data') || lowerModuleName.includes('analyt')) {
      if (lessonNames.includes('statistics') || lessonNames.includes('statistical')) {
        return `Master statistical methods and analytical techniques to extract meaningful insights from complex datasets. Learn to apply rigorous mathematical approaches to solve real-world business problems.`;
      }
      if (lessonNames.includes('sql') || lessonNames.includes('database')) {
        return `Develop database querying skills and learn to manipulate, analyze, and extract valuable information from data sources. Master SQL fundamentals to efficiently retrieve and transform data for analysis.`;
      }
      if (lessonNames.includes('visualization') || lessonNames.includes('visualisation')) {
        return `Transform raw data into compelling visual stories that drive informed decision-making and stakeholder engagement. Learn to create clear, impactful charts and dashboards that communicate insights effectively.`;
      }
      return `Build analytical expertise through data-driven approaches, interpretation techniques, and evidence-based decision frameworks. Develop skills to turn data into actionable insights that drive business value.`;
    }

    if (lowerModuleName.includes('design') || lowerModuleName.includes('ux') || lowerModuleName.includes('ui')) {
      if (lessonNames.includes('research') || lessonNames.includes('user research')) {
        return `Discover user research methodologies to understand customer needs, behaviors, and pain points for better product outcomes. Learn to conduct interviews, usability tests, and gather insights that inform design decisions.`;
      }
      if (lessonNames.includes('wireframe') || lessonNames.includes('prototype')) {
        return `Learn to create effective wireframes and prototypes that communicate design concepts and validate solutions early. Master rapid prototyping techniques to test ideas and gather feedback before full development.`;
      }
      return `Explore user-centered design principles, interaction patterns, and best practices for creating intuitive digital experiences. Develop skills to design products that delight users and meet business objectives.`;
    }

    if (lowerModuleName.includes('communication') || lowerModuleName.includes('presentation')) {
      if (lessonNames.includes('stakeholder')) {
        return `Develop strategies for effective stakeholder management, influence, and building consensus across diverse audiences. Learn to navigate complex organizational dynamics and secure buy-in for your initiatives.`;
      }
      return `Enhance your ability to communicate complex ideas clearly, present with confidence, and engage stakeholders effectively. Master techniques for persuasive storytelling and impactful professional communication.`;
    }

    if (lowerModuleName.includes('career') || lowerModuleName.includes('professional') || lowerModuleName.includes('development')) {
      if (lessonNames.includes('interview') || lessonNames.includes('job')) {
        return `Prepare for career advancement with interview strategies, resume optimization, and techniques to stand out in the job market. Learn to showcase your skills effectively and navigate the hiring process with confidence.`;
      }
      if (lessonNames.includes('portfolio')) {
        return `Build a compelling professional portfolio that showcases your skills, projects, and value to potential employers. Learn to curate and present your work in ways that demonstrate impact and expertise.`;
      }
      return `Advance your professional journey with career development strategies, networking techniques, and industry success pathways. Build the skills and mindset needed to achieve your long-term career goals.`;
    }

    if (lowerModuleName.includes('excel') || lowerModuleName.includes('spreadsheet')) {
      return `Master spreadsheet analysis, formulas, and data manipulation techniques for efficient business intelligence and reporting. Learn advanced Excel features to automate workflows and create powerful analytical tools.`;
    }

    if (lowerModuleName.includes('sql') || lowerModuleName.includes('database')) {
      return `Learn to write powerful queries, manage databases, and extract insights from structured data using industry-standard SQL. Develop proficiency in data retrieval, joins, and aggregations for complex analytical tasks.`;
    }

    if (lowerModuleName.includes('python')) {
      if (lessonNames.includes('pandas') || lessonNames.includes('numpy')) {
        return `Harness Python's data analysis libraries to clean, transform, and analyze datasets with professional-grade techniques. Master pandas and NumPy for efficient data manipulation and computational tasks.`;
      }
      return `Develop Python programming skills for automation, data manipulation, and solving real-world analytical challenges. Learn to write efficient, scalable code for professional data analysis workflows.`;
    }

    if (lowerModuleName.includes('business intelligence') || lowerModuleName.includes('bi')) {
      return `Transform data into actionable business insights using modern BI tools, dashboards, and reporting frameworks. Learn to design and build analytics solutions that drive strategic decision-making.`;
    }

    if (lowerModuleName.includes('metrics') || lowerModuleName.includes('measurement') || lowerModuleName.includes('kpi')) {
      return `Learn to define, track, and analyze key performance indicators that measure product success and business impact. Develop data-driven approaches to make informed decisions and demonstrate value.`;
    }

    if (lowerModuleName.includes('agile') || lowerModuleName.includes('scrum') || lowerModuleName.includes('sprint')) {
      return `Master agile methodologies and frameworks for efficient product development and team collaboration. Learn to run effective sprints, manage backlogs, and deliver value iteratively.`;
    }

    // Generic fallback
    return `Build comprehensive knowledge and practical skills in this essential professional domain. Develop expertise through hands-on learning and real-world application of key concepts.`;
  };

  // Get first sentence of description for excerpt
  const getDescriptionExcerpt = (description) => {
    if (!description) return '';
    const firstSentenceEnd = description.indexOf('. ');
    if (firstSentenceEnd !== -1) {
      return description.substring(0, firstSentenceEnd + 1);
    }
    return description;
  };

  // Generate SEO keywords from course data
  const generateKeywords = (courseData) => {
    const baseKeywords = [
      courseData.title,
      `${courseData.title} course`,
      `${courseData.title} training`,
      'online course',
      'professional development',
      'career training',
      'Ignite Education'
    ];
    return baseKeywords.join(', ');
  };

  // Generate structured data for SEO
  const generateCourseStructuredData = (courseData) => {
    const teaches = courseData.module_structure?.map(m => m.name) || [];

    return {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": courseData.title,
      "description": courseData.description,
      "provider": {
        "@type": "EducationalOrganization",
        "name": "Ignite Education",
        "url": "https://www.ignite.education"
      },
      "educationalLevel": "Beginner to Advanced",
      "courseMode": "online",
      "availableLanguage": "en",
      "teaches": teaches,
      "isAccessibleForFree": true,
      "hasCourseInstance": {
        "@type": "CourseInstance",
        "courseMode": "online",
        "courseWorkload": `PT${courseData.lessons || 10}H`
      },
      "url": `https://www.ignite.education/courses/${courseSlug}`
    };
  };

  // Get testimonial for this course
  const testimonial = getTestimonialForCourse(courseSlug);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-black">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="inline-block">
              <div
                className="w-32 h-10 bg-contain bg-no-repeat bg-left"
                style={{
                  backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)'
                }}
              />
            </Link>
            <a href="https://ignite.education" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
              <span className="text-white text-sm font-medium">Discover</span>
              <div className="bg-white rounded-md flex items-center justify-center" style={{ width: '25px', height: '25px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-[#EF0B72] transition-colors">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </a>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 border-4 border-[#EF0B72] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading course...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error/404 state
  if (error || !course) {
    return (
      <div className="min-h-screen bg-black">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-black">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="inline-block">
              <div
                className="w-32 h-10 bg-contain bg-no-repeat bg-left"
                style={{
                  backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)'
                }}
              />
            </Link>
            <a href="https://ignite.education" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
              <span className="text-white text-sm font-medium">Discover</span>
              <div className="bg-white rounded-md flex items-center justify-center" style={{ width: '25px', height: '25px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-[#EF0B72] transition-colors">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-7" style={{ color: '#F0F0F2' }}>
            <Link to="/" className="hover:text-[#EF0B72] transition-colors flex items-center" style={{ color: '#F0F0F2' }}>
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4" style={{ color: '#F0F0F2' }} />
            <Link to="/welcome" className="hover:text-[#EF0B72] transition-colors" style={{ color: '#F0F0F2' }}>Courses</Link>
            <ChevronRight className="w-4 h-4" style={{ color: '#F0F0F2' }} />
            <span style={{ color: '#F0F0F2' }}>Course Not Found</span>
          </nav>

          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">Course Not Found</h1>
              <p className="text-gray-400 mb-6">The course you're looking for doesn't exist or is no longer available.</p>
              <button
                onClick={() => navigate('/welcome')}
                className="px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] text-white font-medium rounded-lg transition-colors"
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
    <>
      <SEO
        title={`${course.title} Course - Ignite Education`}
        description={course.description}
        keywords={generateKeywords(course)}
        url={`https://www.ignite.education/courses/${courseSlug}`}
        type="course"
        structuredData={generateCourseStructuredData(course)}
      />

      <div className="min-h-screen bg-black">
        {/* Sticky Top Navigation Bar */}
        <div className="sticky top-0 z-50 bg-black">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="inline-block">
              <div
                className="w-32 h-10 bg-contain bg-no-repeat bg-left"
                style={{
                  backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)'
                }}
              />
            </Link>
            <a href="https://ignite.education" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
              <span className="text-white text-sm font-medium">Discover</span>
              <div className="bg-white rounded-md flex items-center justify-center" style={{ width: '25px', height: '25px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-[#EF0B72] transition-colors">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </a>
          </div>
        </div>

        {/* Hero Section with Black Background */}
        <div className="bg-black">
          <div className="max-w-4xl mx-auto px-6 py-12 flex justify-center">
            <div className="w-full" style={{ maxWidth: '762px' }}>
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center gap-2 text-sm mb-7" style={{ color: '#F0F0F2' }}>
                <Link to="/" className="hover:text-[#EF0B72] transition-colors flex items-center" style={{ color: '#F0F0F2' }}>
                  <Home className="w-4 h-4" />
                </Link>
                <ChevronRight className="w-4 h-4" style={{ color: '#F0F0F2' }} />
                <Link to="/welcome" className="hover:text-[#EF0B72] transition-colors" style={{ color: '#F0F0F2' }}>Courses</Link>
                <ChevronRight className="w-4 h-4" style={{ color: '#F0F0F2' }} />
                <span style={{ color: '#F0F0F2' }}>{course.title}</span>
              </nav>

              {/* Title with typing animation */}
              <h1 className="text-5xl font-bold text-white mb-3.5 leading-tight text-left">
                {typedTitle}
                {!isTypingComplete && <span className="animate-pulse text-white" style={{ fontWeight: 300 }}>|</span>}
              </h1>

              {/* Subtitle/Excerpt - Ignite Pink */}
              <p className="text-xl text-[#EF0B72] mb-3.5 leading-relaxed text-left">
                {getDescriptionExcerpt(course.description)}
              </p>
            </div>
          </div>
        </div>

        {/* White Content Section */}
        <div className="bg-white">
          <div className="max-w-4xl mx-auto px-6 py-12 flex justify-center">
            <div className="w-full" style={{ maxWidth: '762px' }}>

              {/* Full Course Description */}
              <div className="mb-8">
                <p className="text-gray-700 text-lg leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Course Benefits */}
              <div className="mb-8 grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700 leading-tight">Certificate upon<br/>completion</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700 leading-tight">Taught by industry<br/>expert instructors</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700 leading-tight">Self-paced<br/>learning</span>
                </div>
              </div>

              {/* Curriculum Section */}
              {course.module_structure && Array.isArray(course.module_structure) && course.module_structure.length > 0 && (
                <div className="mb-8 bg-[#F0F0F2] p-6 rounded-lg">
                  <h2 className="font-semibold text-gray-900 text-2xl mb-4">Curriculum</h2>
                  <div className="space-y-6">
                    {course.module_structure.map((module, moduleIndex) => (
                      <div key={moduleIndex}>
                        {/* Module Title */}
                        <h3 className="font-semibold mb-1" style={{ fontSize: '18px', color: '#7714E0' }}>
                          Module {moduleIndex + 1} - {module.name}
                        </h3>

                        {/* Module Description and Lessons */}
                        <div>
                          {/* AI-Generated Module Intro */}
                          <p className="text-gray-900 mb-3" style={{ fontSize: '15px' }}>
                            {generateModuleIntro(module)}
                          </p>

                          {/* Lesson List */}
                          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '0.4rem' }}>
                            {(module.lessons || []).map((lesson, lessonIndex) => (
                              <li key={lessonIndex} className="flex items-center gap-2" style={{ fontSize: '14px' }}>
                                <span className="text-gray-900" style={{ fontSize: '0.5em' }}>&#9632;</span>
                                <span className="font-medium text-gray-900">{lesson.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonials Section */}
              <div className="mb-8">
                <h2 className="font-semibold text-gray-900 text-2xl mb-4">What Our Students Say</h2>
                <div className="bg-[#F0F0F2] p-6 rounded-lg">
                  {testimonial.isPlaceholder ? (
                    <p className="text-gray-600 italic text-lg">{testimonial.quote}</p>
                  ) : (
                    <div>
                      <p className="text-gray-900 text-lg font-medium mb-4">
                        "{testimonial.quote}"
                      </p>
                      <div className="flex items-center gap-3">
                        {testimonial.avatar && (
                          <img
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{testimonial.name}</p>
                          {testimonial.role && <p className="text-sm text-gray-600">{testimonial.role}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Coaches Section */}
              {coaches.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-semibold text-gray-900 text-2xl mb-4">Course Leaders</h2>
                  <div className="flex flex-col gap-4">
                    {coaches.map((coach, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        {coach.linkedin_url ? (
                          <a
                            href={coach.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex gap-4 items-start flex-1 group"
                          >
                            {coach.image_url ? (
                              <img
                                src={coach.image_url}
                                alt={`${coach.name}${coach.position ? `, ${coach.position}` : ''} - Course instructor at Ignite Education`}
                                className="w-16 h-16 rounded object-cover flex-shrink-0"
                                loading="lazy"
                                width="64"
                                height="64"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded bg-gray-200 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-black" style={{ fontSize: '14px', lineHeight: '1.3', marginBottom: '0px' }}>
                                {coach.name}
                              </h4>
                              {coach.position && (
                                <p className="text-black font-medium" style={{ fontSize: '12px', lineHeight: '1.3', opacity: 0.9, marginBottom: '2px' }}>
                                  {coach.position}
                                </p>
                              )}
                              {coach.description && (
                                <p className="text-black" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                                  {coach.description}
                                </p>
                              )}
                            </div>
                          </a>
                        ) : (
                          <div className="flex gap-4 items-start flex-1">
                            {coach.image_url ? (
                              <img
                                src={coach.image_url}
                                alt={`${coach.name}${coach.position ? `, ${coach.position}` : ''} - Course instructor at Ignite Education`}
                                className="w-16 h-16 rounded object-cover flex-shrink-0"
                                loading="lazy"
                                width="64"
                                height="64"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded bg-gray-200 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-black" style={{ fontSize: '14px', lineHeight: '1.3', marginBottom: '0px' }}>
                                {coach.name}
                              </h4>
                              {coach.position && (
                                <p className="text-black font-medium" style={{ fontSize: '12px', lineHeight: '1.3', opacity: 0.9, marginBottom: '2px' }}>
                                  {coach.position}
                                </p>
                              )}
                              {coach.description && (
                                <p className="text-black" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                                  {coach.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Get Started CTA Button */}
              <div className="mt-12 mb-8 text-center">
                <Link
                  to="/welcome"
                  className="inline-block px-8 py-4 bg-[#EF0B72] hover:bg-[#D10A64] text-white font-semibold rounded-lg transition-colors text-lg"
                >
                  Get Started - It's Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CoursePage;
