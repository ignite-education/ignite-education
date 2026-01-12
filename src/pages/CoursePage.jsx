import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCoachesForCourse } from '../lib/api';
import SEO, { generateSpeakableSchema } from '../components/SEO';
import { X, ChevronRight, Star } from 'lucide-react';
import { getTestimonialForCourse } from '../constants/testimonials';
import { generateCourseKeywords } from '../constants/courseKeywords';
import { useAuth } from '../contexts/AuthContext';

import OptimizedImage from '../components/OptimizedImage';
import GoogleOneTap from '../components/GoogleOneTap';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

// Cache TTL: 1 hour
const CACHE_TTL = 60 * 60 * 1000;

const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
  } catch (e) {
    // Ignore cache errors
  }
  return null;
};

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignore cache errors (e.g., quota exceeded)
  }
};

/**
 * Get the display label for course type tag
 * For subjects, use the category field; for other types, display formatted course_type
 */
const getCourseTypeLabel = (course) => {
  if (!course) return 'Course';

  // For subjects, use the category field
  if (course.course_type === 'subject') {
    return course.category || 'Course';
  }

  // For other types, display the formatted course_type
  const typeLabels = {
    'specialism': 'Specialism',
    'skill': 'Skill'
  };

  return typeLabels[course.course_type] || course.category || 'Course';
};

/**
 * CoursePage - SEO-optimized standalone landing pages for individual courses
 * Dynamically fetches course data from Supabase
 */
const CoursePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseSlug } = useParams();
  const { user } = useAuth();

  // State
  const [course, setCourse] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(0);

  // Become a course leader modal state
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [leaderForm, setLeaderForm] = useState({ name: '', email: '', linkedin: '' });

  // Register interest modal state (for coming_soon courses)
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestForm, setInterestForm] = useState({ email: '' });
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);

  // Waitlist success notification state
  const [showWaitlistSuccess, setShowWaitlistSuccess] = useState(false);

  // Priority access state (from launch notification email)
  const [hasPriorityAccess, setHasPriorityAccess] = useState(false);
  const [priorityValidating, setPriorityValidating] = useState(false);

  // Refs
  const curriculumSectionRef = useRef(null);

  // Check for waitlist success on mount (after OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('waitlisted') === 'true') {
      setShowWaitlistSuccess(true);
      // Clear the query param from URL without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowWaitlistSuccess(false), 5000);
    }
  }, [location.search]);

  // Check for priority token from launch notification email
  useEffect(() => {
    const validatePriorityToken = async () => {
      const params = new URLSearchParams(location.search);
      const priorityToken = params.get('priority');

      if (!priorityToken) {
        // Check if we already have a stored priority token for this course
        const storedToken = sessionStorage.getItem('priorityEnrollmentToken');
        const storedCourse = sessionStorage.getItem('priorityEnrollmentCourse');
        if (storedToken && storedCourse === courseSlug) {
          setHasPriorityAccess(true);
        }
        return;
      }

      setPriorityValidating(true);

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';
        const response = await fetch(`${API_URL}/api/validate-priority-token?token=${priorityToken}`);
        const data = await response.json();

        if (data.valid) {
          // Store token and course for enrollment flow
          sessionStorage.setItem('priorityEnrollmentToken', priorityToken);
          sessionStorage.setItem('priorityEnrollmentCourse', courseSlug);
          setHasPriorityAccess(true);

          // Clear the query param from URL without reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        } else {
          console.log('Priority token invalid:', data.error);
          // Clear any stale stored tokens
          sessionStorage.removeItem('priorityEnrollmentToken');
          sessionStorage.removeItem('priorityEnrollmentCourse');
        }
      } catch (error) {
        console.error('Error validating priority token:', error);
      } finally {
        setPriorityValidating(false);
      }
    };

    validatePriorityToken();
  }, [location.search, courseSlug]);

  // Convert URL slug to possible database name formats
  const slugToNameVariations = (slug) => {
    // Return array of possible name formats to try
    return [
      slug, // exact match (e.g., "product-manager")
      slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), // Title Case with spaces (e.g., "Product Manager")
      slug.replace(/-/g, ' '), // lowercase with spaces
    ];
  };

  // Fetch course data on mount
  useEffect(() => {
    fetchCourseData();
  }, [courseSlug]);

  const fetchCourseData = async () => {
    try {
      setError(null);

      // Check cache first for instant load
      const cacheKey = `course_${courseSlug}`;
      const cachedCourse = getCachedData(cacheKey);
      const cachedCoaches = getCachedData(`coaches_${courseSlug}`);

      if (cachedCourse) {
        setCourse(cachedCourse);
        setCoaches(cachedCoaches || []);
        setLoading(false);
        // Refresh in background
        refreshCourseData();
        return;
      }

      setLoading(true);

      // Get all possible name variations for the slug
      const nameVariations = slugToNameVariations(courseSlug);

      // Fetch course and coaches in parallel
      const [courseResult, coachesResult] = await Promise.all([
        // Course query with better fallback using ilike
        supabase
          .from('courses')
          .select('*')
          .in('name', nameVariations)
          .in('status', ['live', 'coming_soon'])
          .limit(1)
          .maybeSingle(),
        // Coaches query runs in parallel
        getCoachesForCourse(courseSlug).catch(() => [])
      ]);

      let courseData = courseResult.data;

      // If first query didn't find course, try fuzzy match
      if (!courseData) {
        const normalizedSlug = courseSlug.toLowerCase().replace(/-/g, ' ');
        const { data: fuzzyResult } = await supabase
          .from('courses')
          .select('*')
          .ilike('name', `%${normalizedSlug}%`)
          .in('status', ['live', 'coming_soon'])
          .limit(1)
          .maybeSingle();

        courseData = fuzzyResult;
      }

      if (!courseData) {
        setError('Course not found');
        setLoading(false);
        return;
      }

      // Cache the data
      setCachedData(cacheKey, courseData);
      setCachedData(`coaches_${courseSlug}`, coachesResult);

      setCourse(courseData);
      setCoaches(coachesResult || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading course:', err);
      setError('Unable to load course. Please try again later.');
      setLoading(false);
    }
  };

  // Background refresh to keep cache fresh
  const refreshCourseData = async () => {
    try {
      const nameVariations = slugToNameVariations(courseSlug);

      const [courseResult, coachesResult] = await Promise.all([
        supabase
          .from('courses')
          .select('*')
          .in('name', nameVariations)
          .in('status', ['live', 'coming_soon'])
          .limit(1)
          .maybeSingle(),
        getCoachesForCourse(courseSlug).catch(() => [])
      ]);

      if (courseResult.data) {
        setCachedData(`course_${courseSlug}`, courseResult.data);
        setCachedData(`coaches_${courseSlug}`, coachesResult);
        setCourse(courseResult.data);
        setCoaches(coachesResult || []);
      }
    } catch (err) {
      // Silent fail for background refresh
    }
  };

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

  // Get first two sentences of description
  const getTwoSentences = (description) => {
    if (!description) return '';
    const sentences = description.match(/[^.!?]*[.!?]+/g) || [description];
    return sentences.slice(0, 2).join('').trim();
  };

  // FAQ data for both display and structured data
  const COURSE_FAQS = [
    {
      question: 'What is Ignite?',
      answer: 'Ignite gives you free, expert-led courses in high-demand careers like Product Management and Cybersecurity, so you can build the skills that actually get you hired in today\'s competitive job market.'
    },
    {
      question: 'Who is Ignite for?',
      answer: 'Ignite is for anyone ready to level up their career, especially students, recent graduates, and young professionals looking to break into competitive fields, switch careers, or gain new skills quickly.'
    },
    {
      question: 'How much does Ignite cost?',
      answer: 'Ignite courses are completely free, supported by limited advertising. Want an ad-free experience plus exclusive access to industry professionals and curated job opportunities? Upgrade for just 99p/week.'
    },
    {
      question: 'What can I learn on Ignite?',
      answer: 'We offer comprehensive courses in Product Management and Cyber Security, with more fields launching soon. Each course includes interactive lessons, knowledge checks and certification to boost your CV.'
    },
    {
      question: 'Can I learn at my own pace?',
      answer: 'Absolutely. Ignite courses are self-paced, so you can learn when and where it works best for you. We suggest completing 2 to 4 lessons per week for the best results and maximum knowledge retention.'
    },
    {
      question: 'What makes Ignite different?',
      answer: 'Unlike other platforms, Ignite is completely free with no paywalls or hidden costs. We focus on practical, industry-relevant skills that employers actually want, not just theory. Our courses get you job-ready, fast.'
    }
  ];

  // Generate Course structured data for SEO - enhanced with instructors and additional properties
  const generateCourseStructuredData = (courseData, courseCoaches) => {
    const baseUrl = 'https://ignite.education';

    // Extract skills from curriculum (module names + lesson names)
    const teaches = courseData.module_structure?.flatMap(m => [
      m.name,
      ...(m.lessons?.map(l => l.name) || [])
    ]) || [];

    // Calculate total lessons for duration estimate
    const totalLessons = courseData.module_structure?.reduce(
      (acc, m) => acc + (m.lessons?.length || 0), 0
    ) || 10;

    return {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": courseData.title,
      "description": courseData.description,
      "url": `${baseUrl}/courses/${courseSlug}`,
      "image": courseData.image_url || `${baseUrl}/og-image.png`,
      "provider": {
        "@type": "EducationalOrganization",
        "name": "Ignite Education",
        "url": baseUrl,
        "sameAs": [
          "https://www.linkedin.com/school/ignite-courses"
        ]
      },
      "educationalLevel": "Beginner",
      "courseMode": "online",
      "isAccessibleForFree": true,
      "inLanguage": "en-GB",
      "teaches": teaches,
      "coursePrerequisites": "No prior experience required. Basic computer skills and internet access.",
      "timeRequired": `PT${totalLessons * 2}H`,
      "numberOfCredits": totalLessons,
      "educationalCredentialAwarded": {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "Certificate of Completion",
        "name": `${courseData.title} Certificate`,
        "description": `Verified certificate of completion for the ${courseData.title} course from Ignite Education`
      },
      "audience": {
        "@type": "EducationalAudience",
        "educationalRole": "student",
        "audienceType": "Career changers, graduates, aspiring professionals"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "GBP",
        "availability": "https://schema.org/InStock",
        "url": `${baseUrl}/courses/${courseSlug}`,
        "validFrom": "2024-01-01"
      },
      "hasCourseInstance": {
        "@type": "CourseInstance",
        "courseMode": "online",
        "courseSchedule": {
          "@type": "Schedule",
          "repeatFrequency": "P1W",
          "repeatCount": Math.ceil(totalLessons / 4)
        },
        "courseWorkload": `PT${totalLessons * 2}H`
      },
      "instructor": courseCoaches?.map(coach => ({
        "@type": "Person",
        "name": coach.name,
        "jobTitle": coach.position,
        "image": coach.image_url,
        "worksFor": {
          "@type": "Organization",
          "name": "Ignite Education"
        }
      })) || []
    };
  };

  // Generate FAQ structured data for SEO
  const generateFAQStructuredData = (faqs) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  });

  // Generate Breadcrumb structured data for SEO
  const generateBreadcrumbStructuredData = (courseTitle) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://ignite.education" },
      { "@type": "ListItem", "position": 2, "name": "Courses", "item": "https://ignite.education/welcome" },
      { "@type": "ListItem", "position": 3, "name": courseTitle, "item": `https://ignite.education/courses/${courseSlug}` }
    ]
  });

  // Combine all structured data into an array for SEO component
  const getCombinedStructuredData = (courseData, courseCoaches) => {
    const baseUrl = 'https://ignite.education';
    return [
      generateCourseStructuredData(courseData, courseCoaches),
      generateFAQStructuredData(COURSE_FAQS),
      generateBreadcrumbStructuredData(courseData.title),
      generateSpeakableSchema(
        `${baseUrl}/courses/${courseSlug}`,
        courseData.title,
        ['.course-description', '.curriculum-section', 'h1', '.faq-section']
      )
    ];
  };

  // Get testimonial for this course
  const testimonial = getTestimonialForCourse(courseSlug);

  // Lightweight loading state (no Lottie for faster initial load)
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#EF0B72] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error/404 state
  if (error || !course) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-black mb-4">Course Not Found</h1>
              <p className="text-gray-600 mb-6">The course you're looking for doesn't exist or is no longer available.</p>
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
      {/* Waitlist success notification toast */}
      {showWaitlistSuccess && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          <div className="bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">You're on the waitlist! We'll email you when this course launches.</span>
            <button
              onClick={() => setShowWaitlistSuccess(false)}
              className="ml-2 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Priority access indicator */}
      {hasPriorityAccess && !priorityValidating && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <Star className="w-5 h-5 flex-shrink-0 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">Priority Access Activated! You're at the front of the line.</span>
            <button
              onClick={() => setHasPriorityAccess(false)}
              className="ml-2 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </div>
      )}

      <SEO
        title={`Become a ${course.title} | Ignite`}
        description={`Become a ${course.title} with Ignite's free, expert-led course. ${course.description}`}
        keywords={generateCourseKeywords(course.title)}
        url={`https://ignite.education/courses/${courseSlug}`}
        type="course"
        structuredData={getCombinedStructuredData(course, coaches)}
      />

      <div className="min-h-screen bg-white">
        {/* Sticky Top Navigation Bar */}
        <div className="sticky top-0 z-50">
          <Navbar />
        </div>

        {/* Hero Section */}
        <div className="bg-white">
          <div className="max-w-4xl mx-auto px-6 pb-[38px] flex justify-center" style={{ paddingTop: '75px' }}>
            <div className="w-full" style={{ maxWidth: '700px' }}>
              {/* Category Tag */}
              <span className="inline-block px-2 py-1 text-sm bg-[#EDEDED] rounded-sm font-medium" style={{ letterSpacing: '-0.02em', marginBottom: '10px' }}>
                {getCourseTypeLabel(course)}
              </span>

              {/* Title */}
              <h1 className="text-[38px] font-bold text-black mb-5 leading-tight" style={{ letterSpacing: '-0.02em' }}>
                {course.title}
              </h1>

              {/* Tagline - Purple */}
              <p className="text-xl text-[#7714E0] font-semibold leading-relaxed" style={{ letterSpacing: '-0.02em', marginBottom: '6px' }}>
                {`Become a ${course.title} with Ignite's free, expert-led course.`}
              </p>

              {/* Description - max 2 sentences */}
              <p className="text-black text-lg leading-relaxed font-medium" style={{ letterSpacing: '-0.02em', marginBottom: '30px' }}>
                {getTwoSentences(course.description)}
              </p>

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
                  <span className="text-sm text-black leading-tight" style={{ letterSpacing: '-0.01em' }}>Certificate upon<br/>completion</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-black leading-tight" style={{ letterSpacing: '-0.01em' }}>Built by<br/>industry experts</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-black leading-tight" style={{ letterSpacing: '-0.01em' }}>Self-paced<br/>learning</span>
                </div>
              </div>

              {/* Mobile Sign-In for logged-out users (hidden on desktop where One-Tap shows) */}
              {!user && (
                <div className="lg:hidden">
                  <GoogleOneTap
                    courseSlug={courseSlug}
                    courseStatus={course.status}
                    courseTitle={course.title}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Content below hero - original width */}
          <div className="max-w-4xl mx-auto px-6 pb-12 flex justify-center">
            <div className="w-full" style={{ maxWidth: '762px' }}>
              {/* Curriculum Section - Two Column Layout with expanded container */}
              {course.module_structure && Array.isArray(course.module_structure) && course.module_structure.length > 0 && (
                <div className="mb-8 lg:-mx-24" ref={curriculumSectionRef}>
                  <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>Curriculum</h2>
                  <div className="flex gap-6 items-stretch">
                    {/* Left Column - Curriculum Content */}
                    <div className="bg-[#F0F0F2] p-6 rounded-lg flex-1">
                      <div className="space-y-6">
                        {course.module_structure.map((module, moduleIndex) => (
                          <div key={moduleIndex}>
                            {/* Module Title */}
                            <h3 className="font-semibold mb-1" style={{ fontSize: '18px', color: '#7714E0', letterSpacing: '-0.01em' }}>
                              Module {moduleIndex + 1} - {module.name}
                            </h3>

                            {/* Module Description and Lessons */}
                            <div>
                              {/* Module Intro - uses stored description or falls back to generated */}
                              <p className="text-gray-900 mb-3" style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>
                                {module.description || generateModuleIntro(module)}
                              </p>

                              {/* Lesson List */}
                              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '0.4rem' }}>
                                {(module.lessons || []).map((lesson, lessonIndex) => (
                                  <li key={lessonIndex} className="flex items-center gap-2" style={{ fontSize: '14px' }}>
                                    <span className="text-gray-900" style={{ fontSize: '0.5em' }}>&#9632;</span>
                                    <span className="font-medium text-gray-900" style={{ letterSpacing: '-0.01em' }}>{lesson.name}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column - Sticky Google One-Tap or Image (hidden on narrow viewports) */}
                    <div className="flex-shrink-0 hidden lg:block self-stretch" style={{ width: '315px' }}>
                      <div className="sticky top-24">
                        {!user ? (
                          <GoogleOneTap
                            courseSlug={courseSlug}
                            courseStatus={course.status}
                            courseTitle={course.title}
                          />
                        ) : (
                          <OptimizedImage
                            src="https://auth.ignite.education/storage/v1/object/public/assets/envato-labs-image-edit.jpg"
                            alt="Course curriculum illustration"
                            className="w-full rounded-lg object-cover"
                            style={{ maxHeight: '500px' }}
                            width={315}
                            height={500}
                            widths={[315, 630]}
                            sizes="315px"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Section - only show for live courses */}
              {course.status !== 'coming_soon' && (
                <div className="mt-9 mb-8">
                  <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>Feedback</h2>
                  <div className="bg-[#F0F0F2] p-6 rounded-lg">
                    <p className="text-black text-lg font-medium">
                      "The {course.title} course was great! For someone new to the topic, this is a great introduction and allowed me to connect with the community"
                    </p>
                  </div>
                </div>
              )}

              {/* Course Coaches Section */}
              {coaches.length > 0 && (
                <div className="mt-9 mb-8">
                  <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>Course Leaders</h2>
                  <div className="flex flex-col gap-4">
                    {coaches.map((coach, index) => (
                      <div key={index} className="flex gap-4 items-start group cursor-pointer">
                        {coach.linkedin_url ? (
                          <a
                            href={coach.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex gap-4 items-start flex-1"
                          >
                            {coach.image_url ? (
                              <OptimizedImage
                                src={coach.image_url}
                                alt={`${coach.name}${coach.position ? `, ${coach.position}` : ''} - Course instructor at Ignite Education`}
                                className="w-20 h-20 rounded object-cover object-center flex-shrink-0"
                                width={80}
                                height={80}
                                widths={[80, 160, 240]}
                                sizes="80px"
                                resize="contain"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded bg-gray-200 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 group-hover:text-[#EF0B72] transition-colors" style={{ fontSize: '15px', lineHeight: '1.3', marginBottom: '2px' }}>
                                {coach.name}
                              </h4>
                              {coach.position && (
                                <p className="text-gray-900 font-medium" style={{ fontSize: '15px', lineHeight: '1.3', marginBottom: '4px' }}>
                                  {coach.position}
                                </p>
                              )}
                              {coach.description && (
                                <p className="text-gray-900" style={{ fontSize: '15px', lineHeight: '1.5' }}>
                                  {coach.description}
                                </p>
                              )}
                            </div>
                          </a>
                        ) : (
                          <div className="flex gap-4 items-start flex-1">
                            {coach.image_url ? (
                              <OptimizedImage
                                src={coach.image_url}
                                alt={`${coach.name}${coach.position ? `, ${coach.position}` : ''} - Course instructor at Ignite Education`}
                                className="w-20 h-20 rounded object-cover object-center flex-shrink-0"
                                width={80}
                                height={80}
                                widths={[80, 160, 240]}
                                sizes="80px"
                                resize="contain"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded bg-gray-200 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 group-hover:text-[#EF0B72] transition-colors" style={{ fontSize: '15px', lineHeight: '1.3', marginBottom: '2px' }}>
                                {coach.name}
                              </h4>
                              {coach.position && (
                                <p className="text-gray-900 font-medium" style={{ fontSize: '15px', lineHeight: '1.3', marginBottom: '4px' }}>
                                  {coach.position}
                                </p>
                              )}
                              {coach.description && (
                                <p className="text-gray-900" style={{ fontSize: '15px', lineHeight: '1.5' }}>
                                  {coach.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Become a course leader link */}
                  <button
                    onClick={() => setShowLeaderModal(true)}
                    className="mt-4 text-black hover:text-[#EF0B72] font-medium transition-colors flex items-center gap-0.5"
                    style={{ fontSize: '15px' }}
                  >
                    Become a course leader
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* FAQs Section */}
              <div className="mt-9 mb-8">
                <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>FAQs</h2>
                <div className="space-y-3">
                  {COURSE_FAQS.map((faq, idx) => (
                    <div
                      key={idx}
                      className="rounded cursor-pointer"
                      style={{
                        backgroundColor: '#F0F0F2',
                        overflow: 'hidden',
                        paddingTop: '1rem',
                        paddingRight: '1rem',
                        paddingBottom: expandedFAQ === idx ? '1rem' : '1rem',
                        paddingLeft: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start'
                      }}
                      onMouseEnter={() => setExpandedFAQ(idx)}
                    >
                      <h4 className="font-semibold leading-tight transition-all duration-500" style={{ fontSize: '20px', color: expandedFAQ === idx ? '#7714E0' : '#000000' }}>
                        {faq.question}
                      </h4>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateRows: expandedFAQ === idx ? '1fr' : '0fr',
                          transition: 'grid-template-rows 500ms cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <p className="text-black text-sm" style={{
                            marginTop: 'calc(0.1rem + 2px)',
                            paddingBottom: '0'
                          }}>
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Become a Course Leader Modal */}
      {showLeaderModal && (
        <div
          className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            setShowLeaderModal(false);
            setLeaderForm({ name: '', email: '', linkedin: '' });
          }}
        >
          <div className="relative px-4 sm:px-0" style={{ width: '100%', maxWidth: '484px' }}>
            {/* Title above the box */}
            <h3 className="font-semibold text-white pl-1" style={{ marginBottom: '0.15rem', fontSize: '1.35rem' }}>
              Course Leader
            </h3>

            <div
              className="bg-white rounded-lg w-full relative"
              style={{ padding: '1.8rem 2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setShowLeaderModal(false);
                  setLeaderForm({ name: '', email: '', linkedin: '' });
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              <p className="mb-5 text-sm" style={{ color: '#000000' }}>
                Share your expertise and help shape the next generation of professionals. Fill out the form to learn more.
              </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();

                    // Create mailto link with form data
                    const subject = encodeURIComponent(`Course Leader Enquiry - ${course?.title || 'Course'}`);
                    const body = encodeURIComponent(
                      `Course: ${course?.title || 'Unknown'}\n` +
                      `Name: ${leaderForm.name}\n` +
                      `Email: ${leaderForm.email}\n` +
                      `LinkedIn: ${leaderForm.linkedin}\n`
                    );

                    // Open mailto link
                    window.location.href = `mailto:hello@ignite.education?subject=${subject}&body=${body}`;

                    // Close modal after a brief delay
                    setTimeout(() => {
                      setShowLeaderModal(false);
                      setLeaderForm({ name: '', email: '', linkedin: '' });
                    }, 300);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>Name</label>
                    <input
                      type="text"
                      required
                      value={leaderForm.name}
                      onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent outline-none transition-all"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>Email</label>
                    <input
                      type="email"
                      required
                      value={leaderForm.email}
                      onChange={(e) => setLeaderForm({ ...leaderForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent outline-none transition-all"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>LinkedIn Profile</label>
                    <input
                      type="url"
                      required
                      value={leaderForm.linkedin}
                      onChange={(e) => setLeaderForm({ ...leaderForm, linkedin: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent outline-none transition-all"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#EF0B72] hover:bg-[#D10A64] text-white font-semibold rounded-lg transition-colors mt-1"
                  >
                    Submit
                  </button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* Register Interest Modal (for coming_soon courses) */}
      {showInterestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            setShowInterestModal(false);
            setInterestForm({ email: '' });
            setInterestSubmitted(false);
          }}
        >
          <div className="relative px-4 sm:px-0" style={{ width: '100%', maxWidth: '484px' }}>
            {/* Title above the box */}
            <h3 className="font-semibold text-white pl-1" style={{ marginBottom: '0.15rem', fontSize: '1.35rem' }}>
              Register Interest
            </h3>

            <div
              className="bg-white rounded-lg w-full relative"
              style={{ padding: '1.8rem 2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setShowInterestModal(false);
                  setInterestForm({ email: '' });
                  setInterestSubmitted(false);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              {interestSubmitted ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">You're on the list!</h4>
                  <p className="text-sm text-gray-600">
                    We'll notify you when {course?.title} launches.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-5 text-sm" style={{ color: '#000000' }}>
                    Be the first to know when <strong>{course?.title}</strong> launches. Enter your email to get notified.
                  </p>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setInterestSubmitting(true);

                      try {
                        // Insert into course_requests table
                        const { error } = await supabase
                          .from('course_requests')
                          .insert({
                            email: interestForm.email,
                            course_name: course?.name || courseSlug
                          });

                        if (error) {
                          // If duplicate, still show success
                          if (error.code === '23505') {
                            setInterestSubmitted(true);
                          } else {
                            console.error('Error registering interest:', error);
                            alert('Something went wrong. Please try again.');
                          }
                        } else {
                          setInterestSubmitted(true);
                        }
                      } catch (err) {
                        console.error('Error:', err);
                        alert('Something went wrong. Please try again.');
                      } finally {
                        setInterestSubmitting(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>Email</label>
                      <input
                        type="email"
                        required
                        value={interestForm.email}
                        onChange={(e) => setInterestForm({ ...interestForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={interestSubmitting}
                      className="w-full py-2.5 bg-[#EF0B72] hover:bg-[#D10A64] text-white font-semibold rounded-lg transition-colors mt-1 disabled:opacity-50"
                    >
                      {interestSubmitting ? 'Submitting...' : 'Notify Me'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CoursePage;
