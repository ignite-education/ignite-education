import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressHub from './ProgressHub';
import Onboarding from './Onboarding';
import { ChevronDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCoachesForCourse } from '../lib/api';
import SEO from './SEO';
import BlogCarousel from './BlogCarousel';

const Auth = () => {
  // Debounce helper to prevent rapid state updates
  const debounceTimeouts = useRef({});
  const debounce = (key, callback, delay = 100) => {
    if (debounceTimeouts.current[key]) {
      clearTimeout(debounceTimeouts.current[key]);
    }
    debounceTimeouts.current[key] = setTimeout(callback, delay);
  };

  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState(null);
  const marketingSectionRef = useRef(null);
  const [animateWords, setAnimateWords] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [isCardManuallySelected, setIsCardManuallySelected] = useState(false);
  const [selectedCourseModal, setSelectedCourseModal] = useState(null);
  const [typedEducationText, setTypedEducationText] = useState('');
  const [isEducationTypingComplete, setIsEducationTypingComplete] = useState(false);
  const [typedTagline, setTypedTagline] = useState('');
  const [isTaglineTypingComplete, setIsTaglineTypingComplete] = useState(false);
  const coursesSectionRef = useRef(null);
  const courseCardsScrollRef = useRef(null);
  const learningModelSectionRef = useRef(null);
  const testimonialsSectionRef = useRef(null);
  const [coursePageIndex, setCoursePageIndex] = useState(0);
  const [courses, setCourses] = useState([]);
  const [blurredCards, setBlurredCards] = useState([]);
  const [typedCoursesTitle, setTypedCoursesTitle] = useState('');
  const [isCourseTitleTypingComplete, setIsCourseTitleTypingComplete] = useState(false);
  const [typedLearningTagline, setTypedLearningTagline] = useState('');
  const [isLearningTaglineTypingComplete, setIsLearningTaglineTypingComplete] = useState(false);
  const [typedTestimonialsHeading, setTypedTestimonialsHeading] = useState('');
  const [isTestimonialsHeadingTypingComplete, setIsTestimonialsHeadingTypingComplete] = useState(false);
  const [animateTestimonials, setAnimateTestimonials] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [isTestimonialHovered, setIsTestimonialHovered] = useState(false);
  const [hoveredUseCase, setHoveredUseCase] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(0);
  const [typedCourseDescription, setTypedCourseDescription] = useState('');

  const [typedFAQHeading, setTypedFAQHeading] = useState('');
  const [typedBlogHeading, setTypedBlogHeading] = useState('');
  const linkedInFAQSectionRef = useRef(null);
  const [courseCoaches, setCourseCoaches] = useState({});
  const authScrollContainerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const { user, signIn, signUp, signInWithOAuth, resetPassword } = useAuth();

  // Debug: Check environment variable on mount
  useEffect(() => {
  }, []);
  const navigate = useNavigate();
  const location = useLocation();

  // Memoize selected course to avoid duplicate finds and reduce re-renders
  const selectedCourse = useMemo(() => {
    if (!selectedCourseModal) return null;
    return courses.find(c => c.name === selectedCourseModal);
  }, [selectedCourseModal, courses]);

  // Memoize selected course coaches to avoid recalculating on every render
  const selectedCourseCoaches = useMemo(() => {
    if (!selectedCourseModal) return [];
    return courseCoaches[selectedCourseModal] || [];
  }, [selectedCourseModal, courseCoaches]);

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
      // Analyze lesson content for foundation modules
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
      // Generic foundation fallback
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
    
    // Healthcare specific modules
    if (lowerModuleName.includes('health') || lowerModuleName.includes('medical') || lowerModuleName.includes('patient')) {
      if (lowerModuleName.includes('mental')) {
        return `Develop understanding of mental health conditions, therapeutic approaches, and support strategies. Learn to recognize symptoms, provide compassionate care, and connect individuals with appropriate resources.`;
      }
      if (lowerModuleName.includes('care') || lowerModuleName.includes('clinical')) {
        return `Master patient care fundamentals, clinical procedures, and healthcare best practices. Learn to provide quality care, maintain patient safety, and work effectively in healthcare settings.`;
      }
      return `Build essential healthcare knowledge and patient care skills for professional practice. Develop competencies in assessment, intervention, and collaborative healthcare delivery.`;
    }
    
    // Green energy/sustainability modules
    if (lowerModuleName.includes('energy') || lowerModuleName.includes('renewable') || lowerModuleName.includes('solar') || lowerModuleName.includes('green')) {
      if (lowerModuleName.includes('solar')) {
        return `Master solar energy systems, photovoltaic technology, and installation techniques. Learn to design, implement, and maintain solar power solutions for residential and commercial applications.`;
      }
      if (lowerModuleName.includes('sustainability') || lowerModuleName.includes('environmental')) {
        return `Understand sustainable practices, environmental impact assessment, and green technology solutions. Learn to implement eco-friendly strategies and contribute to environmental conservation.`;
      }
      return `Develop expertise in renewable energy technologies, sustainable practices, and green solutions. Learn to design and implement clean energy systems that reduce environmental impact.`;
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
    
    // Generic fallback - should rarely be used now
    return `Build comprehensive knowledge and practical skills in this essential professional domain. Develop expertise through hands-on learning and real-world application of key concepts.`;
  };

  // Clean up OAuth hash fragments before paint to prevent flicker
  useLayoutEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Reset loading state when component mounts to handle failed OAuth redirects
  useEffect(() => {
    // Reset loading state when returning to the page
    setLoading(false);

    // Handle browser back button navigation
    const handlePopState = () => {
      setLoading(false);
      setError('');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Set Safari mobile theme color to black for auth page
  useEffect(() => {
    // Update theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const originalColor = metaThemeColor?.getAttribute('content') || '#EF0B72';

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#000000');
    }

    // Also set html/body background for Safari mobile browser chrome detection
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';

    return () => {
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', originalColor);
      }
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

  // Track mobile viewport for conditional rendering
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start tagline typing animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startTaglineTyping();
    }, 300); // Small delay before starting
    return () => clearTimeout(timer);
  }, []);

  // Intersection observer for animating words when section comes into view
  useEffect(() => {
    if (!marketingSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animateWords) {
            debounce('marketingAnimation', () => {
              setAnimateWords(true);
              // Start typing animation
              startEducationTyping();
            }, 50);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(marketingSectionRef.current);

    return () => {
      if (marketingSectionRef.current) {
        observer.unobserve(marketingSectionRef.current);
      }
    };
  }, [isLogin, animateWords, selectedCourseModal]);

  // Fetch courses from Supabase and preload coach data
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .in('status', ['live', 'coming_soon'])
          .order('display_order', { ascending: true });

        if (coursesError) throw coursesError;

        // Add module_names from module_structure or modules table
        const coursesWithModules = (coursesData || []).map((course) => {
          let moduleNames = '';

          // First try to get modules from module_structure field
          if (course.module_structure && Array.isArray(course.module_structure)) {
            moduleNames = course.module_structure.map(m => m.name).join(', ');
          }

          return {
            ...course,
            module_names: moduleNames
          };
        });

        // Sort courses: live courses first, then coming_soon, maintaining display_order within each group
        const sortedCourses = coursesWithModules.sort((a, b) => {
          // First sort by status (live before coming_soon)
          if (a.status === 'live' && b.status === 'coming_soon') return -1;
          if (a.status === 'coming_soon' && b.status === 'live') return 1;
          // If same status, sort by display_order
          return (a.display_order || 0) - (b.display_order || 0);
        });

        console.log('Fetched courses with modules:', sortedCourses);
        setCourses(sortedCourses);

        // Preload coaches for all courses to prevent flickering when modal opens
        const coachesCache = {};
        await Promise.all(
          coursesWithModules.map(async (course) => {
            try {
              const coaches = await getCoachesForCourse(course.name);
              coachesCache[course.name] = coaches || [];
            } catch (error) {
              console.error(`Error fetching coaches for ${course.name}:`, error);
              coachesCache[course.name] = [];
            }
          })
        );
        setCourseCoaches(coachesCache);
      } catch (error) {
        console.error('Error fetching courses:', error);
        console.error('Full error details:', error);
      }
    };

    fetchCourses();
  }, []);

  // Handle ?course= URL parameter to auto-open course modal
  useEffect(() => {
    console.log('🔍 [Auth] URL parameter handler triggered');
    console.log('🔍 [Auth] location.search:', location.search);
    console.log('🔍 [Auth] courses.length:', courses.length);

    const searchParams = new URLSearchParams(location.search);
    const courseParam = searchParams.get('course');
    console.log('🔍 [Auth] courseParam:', courseParam);

    if (courseParam && courses.length > 0) {
      // Map course slug to course title for display
      const slugToTitleMap = {
        'product-manager': 'Product Manager',
        'cyber-security-analyst': 'Cyber Security Analyst',
        'data-analyst': 'Data Analyst',
        'ux-designer': 'UX Designer',
      };

      const courseTitle = slugToTitleMap[courseParam];
      console.log('🔍 [Auth] Mapped course title:', courseTitle);

      // Check if this course exists in the loaded courses (by title, not name)
      const courseExists = courses.find(c => c.title === courseTitle);
      console.log('🔍 [Auth] Course exists:', !!courseExists);
      console.log('🔍 [Auth] Available courses:', courses.map(c => ({ name: c.name, title: c.title })));

      if (courseExists) {
        console.log('✅ [Auth] Opening course modal for:', courseTitle);
        // Scroll to courses section instantly (no animation)
        if (coursesSectionRef.current) {
          coursesSectionRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        // setSelectedCourseModal expects the course name (not title)
        setSelectedCourseModal(courseExists.name);
      } else {
        console.log('❌ [Auth] Course not found in loaded courses');
      }
    } else {
      console.log('⏭️ [Auth] Skipping - courseParam:', courseParam, 'courses.length:', courses.length);
    }
  }, [location.search, courses]);

  // Detect card visibility for blur effect on course grid
  useEffect(() => {
    const scrollContainer = courseCardsScrollRef.current;
    if (!scrollContainer || courses.length === 0) return;
    const updateCardBlur = () => {
      const cards = scrollContainer.querySelectorAll('[data-course-card]');
      const newBlurredCards = [];
      const containerRect = scrollContainer.getBoundingClientRect();
      const containerLeft = containerRect.left;

      // Use viewport width to determine if mobile (< 768px)
      const isMobile = window.innerWidth < 768;
      const viewportWidth = window.innerWidth;

      cards.forEach((card, globalIndex) => {
        const cardRect = card.getBoundingClientRect();
        const cardLeft = cardRect.left;
        const cardRight = cardRect.right;

        if (isMobile) {
          // On mobile with 2x2 grid: blur cards in the right column (not fully visible)
          // A card is in the "right column" if its right edge is beyond the viewport
          // or if its left edge starts beyond half the viewport width
          const halfViewport = viewportWidth / 2;
          if (cardLeft > halfViewport) {
            newBlurredCards.push(globalIndex);
          }
        } else {
          // On desktop: blur cards beyond the first page width (510px)
          const relativeLeft = cardLeft - containerLeft;
          if (relativeLeft > 520) {
            newBlurredCards.push(globalIndex);
          }
        }
      });

      setBlurredCards(newBlurredCards);
    };

    // Initial check
    updateCardBlur();

    // Listen to scroll events
    scrollContainer.addEventListener('scroll', updateCardBlur);
    window.addEventListener('resize', updateCardBlur);

    return () => {
      scrollContainer.removeEventListener('scroll', updateCardBlur);
      window.removeEventListener('resize', updateCardBlur);
    };
  }, [courses]);

  // Preload images to prevent flickering/pop-in
  useEffect(() => {
    const imagesToPreload = [
      'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
      'https://auth.ignite.education/storage/v1/object/public/assets/envato-labs-image-edit.jpg'
    ];

    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);


  // Intersection observer for courses section typing animation
  useEffect(() => {
    if (!coursesSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isCourseTitleTypingComplete) {
            debounce('coursesAnimation', () => {
              startCourseTitleTyping();
            }, 50);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(coursesSectionRef.current);

    return () => {
      if (coursesSectionRef.current) {
        observer.unobserve(coursesSectionRef.current);
      }
    };
  }, [isLogin, isCourseTitleTypingComplete, selectedCourseModal]);

  // Intersection observer for learning model section typing animation
  useEffect(() => {
    if (!learningModelSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLearningTaglineTypingComplete) {
            debounce('learningAnimation', () => {
              startLearningTaglineTyping();
            }, 50);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-100px 0px -100px 0px' }
    );

    observer.observe(learningModelSectionRef.current);

    return () => {
      if (learningModelSectionRef.current) {
        observer.unobserve(learningModelSectionRef.current);
      }
    };
  }, [isLogin, isLearningTaglineTypingComplete, selectedCourseModal]);

  // Intersection observer for testimonials section animation
  useEffect(() => {
    if (!testimonialsSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            debounce('testimonialsAnimation', () => {
              if (!animateTestimonials) {
                setAnimateTestimonials(true);
              }
              if (!isTestimonialsHeadingTypingComplete) {
                startTestimonialsHeadingTyping();
              }
            }, 50);
          }
        });
      },
      { threshold: 0.2, rootMargin: '-100px 0px -100px 0px' }
    );

    observer.observe(testimonialsSectionRef.current);

    return () => {
      if (testimonialsSectionRef.current) {
        observer.unobserve(testimonialsSectionRef.current);
      }
    };
  }, [isLogin, animateTestimonials, isTestimonialsHeadingTypingComplete, selectedCourseModal]);

  // Auto-rotate testimonials carousel
  useEffect(() => {
    if (!animateTestimonials || !isTestimonialsHeadingTypingComplete || isTestimonialHovered || isLogin || selectedCourseModal) return;

    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % 5); // 5 testimonials total
    }, 6000); // Rotate every 6 seconds

    return () => clearInterval(interval);
  }, [animateTestimonials, isTestimonialsHeadingTypingComplete, isTestimonialHovered, isLogin, selectedCourseModal]);

  // Intersection observer for Blog & FAQ section animation
  useEffect(() => {
    if (!linkedInFAQSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            debounce('blogFAQAnimation', () => {
              // Start typing animations for headings
              startBlogFAQHeadingsTyping();
            }, 50);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(linkedInFAQSectionRef.current);

    return () => {
      if (linkedInFAQSectionRef.current) {
        observer.unobserve(linkedInFAQSectionRef.current);
      }
    };
  }, [isLogin, selectedCourseModal]);






  // Typing animation for Blog and FAQ headings
  const startBlogFAQHeadingsTyping = () => {
    const blogText = 'Latest from Ignite';
    const faqText = 'FAQs';
    let blogIndex = 0;
    let faqIndex = 0;

    // Start typing blog heading immediately
    const blogInterval = setInterval(() => {
      if (blogIndex <= blogText.length) {
        setTypedBlogHeading(blogText.substring(0, blogIndex));
        blogIndex++;
      } else {
        clearInterval(blogInterval);

        // Wait 500ms, then type FAQ heading
        setTimeout(() => {
          const faqInterval = setInterval(() => {
            if (faqIndex <= faqText.length) {
              setTypedFAQHeading(faqText.substring(0, faqIndex));
              faqIndex++;
            } else {
              clearInterval(faqInterval);
            }
          }, 75); // 75ms per character
        }, 500); // 500ms delay
      }
    }, 75); // 75ms per character
  };

  // Typing animation for tagline (Upskill. Reskill. Get ready for what's next.)
  const startTaglineTyping = () => {
    const fullText = 'Upskill. Reskill. Get ready for what\'s next.';
    const pausePositions = [
      { after: 'Upskill.'.length, duration: 500 },
      { after: 'Upskill. Reskill.'.length, duration: 500 },
      { after: fullText.length, duration: 500 } // Pause at end before cursor disappears
    ];
    let currentIndex = 0;
    let isPaused = false;

    // 300ms intro delay before typing starts
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return;

        if (currentIndex <= fullText.length) {
          setTypedTagline(fullText.substring(0, currentIndex));

          const pausePoint = pausePositions.find(p => currentIndex === p.after);
          if (pausePoint) {
            isPaused = true;
            setTimeout(() => {
              isPaused = false;
              // If this was the final pause, mark as complete
              if (currentIndex >= fullText.length) {
                clearInterval(typingInterval);
                setIsTaglineTypingComplete(true);
              }
            }, pausePoint.duration);
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 80); // 80ms per character for slower typing
    }, 300); // 300ms intro delay
  };

  // Typing animation for education text
  const startEducationTyping = () => {
    const fullText = isMobile
      ? 'Education should\nbe accessible,\npersonalised and\nintegrated for\neveryone.'
      : 'Education should be \naccessible, personalised and integrated for everyone.';
    const pausePositions = isMobile
      ? [
          { after: 'Education should\nbe accessible,'.length, duration: 500 },
          { after: 'Education should\nbe accessible,\npersonalised'.length, duration: 500 }
        ]
      : [
          { after: 'Education should be \naccessible,'.length, duration: 500 },
          { after: 'Education should be \naccessible, personalised'.length, duration: 500 }
        ];
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return; // Skip typing if paused

        if (currentIndex <= fullText.length) {
          setTypedEducationText(fullText.substring(0, currentIndex));

          // Check if we should pause at this position
          const pausePoint = pausePositions.find(p => currentIndex === p.after);
          if (pausePoint) {
            isPaused = true;
            setTimeout(() => {
              isPaused = false;
            }, pausePoint.duration);
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
          // Keep the typing indicator for 0.5 seconds before marking as complete
          setTimeout(() => {
            setIsEducationTypingComplete(true);
          }, 500);
        }
      }, 90); // 90ms per character for slower typing
    }, 2000); // 2000ms delay before starting
  };

  // Typing animation for courses title
  const startCourseTitleTyping = () => {
    const fullText = 'The best courses.\nFor the best students.';
    const firstLineLength = 'The best courses.'.length;
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return; // Skip typing if paused

        if (currentIndex <= fullText.length) {
          setTypedCoursesTitle(fullText.substring(0, currentIndex));

          // Check if we just finished the first line
          if (currentIndex === firstLineLength) {
            isPaused = true;
            // Resume typing after 1 second
            setTimeout(() => {
              isPaused = false;
            }, 1000);
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsCourseTitleTypingComplete(true);
        }
      }, 75); // 75ms per character
    }, 1000); // 1000ms delay before starting
  };

  // Typing animation for learning tagline
  const startLearningTaglineTyping = () => {
    const fullText = 'Building a smarter, \nmore personalised era of education.';
    const pauseAfter = 'Building a smarter,'.length;
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return;

        if (currentIndex <= fullText.length) {
          setTypedLearningTagline(fullText.substring(0, currentIndex));

          // Pause after "Building a smarter,"
          if (currentIndex === pauseAfter) {
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 700); // 700ms pause
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsLearningTaglineTypingComplete(true);
        }
      }, 75); // 75ms per character
    }, 1000); // 1000ms delay before starting
  };

  // Typing animation for testimonials heading
  const startTestimonialsHeadingTyping = () => {
    const fullText = 'Ignite is for everyone.\nThe curious, the committed, the ambitious.';
    const pauseAfterEveryone = 'Ignite is for everyone.'.length;
    const pauseAfterCurious = 'Ignite is for everyone.\nThe curious,'.length;
    const pauseAfterCommitted = 'Ignite is for everyone.\nThe curious, the committed,'.length;
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return;

        if (currentIndex <= fullText.length) {
          setTypedTestimonialsHeading(fullText.substring(0, currentIndex));

          // Pause after "everyone"
          if (currentIndex === pauseAfterEveryone) {
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 700); // 700ms pause
          }
          
          // Pause after "curious,"
          if (currentIndex === pauseAfterCurious) {
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 500); // 500ms pause
          }
          
          // Pause after "committed,"
          if (currentIndex === pauseAfterCommitted) {
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 500); // 500ms pause
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTestimonialsHeadingTypingComplete(true);
        }
      }, 75); // 75ms per character
    }, 1000); // 1000ms delay before starting
  };

  // Helper to render typed text with pink highlights for key words
  const renderTypedEducation = () => {
    const text = typedEducationText;
    const words = ['accessible', 'personalised', 'integrated'];
    const fullText = isMobile
      ? 'Education should\nbe accessible,\npersonalised and\nintegrated for\neveryone.'
      : 'Education should be \naccessible, personalised and integrated for everyone.';

    // Split text into parts and highlight the key words
    let result = [];
    let lastIndex = 0;

    // Define positions of each word in the full text
    const wordPositions = words.map(word => ({
      word,
      start: fullText.indexOf(word),
      end: fullText.indexOf(word) + word.length
    }));

    let currentPos = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle line breaks
      if (char === '\n') {
        result.push(<br key={`br-${i}`} />);
        lastIndex = i + 1;
        continue;
      }

      // Check if we're at the start of a pink word
      const inPinkWord = wordPositions.find(wp => i >= wp.start && i < wp.end);

      if (inPinkWord) {
        // If this is the start of a pink word section
        if (currentPos < lastIndex || !result.length || result[result.length - 1].key !== inPinkWord.word) {
          const pinkChunk = text.substring(i, Math.min(text.length, inPinkWord.end));
          result.push(
            <span key={`${inPinkWord.word}-${i}`} style={{ display: 'inline', whiteSpace: 'nowrap', color: '#EF0B72' }}>
              {pinkChunk}
            </span>
          );
          i = Math.min(text.length - 1, inPinkWord.end - 1);
          lastIndex = i + 1;
        }
      } else {
        // Regular text - find the next pink word, line break, or end
        let nextPinkStart = text.length;
        let nextLineBreak = text.indexOf('\n', i);
        if (nextLineBreak === -1) nextLineBreak = text.length;

        for (const wp of wordPositions) {
          if (wp.start > i && wp.start < nextPinkStart && wp.start < text.length) {
            nextPinkStart = wp.start;
          }
        }

        const endPos = Math.min(nextPinkStart, nextLineBreak, text.length);
        const chunk = text.substring(i, endPos);
        if (chunk) {
          result.push(
            <span key={`text-${i}`} className="text-white" style={{ display: 'inline', whiteSpace: 'pre-wrap' }}>
              {chunk}
            </span>
          );
          i = endPos - 1;
          lastIndex = i + 1;
        }
      }
    }

    // Add cursor if typing is not complete
    if (!isEducationTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-light">|</span>
      );
    }

    return result;
  };

  // Helper to render typed courses title with purple highlights
  const renderTypedCoursesTitle = () => {
    const text = typedCoursesTitle;
    const fullText = 'The best courses.\nFor the best students.';
    const firstLineLength = 'The best courses.'.length;

    let result = [];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle line breaks
      if (char === '\n') {
        result.push(<br key={`br-${i}`} />);
        lastIndex = i + 1;
        continue;
      }

      // Check if we're in the second line (after the newline character)
      const isSecondLine = i > firstLineLength;

      if (isSecondLine) {
        // Find the end of current pink section
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const pinkChunk = text.substring(i, nextBreakOrEnd);
        if (pinkChunk) {
          result.push(
            <span key={`pink-${i}`} style={{ color: '#EF0B72' }}>
              {pinkChunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      } else {
        // First line - white text
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const chunk = text.substring(i, nextBreakOrEnd);
        if (chunk) {
          result.push(
            <span key={`white-${i}`} className="text-white">
              {chunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      }
    }

    // Add cursor if typing is not complete
    if (!isCourseTitleTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-light">|</span>
      );
    }

    return result;
  };

  // Helper to render typed learning tagline with purple highlights
  const renderTypedLearningTagline = () => {
    const text = typedLearningTagline;
    const fullText = 'Building a smarter, \nmore personalised era of education.';
    const firstLineLength = 'Building a smarter, '.length;

    let result = [];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle line breaks
      if (char === '\n') {
        result.push(<br key={`br-${i}`} />);
        lastIndex = i + 1;
        continue;
      }

      // Check if we're in the second line (after the newline character)
      const isSecondLine = i > firstLineLength;

      if (isSecondLine) {
        // Find the end of current pink section
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const pinkChunk = text.substring(i, nextBreakOrEnd);
        if (pinkChunk) {
          result.push(
            <span key={`pink-${i}`} style={{ color: '#EF0B72' }}>
              {pinkChunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      } else {
        // First line - white text
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const chunk = text.substring(i, nextBreakOrEnd);
        if (chunk) {
          result.push(
            <span key={`white-${i}`} className="text-white">
              {chunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      }
    }

    if (!isLearningTaglineTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-light">|</span>
      );
    }

    return result;
  };

  // Helper to render typed testimonials heading with white first line and pink second line
  const renderTypedTestimonialsHeading = () => {
    const text = typedTestimonialsHeading;
    const fullText = 'Ignite is for everyone.\nThe curious, the committed, the ambitious.';
    const firstLineLength = 'Ignite is for everyone.'.length;

    let result = [];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle line breaks
      if (char === '\n') {
        result.push(<br key={`br-${i}`} />);
        lastIndex = i + 1;
        continue;
      }

      // Check if we're in the second line (after the newline character)
      const isSecondLine = i > firstLineLength;

      if (isSecondLine) {
        // Find the end of current pink section
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const pinkChunk = text.substring(i, nextBreakOrEnd);
        if (pinkChunk) {
          result.push(
            <span key={`pink-${i}`} style={{ color: '#EF0B72' }}>
              {pinkChunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      } else {
        // First line - white text
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const chunk = text.substring(i, nextBreakOrEnd);
        if (chunk) {
          result.push(
            <span key={`white-${i}`} className="text-white">
              {chunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      }
    }

    if (!isTestimonialsHeadingTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-light">|</span>
      );
    }

    return result;
  };

  // Auto-rotate through cards
  useEffect(() => {
    if (!animateWords || isLogin || selectedCourseModal || isCardManuallySelected || !isLearningTaglineTypingComplete) return;

    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % 4); // Rotate through 0, 1, 2, 3
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [animateWords, isLogin, selectedCourseModal, isCardManuallySelected, isLearningTaglineTypingComplete]);

  // Resume auto-rotation after manual selection
  useEffect(() => {
    if (isCardManuallySelected) {
      const timer = setTimeout(() => {
        setIsCardManuallySelected(false);
      }, 8000); // Resume auto-rotation after 8 seconds of manual selection
      return () => clearTimeout(timer);
    }
  }, [isCardManuallySelected, activeCard]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/progress');
      } else {
        const result = await signUp(email, password, firstName, lastName);
        // Show onboarding for new signups
        setNewUserId(result.user.id);
        setShowOnboarding(true);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    setError('');
    setLoading(true);

    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(err.message || 'An error occurred with OAuth sign in');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting to send password reset email to:', resetEmail);
      const result = await resetPassword(resetEmail);
      console.log('Password reset response:', result);
      setResetSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'An error occurred sending reset email');
      setLoading(false);
    }
  };

  const scrollToMarketing = () => {
    marketingSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const scrollToTestimonials = () => {
    testimonialsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const scrollToCourses = () => {
    coursesSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const scrollToLearningModel = () => {
    learningModelSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Show onboarding if user just signed up
  if (showOnboarding) {
    return <Onboarding firstName={firstName} userId={newUserId} />;
  }

  return (
    <>
      <SEO
        title="Ignite | Welcome"
        description="Transform your career with Ignite's interactive courses in Product Management, Cyber Security, Data Analysis, and UX Design. Learn from industry experts with AI-powered lessons, real-world projects, and personalized feedback."
        keywords="product management course, cyber security training, data analyst course, UX design course, online learning, AI-powered education, tech skills, career development"
        url="https://www.ignite.education/welcome"
      />
      {/* Background - Progress Hub (not rendered on mobile for performance) */}
      {!isMobile && (
        <div
          className="auth-progress-bg"
          style={{
            filter: 'blur(1px) brightness(0.7)',
            pointerEvents: 'none',
            opacity: 0,
            animation: 'fadeIn 1s ease-out forwards',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          }}
        >
          <ProgressHub />
        </div>
      )}

      {/* Auth Overlay - Scrollable Container */}
      <div
        ref={authScrollContainerRef}
        className="fixed inset-0 backdrop-blur-sm animate-fadeIn overflow-y-auto auth-scroll-container"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.75))',
          animation: 'fadeIn 0.2s ease-out',
          zIndex: 50,
          scrollBehavior: 'smooth',
          scrollSnapType: 'y mandatory',
          overflow: selectedCourseModal ? 'hidden' : 'auto',
          pointerEvents: selectedCourseModal ? 'none' : 'auto',
          minWidth: '1300px',
          overflowX: 'auto'
        }}
      >
      {/* First Section - Auth Form */}
      <div className="min-h-screen flex items-center justify-center px-8 relative auth-section-1" style={{ scrollSnapAlign: 'start' }}>
      <div className="relative w-full flex flex-col items-center" style={{ maxWidth: '533px' }}>
        {/* Logo */}
        <img
          src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png"
          alt="Ignite Education"
          className="auth-logo object-contain"
          style={{
            width: '120px',
            height: '40px',
            marginBottom: '0.5rem'
          }}
        />

        {/* Tagline - on both sign in and create account pages */}
        <div className="auth-tagline" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem', marginBottom: 'clamp(0.75rem, 2vh, 1.25rem)' }}>
          <h1 className="text-xl font-semibold text-white px-2" style={{ lineHeight: '1.2', fontSize: 'clamp(18.9px, 4.2vw, 27.3px)', textAlign: 'center' }}>
            {(() => {
              const fullFirstLine = 'Upskill. Reskill.';
              const fullSecondLine = "Get ready for what's next.";
              const pinkStart = fullFirstLine.length + 1; // +1 for the space
              const firstLineTypedLength = Math.min(typedTagline.length, fullFirstLine.length);
              const secondLineTypedLength = typedTagline.length > pinkStart ? typedTagline.length - pinkStart : 0;
              const isTypingFirstLine = typedTagline.length <= fullFirstLine.length && !isTaglineTypingComplete;
              const isTypingSecondLine = typedTagline.length > pinkStart && !isTaglineTypingComplete;

              return (
                <>
                  {/* First line - white text */}
                  <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
                    {fullFirstLine.split('').map((char, i) => (
                      <span key={i}>
                        {i === firstLineTypedLength && isTypingFirstLine && (
                          <span className="animate-blink" style={{ display: 'inline-block', width: 0, overflow: 'visible' }}>|</span>
                        )}
                        <span style={{ color: i < firstLineTypedLength ? 'white' : 'transparent' }}>{char}</span>
                      </span>
                    ))}
                    {firstLineTypedLength === fullFirstLine.length && isTypingFirstLine && (
                      <span className="animate-blink" style={{ display: 'inline-block', width: 0, overflow: 'visible' }}>|</span>
                    )}
                  </span>
                  {/* Second line - pink text */}
                  <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
                    {fullSecondLine.split('').map((char, i) => (
                      <span key={i}>
                        {i === secondLineTypedLength && isTypingSecondLine && (
                          <span className="animate-blink" style={{ display: 'inline-block', width: 0, overflow: 'visible', color: '#EF0B72' }}>|</span>
                        )}
                        <span style={{ color: i < secondLineTypedLength ? '#EF0B72' : 'transparent' }}>{char}</span>
                      </span>
                    ))}
                    {secondLineTypedLength === fullSecondLine.length && isTypingSecondLine && (
                      <span className="animate-blink" style={{ display: 'inline-block', width: 0, overflow: 'visible', color: '#EF0B72' }}>|</span>
                    )}
                  </span>
                </>
              );
            })()}
          </h1>
        </div>

        <div className="w-full">

        {/* Title above the box */}
        <h2 className="text-lg font-semibold text-white pl-1 auth-form-title" style={{ marginBottom: '0.15rem' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {/* Form Card */}
        <div
          className="bg-white text-black px-5 py-4 rounded-md auth-form-card"
          style={{
            animation: 'scaleUp 0.2s ease-out'
          }}
        >

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-2 mb-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="truncate">Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('linkedin_oidc')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0077B5] text-white rounded-lg px-3 py-2 text-sm hover:bg-[#006097] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed auth-linkedin-btn"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="truncate">Continue with LinkedIn</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative" style={{ marginBottom: '0.625rem' }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className={`grid grid-cols-2 gap-2 transition-all duration-200 ${isLogin ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100'}`}>
              <div>
                <label className="block text-sm font-medium mb-0.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-md"
                  placeholder="John"
                  disabled={isLogin}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-0.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-md"
                  placeholder="Doe"
                  disabled={isLogin}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 auth-form-grid-stack">
              <div>
                <label className="block text-sm font-medium mb-0.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-md"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-0.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-md"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#EF0B72] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#D50A65] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          {/* Temporary Google AdSense Verification Button */}
          {!isLogin && (
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  setError("");
                  // Using dedicated test account for AdSense verification
                  await signIn("adsense-verify@igniteeducation.org", "IgniteVerify2024!");
                  navigate("/progress");
                } catch (err) {
                  setError("Verification failed. Please contact support.");
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-yellow-500 text-black rounded-lg px-4 py-2 text-sm font-semibold hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed mt-3"
            >
              🔍 Google AdSense Verification - Click Here
            </button>
          )}

          <div className="text-center" style={{ marginTop: '0.5rem' }}>
            {isLogin ? (
              <div className="flex items-center justify-center gap-4 auth-links">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-black hover:text-[#EF0B72] transition"
                  style={{ fontSize: '0.85em' }}
                >
                  Don't have an account?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(true);
                    setResetEmail(email);
                    setResetSuccess(false);
                    setError('');
                  }}
                  className="text-black hover:text-[#EF0B72] transition"
                  style={{ fontSize: '0.85em' }}
                >
                  Reset password
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-black hover:text-[#EF0B72] transition"
                style={{ fontSize: '0.85em' }}
              >
                Already have an account?
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Scroll Down Arrow */}
        <div className="mt-8">
          <button
            onClick={scrollToMarketing}
            className="bg-white hover:bg-gray-100 transition shadow-lg group rounded-lg"
            style={{
              animation: 'subtleBounce 2s infinite',
              padding: '11px'
            }}
            aria-label="Scroll to learn more"
          >
            <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
          </button>
        </div>
      </div>
      </div>

      {/* Second Section - Education Philosophy */}
        <div
          ref={marketingSectionRef}
          className="min-h-screen flex items-center justify-center px-8 relative auth-section-2"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-4xl w-full text-white">
            <div className="w-full max-w-3xl mx-auto px-4">
              <h2 className="text-5xl font-bold leading-tight text-left w-full inline-block auth-education-heading" style={{ minHeight: '240px' }}>
                <span style={{ display: 'inline', whiteSpace: 'normal' }}>
                  {renderTypedEducation()}
                </span>
              </h2>

              {/* Feature bullets - fade in after typing completes - reserve space */}
              <div className="w-full auth-features-container" style={{ minHeight: '280px', marginTop: '7.526px' }}>
                <div className="space-y-3 text-left auth-promises-list">
                  {isEducationTypingComplete && (
                    <>
                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '1.2s', opacity: 0, animationFillMode: 'forwards' }}>
                        <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="leading-snug font-light">
                          <div className="text-lg font-semibold text-white">Built by Industry Experts</div>
                          <div className="text-base text-white auth-promise-subtext">Our courses are built with industry experts to ensure you get the latest area expertise.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '2.4s', opacity: 0, animationFillMode: 'forwards' }}>
                        <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="leading-snug font-light">
                          <div className="text-lg font-semibold text-white">Ignite is Free</div>
                          <div className="text-base text-white auth-promise-subtext">All of our courses are completely free. We're funded by limited ads, not your finances.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '3.6s', opacity: 0, animationFillMode: 'forwards' }}>
                        <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="leading-snug font-light">
                          <div className="text-lg font-semibold text-white">No Educational Prerequisite</div>
                          <div className="text-base text-white auth-promise-subtext">You don't need any experience to study. Our curricula is built for all backgrounds.</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Mobile Arrow - inside content container for proper centering */}
              <div className="md:hidden auth-section-2-mobile-arrow mt-8">
                <button
                  onClick={scrollToCourses}
                  className={`bg-white hover:bg-gray-100 transition shadow-lg group ${isLogin ? 'rounded-full' : 'rounded-lg'}`}
                  style={{
                    animation: 'subtleBounce 2s infinite',
                    padding: '11px'
                  }}
                  aria-label="Scroll to courses"
                >
                  <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
                </button>
              </div>
            </div>
          </div>

          {/* Scroll Down Arrow - Absolutely positioned (desktop only) */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 auth-section-2-arrow hidden md:flex">
            <button
              onClick={scrollToCourses}
              className={`bg-white hover:bg-gray-100 transition shadow-lg group ${isLogin ? 'rounded-full' : 'rounded-lg'}`}
              style={{
                animation: 'subtleBounce 2s infinite',
                padding: '11px'
              }}
              aria-label="Scroll to courses"
            >
              <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
            </button>
          </div>
        </div>

      {/* Third Section - Courses */}
        <div
          ref={coursesSectionRef}
          className="min-h-screen flex items-center justify-center px-8 relative auth-section-3"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-7xl w-full text-white">
            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-12 px-4 w-full items-center auth-section-3-grid">
              {/* Left Column - Description */}
              <div className="flex items-center justify-center auth-section-3-left" style={{ paddingLeft: '52.8px', paddingRight: '48px' }}>
                <div className="flex flex-col items-start">
                  <h3 className="font-bold text-white text-left auth-section-3-title" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px', marginBottom: '0rem' }}>
                    {renderTypedCoursesTitle()}
                  </h3>
                  <p className="text-lg text-white mb-6 max-w-2xl text-left auth-section-3-description" style={{ lineHeight: '1.425' }}>
                    We work backwards from industry professionals to build bespoke courses. Because of this, our course content is comprehensive, relevant and in-demand by employers.
                  </p>
                  <img
                    src="https://auth.ignite.education/storage/v1/object/public/assets/envato-labs-image-edit.jpg"
                    alt="Ignite interactive course curriculum showing AI-powered lessons, flashcards, and knowledge checks"
                    className="rounded-lg auth-section-3-image"
                    style={{ width: '70%' }}
                    loading="lazy"
                    width="1400"
                    height="900"
                  />
                </div>
              </div>

              {/* Right Column - Swipeable 2x2 Course Grid */}
              <div className="relative auth-section-3-right" style={{ marginLeft: '-50px', overflow: 'visible' }}>
                <div
                  ref={courseCardsScrollRef}
                  className="overflow-x-auto overflow-y-visible auth-course-cards-scroll"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    scrollSnapType: 'x mandatory',
                    paddingLeft: '30px', paddingRight: '315px', paddingTop: '15px', paddingBottom: '15px'
                  }}
                >
                  <style>{`
                    .overflow-x-auto::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  <div className="flex gap-3 auth-course-cards-container" style={{ marginRight: '300px' }}>
                  {courses.length > 0 ? (() => {
                    const pages = [];
                    for (let i = 0; i < courses.length; i += 4) {
                      pages.push(courses.slice(i, i + 4));
                    }
                    return pages.map((pageCourses, pageIndex) => (
                      <div
                        key={`page-${pageIndex}`}
                        className="grid grid-cols-2 gap-3 flex-shrink-0 auth-course-cards-grid"
                        style={{
          width: '510px', minWidth: '510px', maxWidth: '510px', overflow: 'visible'
                        }}
                      >
{pageCourses.map((course, localIndex) => {
                    const globalIndex = pageIndex * 4 + localIndex;
                    const isBlurred = blurredCards.includes(globalIndex);
                    return (
                      <div
                        key={course.name}
                        data-course-card
                        className="relative cursor-pointer flex-shrink-0 auth-course-card"
                        style={{ width: '249px', height: '249px', scrollSnapAlign: 'start', scrollMarginLeft: '5px', filter: isBlurred ? 'blur(1px) brightness(0.7)' : 'none', transition: 'filter 200ms ease-out', overflow: 'visible' }}
                        onClick={() => setSelectedCourseModal(course.name)}
                      >
                        <div
                          className="absolute inset-0 bg-white text-black rounded transition-all duration-300 ease-in-out flex flex-col justify-start hover:shadow-2xl aspect-square cursor-pointer auth-course-card-inner"
                          style={{ transformOrigin: 'center', isolation: 'isolate', willChange: 'transform', zIndex: 1, backfaceVisibility: 'hidden', transition: 'transform 100ms ease-in-out' }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.zIndex = '20'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                        >
                        <div className="flex flex-col h-full auth-course-card-content" style={{ padding: "13px", backgroundColor: "white", borderRadius: "inherit" }}>
                          <h4 className="text-lg font-semibold auth-course-card-title" style={{ color: '#7714E0', marginBottom: '5.1px', lineHeight: '23px' }}>{course.title}</h4>
                          {course.description && (
                            <p className="text-xs text-black mb-2 auth-course-card-description" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                              {(() => {
                                const firstSentenceEnd = course.description.indexOf('. ');
                                return firstSentenceEnd !== -1
                                  ? course.description.substring(0, firstSentenceEnd + 1)
                                  : course.description;
                              })()}
                            </p>
                          )}
                          {course.module_names && (
                            <div className="pb-8 auth-course-card-modules">
                              <p className="text-xs text-black font-semibold mb-1">Modules:</p>
                              <ul className="text-xs text-black space-y-0.5">
                                {course.module_names.split(', ').slice(0, course.title.length > 25 ? 4 : 5).map((moduleName, idx) => (
                                  <li key={idx} className={`flex items-start auth-course-card-module-item ${idx >= 3 ? 'auth-course-card-module-extra' : ''}`}>
                                    <span className="mr-1.5">•</span>
                                    <span className="line-clamp-1">{moduleName}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Plus Icon */}
                        <div className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded auth-course-card-plus">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        </div>
                      </div>
                    );
                        })}
                      </div>
                    ));
                  })() : (
                    // Skeleton cards while loading
                    <div 
                      className="grid grid-cols-2 gap-3 flex-shrink-0"
                      style={{ 
                        width: '510px'
                      }}
                    >
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-white/10 rounded aspect-square flex flex-col justify-start overflow-hidden animate-pulse"
                          style={{ padding: '16px' }}
                        >
                          <div className="h-6 bg-white/20 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-white/20 rounded w-full mb-1"></div>
                          <div className="h-4 bg-white/20 rounded w-5/6 mb-1"></div>
                          <div className="h-4 bg-white/20 rounded w-4/5 mb-3"></div>
                          <div className="h-3 bg-white/20 rounded w-1/2 mb-2"></div>
                          <div className="space-y-1">
                            <div className="h-3 bg-white/20 rounded w-full"></div>
                            <div className="h-3 bg-white/20 rounded w-11/12"></div>
                            <div className="h-3 bg-white/20 rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                                              </div>
                  )}
                  </div>
                </div>
                {/* Scroll Down Arrow - positioned relative to course cards */}
                <div className="flex justify-center auth-section-3-arrow" style={{ marginTop: '1.5rem' }}>
                  <button
                    onClick={scrollToLearningModel}
                    className={`bg-white hover:bg-gray-100 transition shadow-lg group ${isLogin ? 'rounded-full' : 'rounded-lg'}`}
                    style={{
                      animation: 'subtleBounce 2s infinite',
                      padding: '11px'
                    }}
                    aria-label="Scroll to learning model"
                  >
                    <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Fourth Section - Learning Model */}
        <div
          ref={learningModelSectionRef}
          className="min-h-screen flex items-center justify-center px-8 auth-section-4"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-4xl mx-auto text-white text-left">
            {/* Learning Model Section */}
            <div className="px-4 auth-section-4-content">
              <h3 className="font-bold text-white text-left auth-section-4-title" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px', marginBottom: '0.5rem', marginTop: '2rem' }}>
                {renderTypedLearningTagline()}
              </h3>

              <div className="grid grid-cols-2 gap-3 items-center auth-section-4-grid">
                {/* Left Column - Feature Cards */}
                <div className="space-y-3 flex-shrink-0 auth-section-4-cards">
                  {/* Card 1 - AI smarts */}
                  <div
                    onMouseEnter={() => {
                      setTimeout(() => {
                        setActiveCard(0);
                        setIsCardManuallySelected(true);
                      }, 300);
                    }}
                    className={`rounded cursor-pointer ${
                      activeCard === 0
                        ? 'shadow-xl'
                        : ''
                    }`}
                    style={{
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: activeCard === 0 ? '10rem' : '5rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      backgroundColor: activeCard === 0 ? '#FFFFFF' : '#F0F0F2'
                    }}
                  >
                    <h4 className="font-semibold text-black leading-tight transition-all duration-500" style={{ fontSize: activeCard === 0 ? '23px' : '20px' }}>
                      Levelling up learning<br />with <span style={{ color: '#7714E0' }}>smart AI integration.</span>
                    </h4>
                    {activeCard === 0 && (
                      <p className="text-black text-sm" style={{
                        marginTop: '0.2rem',
                        animation: 'fadeIn 200ms ease-in forwards',
                        animationDelay: '300ms',
                        opacity: 0
                      }}>
                        Learn like never before with Chat with Will, Smart Notes, Voice Over and Knowledge Check, all personalised and bespoke to you.
                      </p>
                    )}
                  </div>

                  {/* Card 2 - Personalised support */}
                  <div
                    onMouseEnter={() => {
                      setTimeout(() => {
                        setActiveCard(1);
                        setIsCardManuallySelected(true);
                      }, 300);
                    }}
                    className={`rounded cursor-pointer ${
                      activeCard === 1
                        ? 'shadow-xl'
                        : ''
                    }`}
                    style={{
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: activeCard === 1 ? '10rem' : '5rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      backgroundColor: activeCard === 1 ? '#FFFFFF' : '#F0F0F2'
                    }}
                  >
                    <h4 className="font-semibold text-black leading-tight transition-all duration-500" style={{ fontSize: activeCard === 1 ? '23px' : '20px' }}>
                      Personalised support<br />from <span style={{ color: '#7714E0' }}>industry professionals.</span>
                    </h4>
                    {activeCard === 1 && (
                      <p className="text-black text-sm" style={{
                        marginTop: '0.2rem',
                        animation: 'fadeIn 200ms ease-in forwards',
                        animationDelay: '300ms',
                        opacity: 0
                      }}>
                        Ignite courses are built by industry professionals. If you want 1:1 support, you can talk to them through Office Hours at a time that suits you.
                      </p>
                    )}
                  </div>

                  {/* Card 3 - Community */}
                  <div
                    onMouseEnter={() => {
                      setTimeout(() => {
                        setActiveCard(2);
                        setIsCardManuallySelected(true);
                      }, 300);
                    }}
                    className={`rounded cursor-pointer ${
                      activeCard === 2
                        ? 'shadow-xl'
                        : ''
                    }`}
                    style={{
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: activeCard === 2 ? '10rem' : '5rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      backgroundColor: activeCard === 2 ? '#FFFFFF' : '#F0F0F2'
                    }}
                  >
                    <h4 className="font-semibold text-black leading-tight transition-all duration-500" style={{ fontSize: activeCard === 2 ? '23px' : '20px' }}>
                      Connect with<br />the <span style={{ color: '#7714E0' }}>global community.</span>
                    </h4>
                    {activeCard === 2 && (
                      <p className="text-black text-sm" style={{
                        marginTop: '0.2rem',
                        animation: 'fadeIn 200ms ease-in forwards',
                        animationDelay: '300ms',
                        opacity: 0
                      }}>
                        Hear the latest conversation, industry trends and ask a question to other people in your specialism through the global Community Forum.
                      </p>
                    )}
                  </div>

                  {/* Card 4 - Get certified */}
                  <div
                    onMouseEnter={() => {
                      setTimeout(() => {
                        setActiveCard(3);
                        setIsCardManuallySelected(true);
                      }, 300);
                    }}
                    className={`rounded cursor-pointer ${
                      activeCard === 3
                        ? 'shadow-xl'
                        : ''
                    }`}
                    style={{
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: activeCard === 3 ? '10rem' : '5rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      backgroundColor: activeCard === 3 ? '#FFFFFF' : '#F0F0F2'
                    }}
                  >
                    <h4 className="font-semibold text-black leading-tight transition-all duration-500" style={{ fontSize: activeCard === 3 ? '23px' : '20px' }}>
                      Get certified<br />to <span style={{ color: '#7714E0' }}>take on your next role.</span>
                    </h4>
                    {activeCard === 3 && (
                      <p className="text-black text-sm" style={{
                        marginTop: '0.2rem',
                        animation: 'fadeIn 200ms ease-in forwards',
                        animationDelay: '300ms',
                        opacity: 0
                      }}>
                        Upon completing the course, you'll get a personalised certification demonstrating your knowledge with future employers and to share on LinkedIn.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column - Dynamic Content */}
                <div className="flex items-center justify-center auth-section-4-media">
                  <div className="rounded transition-all duration-500 bg-white p-8 auth-section-4-media-box" style={{ height: '27.25rem', width: '32.2rem' }}>
                    {activeCard === 2 && (
                      <video
                        autoPlay
                        muted
                        loop
                        controls
                        className="w-full h-full rounded object-cover"
                        style={{
                          animation: 'fadeIn 200ms ease-in forwards',
                          animationDelay: '300ms',
                          opacity: 0
                        }}
                      >
                        <source src="https://auth.ignite.education/storage/v1/object/public/assets/Screen%20Recording%202025-11-24%20at%2017.59.52.mov" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                </div>
              </div>

            {/* Scroll Down Arrow */}
            <div className="flex justify-center mt-8">
              <button
                onClick={scrollToTestimonials}
                className="bg-white hover:bg-gray-100 transition shadow-lg group rounded-lg"
                style={{
                  animation: 'subtleBounce 2s infinite',
                  padding: '11px'
                }}
                aria-label="Scroll to testimonials"
              >
                <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
              </button>
            </div>
            </div>
          </div>


        </div>

      {/* Fifth Section - Merged Testimonials & Use Cases */}
        <div
          ref={testimonialsSectionRef}
          className="min-h-screen flex items-center justify-center px-8"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="w-full text-white text-left">
            {/* Title Container */}
            <div className="max-w-4xl mx-auto px-4">
              <h3 className="font-bold text-white text-left" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px', marginBottom: '2.8rem' }}>
                {renderTypedTestimonialsHeading()}
              </h3>
            </div>

            {/* Testimonials and Cards Container */}
            <div style={{ maxWidth: '70rem', paddingLeft: '4rem', paddingRight: '0rem' }} className="mx-auto">
              <div className="grid grid-cols-2 gap-12 items-start">
                {/* Left Column - Testimonials Slider */}
                <div className="flex flex-col justify-center"
                  onMouseEnter={() => setIsTestimonialHovered(true)}
                  onMouseLeave={() => setIsTestimonialHovered(false)}>
                  <div className="relative">
                    {[
                      {
                        quote: "I was completely lost about my career direction. Ignite helped me identify my strengths and understand the paths I could take. Crazy considering it's free.",
                        name: "Amelia Chen",
                        role: "Junior Designer",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/2.png"
                      },
                      {
                        quote: "Ignite gave me the confidence to change careers. Best decision I've made.",
                        name: "Sarah Matthews",
                        role: "Product Marketing Manager",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/1.png"
                      },
                      {
                        quote: "University teaches theory, but Ignite taught me how to actually succeed in the workplace. Wish I'd found this sooner!",
                        name: "James Patel",
                        role: "University Student",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/3.png"
                      },
                      {
                        quote: "Taking a career break left me feeling out of touch. Following the course and using the neat AI features allowed me learn at my own pace. I'm now really enjoying my new role.",
                        name: "Rebecca Thompson",
                        role: "Former Teacher",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/4.png"
                      },
                      {
                        quote: "Fresh perspectives that actually made a difference. Working at my own pace meant I could properly reflect and apply what I learned.",
                        name: "David Morrison",
                        role: "Sr Product Manager",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/5.png"
                      }
                    ].map((testimonial, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-6 rounded flex items-center justify-center"
                        style={{
                          position: idx === 0 ? 'relative' : 'absolute',
                          top: idx === 0 ? 'auto' : 0,
                          left: idx === 0 ? 'auto' : 0,
                          right: idx === 0 ? 'auto' : 0,
                          opacity: currentTestimonialIndex === idx ? 1 : 0,
                          pointerEvents: currentTestimonialIndex === idx ? 'auto' : 'none',
                          transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          width: '576px',
                          height: '324.8px',
                          overflow: 'visible'
                        }}
                      >
                        <div style={{ paddingBottom: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px' }}>
                          <p className="text-gray-900 text-2xl font-medium leading-snug text-left" style={{ maxWidth: '80%' }}>
                            <span style={{ fontWeight: 'bold' }}>"</span>{testimonial.quote}<span style={{ fontWeight: 'bold' }}>"</span>
                          </p>
                        </div>
                        {/* Avatar positioned on bottom edge */}
                        <div
                          className="w-24 h-24 rounded flex-shrink-0"
                          style={{
                            position: 'absolute',
                            bottom: '-40px',
                            left: '44px',
                            backgroundImage: `url(${testimonial.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        ></div>
                        {/* Name and role positioned at bottom edge */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '155px',
                            lineHeight: '1.2'
                          }}
                        >
                          <div className="font-semibold text-black">{testimonial.name}</div>
                          <div className="text-sm text-gray-600">{testimonial.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Carousel Indicators */}
                  <div className="flex justify-center gap-2" style={{ width: '576px', marginTop: '1rem', marginLeft: '20px' }}>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentTestimonialIndex(idx)}
                        className={`transition-all duration-300 ${
                          currentTestimonialIndex === idx
                            ? 'bg-[#EF0B72]'
                            : 'bg-white hover:bg-gray-300'
                        }`}
                        style={{
                          width: currentTestimonialIndex === idx ? '32px' : '10px',
                          height: '10px',
                          borderRadius: '2px'
                        }}
                        aria-label={`Go to testimonial ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>


                {/* Right Column - 2x2 Grid of Cards */}
                <div className="flex items-center justify-center">
                  <div className="relative" style={{ width: '21.35rem', height: '20.3rem' }}>
                    {[
                      {
                        title: 'Recent Graduates',
                        description: 'Launch your career with industry-relevant skills and hands-on experience that employers value. Our comprehensive courses provide you with practical knowledge and real-world projects to build a strong portfolio.',
                        position: { top: '0', left: '0' }
                      },
                      {
                        title: 'Career Break Returners',
                        description: 'Refresh your skills and confidently re-enter the workforce with updated knowledge and support. We understand the challenges of returning to work and provide a supportive environment to rebuild your confidence.',
                        position: { top: '0', left: '11.05rem' }
                      },
                      {
                        title: 'Upskilling in Role',
                        description: 'Stay ahead in your current position by mastering the latest tools and techniques in your field. Learn at your own pace while applying new skills directly to your current role for immediate impact.',
                        position: { top: '10.525rem', left: '0' }
                      },
                      {
                        title: 'Pivotting Careers',
                        description: 'Transform your career path with comprehensive training designed to help you transition successfully. We provide structured learning paths that bridge your existing experience with new career opportunities.',
                        position: { top: '10.525rem', left: '11.05rem' }
                      }
                    ].map((card, idx) => (
                      <div
                        key={idx}
                        onMouseEnter={() => {
                          setHoveredUseCase(idx);
                        }}
                        onMouseLeave={() => {
                          setHoveredUseCase(null);
                        }}
                        className="rounded flex items-center justify-center cursor-pointer bg-white absolute"
                        style={{
                          height: '9.775rem',
                          width: '10.3rem',
                          top: card.position.top,
                          left: card.position.left,
                          zIndex: 1,
                          padding: '1.5rem',
                          opacity: hoveredUseCase !== null ? 0 : 1,
                          transition: 'opacity 300ms ease-in-out',
                          pointerEvents: 'auto'
                        }}
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <h4 className="font-semibold leading-tight text-lg" style={{
                            color: '#7714E0'
                          }}>
                            {card.title === 'Career Break Returners' ? (
                              <>Career Break<br />Returners</>
                            ) : card.title === 'Upskilling in Role' ? (
                              <>Upskilling<br />in Role</>
                            ) : card.title}
                          </h4>
                        </div>
                      </div>
                    ))}

                    {/* Single overlay card that covers entire grid */}
                    <div
                      onMouseEnter={() => {
                        if (hoveredUseCase !== null) {
                          setHoveredUseCase(hoveredUseCase);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredUseCase(null);
                      }}
                      className="absolute rounded flex items-center justify-center bg-white"
                      style={{
                        top: 0,
                        left: 0,
                        width: '21.35rem',
                        height: '20.3rem',
                        zIndex: 10,
                        padding: '2rem',
                        opacity: hoveredUseCase !== null ? 1 : 0,
                        visibility: hoveredUseCase !== null ? 'visible' : 'hidden',
                        transition: 'opacity 300ms ease-in-out, visibility 300ms ease-in-out',
                        pointerEvents: hoveredUseCase !== null ? 'auto' : 'none'
                      }}
                    >
                      <div className="flex flex-col items-center justify-center text-center" style={{
                        animation: hoveredUseCase !== null ? 'fadeIn 400ms ease-in forwards' : 'none',
                        animationDelay: '100ms',
                        opacity: 0
                      }}>
                        <h4 className="font-semibold leading-tight text-2xl mb-4" style={{
                          color: '#7714E0'
                        }}>
                          {hoveredUseCase !== null ? [
                            { title: 'Recent Graduates', description: 'Launch your career with industry-relevant skills and hands-on experience that employers value. Our comprehensive courses provide you with practical knowledge and real-world projects to build a strong portfolio.' },
                            { title: 'Career Break Returners', description: 'Refresh your skills and confidently re-enter the workforce with updated knowledge and support. We understand the challenges of returning to work and provide a supportive environment to rebuild your confidence.' },
                            { title: 'Upskilling in Role', description: 'Stay ahead in your current position by mastering the latest tools and techniques in your field. Learn at your own pace while applying new skills directly to your current role for immediate impact.' },
                            { title: 'Pivotting Careers', description: 'Transform your career path with comprehensive training designed to help you transition successfully. We provide structured learning paths that bridge your existing experience with new career opportunities.' }
                          ][hoveredUseCase].title : ''}
                        </h4>
                        <p className="text-black text-base leading-relaxed">
                          {hoveredUseCase !== null ? [
                            { title: 'Recent Graduates', description: 'Launch your career with industry-relevant skills and hands-on experience that employers value. Our comprehensive courses provide you with practical knowledge and real-world projects to build a strong portfolio.' },
                            { title: 'Career Break Returners', description: 'Refresh your skills and confidently re-enter the workforce with updated knowledge and support. We understand the challenges of returning to work and provide a supportive environment to rebuild your confidence.' },
                            { title: 'Upskilling in Role', description: 'Stay ahead in your current position by mastering the latest tools and techniques in your field. Learn at your own pace while applying new skills directly to your current role for immediate impact.' },
                            { title: 'Pivotting Careers', description: 'Transform your career path with comprehensive training designed to help you transition successfully. We provide structured learning paths that bridge your existing experience with new career opportunities.' }
                          ][hoveredUseCase].description : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-12">
                <button
                  onClick={() => {
                    linkedInFAQSectionRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }}
                  className="bg-white hover:bg-gray-100 transition shadow-lg group rounded-lg"
                  style={{
                    animation: 'subtleBounce 2s infinite',
                    padding: '11px'
                  }}
                  aria-label="Scroll to LinkedIn and FAQs"
                >
                  <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
                </button>
              </div>
            </div>
          </div>

      {/* Sixth Section - LinkedIn & FAQs */}
        <div
          ref={linkedInFAQSectionRef}
          className="min-h-screen flex items-center justify-center px-8"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-7xl w-full text-white">
            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-8 px-4 max-w-7xl mx-auto" style={{ marginBottom: '25px' }}>
              {/* Left Column - Blog Posts */}
              <div className="flex flex-col items-start justify-center" style={{ marginLeft: '10%' }}>
                <div className="flex justify-start w-full" style={{ minHeight: 'calc(2.4rem + 60px + 0.5rem)' }}>
                  <h3 className="font-bold text-white text-left" style={{ fontSize: '2rem', lineHeight: '1.2', minHeight: '2.4rem', paddingTop: '60px', marginBottom: '0.5rem' }}>{typedBlogHeading}</h3>
                </div>

                <div className="w-full" style={{ maxWidth: '30.8rem' }}>
                  <BlogCarousel limit={5} />
                </div>
              </div>

              {/* Right Column - FAQs */}
              <div>
                <div className="flex justify-start" style={{ minHeight: 'calc(2.4rem + 60px + 0.5rem)', width: '85%', margin: '0 auto' }}>
                  <h3 className="font-bold text-white mb-2 text-left" style={{ fontSize: '2rem', lineHeight: '1.2', minHeight: '2.4rem', paddingTop: '60px' }}>{typedFAQHeading}</h3>
                </div>

                <div className="space-y-3" style={{ height: '30.5rem', width: '85%', margin: '0 auto' }}>
                {[
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
                ].map((faq, idx) => (
                  <div
                    key={idx}
                    className="rounded cursor-pointer"
                    style={{
                      backgroundColor: expandedFAQ === idx ? '#FFFFFF' : '#F0F0F2',
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: expandedFAQ === idx ? 'calc(7.25rem + 5px)' : '3.75rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: expandedFAQ === idx ? '1.2rem' : '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      opacity: 1
                    }}
                    onMouseEnter={() => debounce('faqExpand', () => setExpandedFAQ(idx), 250)}
                  >
                    <h4 className="font-semibold leading-tight transition-all duration-500" style={{ fontSize: '20px', color: expandedFAQ === idx ? '#7714E0' : '#000000' }}>
                      {faq.question}
                    </h4>
                    {expandedFAQ === idx && (
                      <p className="text-black text-sm" style={{
                        marginTop: 'calc(0.1rem + 2px)',
                        paddingBottom: '3px',
                        animation: 'fadeIn 200ms ease-in forwards',
                        animationDelay: '300ms',
                        opacity: 0
                      }}>
                        {faq.answer}
                      </p>
                    )}
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* Get Started Button */}
            <div className="flex justify-center px-4 pb-8" style={{ paddingTop: '0px' }}>
              <button
                onClick={() => {
                  if (authScrollContainerRef.current) {
                    authScrollContainerRef.current.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                    });
                  }
                }}
                className="bg-[#EF0B72] hover:bg-[#D50A65] text-white font-semibold py-3 px-8 rounded transition"
                style={{ fontSize: '15px' }}
              >
                Get Started
              </button>
            </div>

            {/* Footer Links */}
            <div className="flex justify-center gap-8 px-4 pb-12">
              <a
                href="mailto:hello@ignite.education"
                className="text-white hover:text-[#EF0B72] transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                Contact
              </a>
              <a
                href="https://www.linkedin.com/school/ignite-courses/jobs/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                Careers
              </a>
              <a
                href="https://www.linkedin.com/school/ignite-courses/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                LinkedIn
              </a>
              <a
                href="/privacy"
                className="text-white hover:text-[#EF0B72] transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                Policy
              </a>
              <a
                href="/terms"
                className="text-white hover:text-[#EF0B72] transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                Terms
              </a>
            </div>
          </div>
        </div>
    </div>

    {/* Password Reset Modal */}
    {showResetPassword && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
        }}
        onClick={() => {
          setShowResetPassword(false);
          setResetSuccess(false);
          setError('');
        }}
      >
        <div className="relative">
          <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
            Reset Password
          </h2>

          <div
            className="bg-white relative"
            style={{
              width: '450px',
              maxWidth: '90vw',
              animation: 'scaleUp 0.2s ease-out',
              padding: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowResetPassword(false);
                setResetSuccess(false);
                setError('');
              }}
              className="absolute top-4 right-4 text-gray-600 hover:text-black"
            >
              <X size={24} />
            </button>

            {!resetSuccess ? (
              <>
                <p className="text-gray-700 mb-4 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleResetPassword}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-black">Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg"
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#EF0B72] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#D50A65] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">Check Your Email</h3>
                <p className="text-gray-700 text-sm mb-4">
                  We've sent a password reset link to <strong>{resetEmail}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Course Details Modal */}
    {selectedCourse && (
      <div
        className="fixed inset-0 flex items-center justify-center backdrop-blur-sm animate-fadeIn"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
          zIndex: 9999,
        }}
        onClick={() => setSelectedCourseModal(null)}
      >
        <div className="relative auth-course-modal-container">
          <>
            {/* Title and close button row - above the box */}
            <div className="flex justify-between items-center" style={{ marginBottom: '0.15rem' }}>
              <h2 className="font-semibold text-white pl-1 auth-course-modal-title" style={{ fontSize: '1.35rem' }}>
                {selectedCourse.title}
              </h2>
              <button
                onClick={() => setSelectedCourseModal(null)}
                className="text-white hover:text-gray-300 z-10 auth-course-modal-close"
              >
                <X size={24} />
              </button>
            </div>

          <div
            className="bg-white relative flex flex-col animate-scaleUp auth-course-modal"
            style={{
              width: '720px',
              height: '70vh',
              borderRadius: '6px',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto px-8 auth-course-modal-content"
              style={{ scrollbarWidth: 'none', paddingTop: '1.6rem', paddingBottom: '1.25rem' }}
            >
              <div>
                {selectedCourse.status === 'requested' && (
                  <div className="mb-6">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">Requested</span>
                  </div>
                )}

                {/* Full description */}
                <div className="text-black leading-relaxed mb-6 auth-course-modal-description" style={{ maxWidth: '100%', marginTop: '0.3rem' }}>
                  {(() => {
                    const description = selectedCourse.description || '';
                    const firstSentenceEnd = description.indexOf('. ');
                    if (firstSentenceEnd !== -1) {
                      const firstSentence = description.substring(0, firstSentenceEnd + 1);
                      const restOfDescription = description.substring(firstSentenceEnd + 1).trim();
                      // Highlight "leading products from concept to launch" in pink
                      const pinkPhrase = 'leading products from concept to launch';
                      const pinkIndex = firstSentence.toLowerCase().indexOf(pinkPhrase);

                      if (pinkIndex !== -1) {
                        const before = firstSentence.substring(0, pinkIndex);
                        const pink = firstSentence.substring(pinkIndex, pinkIndex + pinkPhrase.length);
                        const after = firstSentence.substring(pinkIndex + pinkPhrase.length);

                        return (
                          <>
                            <span className="auth-course-modal-first-sentence" style={{ fontWeight: 600, fontSize: '20px' }}>
                              {before}
                              <span style={{ color: '#EF0B72' }}>{pink}</span>
                              {after}
                            </span>
                            {restOfDescription && (
                              <span className="auth-course-modal-rest-description" style={{ fontWeight: 400, fontSize: '15px', display: 'block', marginTop: '0.7rem' }}>{restOfDescription}</span>
                            )}
                          </>
                        );
                      }

                      return (
                        <>
                          <span className="auth-course-modal-first-sentence" style={{ fontWeight: 600, fontSize: '20px' }}>{firstSentence}</span>
                          {restOfDescription && (
                            <span className="auth-course-modal-rest-description" style={{ fontWeight: 400, fontSize: '15px', display: 'block', marginTop: '0.7rem' }}>{restOfDescription}</span>
                          )}
                        </>
                      );
                    }
                    return <span className="auth-course-modal-first-sentence" style={{ fontWeight: 600, fontSize: '20px' }}>{description}</span>;
                  })()}
                </div>

                {/* Course Benefits - Single Row Layout */}
                <div className="flex items-center" style={{ minHeight: '80px', marginTop: '-7.2px', marginBottom: '19.2px' }}>
                  <div className="grid grid-cols-3 gap-x-8 text-base text-black font-medium w-full auth-course-modal-benefits">
                    <div className="flex items-center" style={{ paddingLeft: '1rem' }}>
                      <div className="bg-white rounded p-0.5 flex-shrink-0" style={{ marginRight: '11.52px', transform: 'scale(1.92)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="#EF0B72" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <span className="leading-tight">Certificate upon<br/>completion</span>
                    </div>
                    <div className="flex items-center" style={{ paddingLeft: '1rem' }}>
                      <div className="bg-white rounded p-0.5 flex-shrink-0" style={{ marginRight: '11.52px', transform: 'scale(1.92)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="#EF0B72" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                        </svg>
                      </div>
                      <span className="leading-tight">Taught by<br/>experts</span>
                    </div>
                    <div className="flex items-center" style={{ paddingLeft: '1rem' }}>
                      <div className="bg-white rounded p-0.5 flex-shrink-0" style={{ marginRight: '11.52px', transform: 'scale(1.92)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="#EF0B72" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                        </svg>
                      </div>
                      <span className="leading-tight">Self-paced<br/>learning</span>
                    </div>
                  </div>
                </div>


                {/* Curriculum Section */}
                {selectedCourse.module_structure && Array.isArray(selectedCourse.module_structure) && selectedCourse.module_structure.length > 0 ? (
                  <div className="mb-6" style={{ marginLeft: '-2rem', marginRight: '-2rem', backgroundColor: '#F0F0F2', paddingTop: '1.6rem', paddingRight: '2rem', paddingBottom: '2rem', paddingLeft: '2rem' }}>
                    <h3 className="font-semibold text-gray-900" style={{ fontSize: '22px', marginBottom: '0.3rem' }}>
                      Curriculum
                    </h3>
                    <div className="space-y-6">
                      {selectedCourse.module_structure.map((module, moduleIndex) => (
                        <div key={moduleIndex}>
                          {/* Module Title */}
                          <h4 className="font-semibold mb-1" style={{ fontSize: '18px', color: '#7714E0' }}>
                            Module {moduleIndex + 1} - {module.name}
                          </h4>

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
                                  <span className="text-gray-900" style={{ fontSize: '0.5em' }}>■</span>
                                  <span className="font-medium text-gray-900">{lesson.name}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Fallback for courses without module_structure */
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-3 text-gray-900">Course Structure</h3>
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        <strong>
                          {selectedCourse.modules && selectedCourse.modules.toLowerCase() === 'multiple'
                            ? 'Multiple comprehensive modules'
                            : `${selectedCourse.modules} comprehensive module${selectedCourse.modules !== '1' ? 's' : ''}`}
                        </strong>
                      </p>
                      {selectedCourse.lessons > 0 && (
                        <p className="text-gray-700">{selectedCourse.lessons} lessons</p>
                      )}
                      {selectedCourse.duration && (
                        <p className="text-gray-700">Duration: {selectedCourse.duration}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Course Quote Section - Only for live courses */}
                {selectedCourse.status === 'live' && (
                  <div className="mb-6 p-6 rounded-lg" style={{ backgroundColor: '#F0F0F2' }}>
                    <p className="text-black text-lg font-medium">
                      "The Product Manager course was great! For someone new to the topic, this is a great introduction and allowed me to connect with the community"
                    </p>
                  </div>
                )}

                {/* Course Coaches Section - Always rendered with min-height to prevent layout shift */}
                <div className="mb-6" style={{ minHeight: selectedCourseCoaches.length > 0 ? 'auto' : '0' }}>
                  {selectedCourseCoaches.length > 0 && (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-3" style={{ fontSize: '22px' }}>
                        Course Leaders
                      </h3>
                      <div className="flex flex-col gap-4">
                        {selectedCourseCoaches.map((coach, index) => (
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
                                    onError={(e) => {
                                      e.target.src = '';
                                      e.target.style.display = 'none';
                                    }}
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
                                    onError={(e) => {
                                      e.target.src = '';
                                      e.target.style.display = 'none';
                                    }}
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
                    </>
                  )}
                </div>

                {/* Get Started Button */}
                <div className="mt-6">
                  <button
                onClick={async () => {
                  if (selectedCourse.status === 'live' && user) {
                    try {
                      console.log('📝 Enrolling in course:', {
                        courseId: selectedCourse.id,
                        courseName: selectedCourse.name,
                        courseTitle: selectedCourse.title,
                        userId: user.id
                      });

                      // Verify the course has lesson data
                      const { data: lessonCheck, error: lessonError } = await supabase
                        .from('lessons')
                        .select('id')
                        .eq('course_id', selectedCourse.name)
                        .limit(1);

                      if (lessonError) {
                        console.error('Error checking lessons:', lessonError);
                      }

                      if (!lessonCheck || lessonCheck.length === 0) {
                        console.warn('⚠️ No lessons found for course:', selectedCourse.name);
                        console.log('Checking if module_structure exists...');

                        // Check if the course has module_structure data
                        if (!selectedCourse.module_structure || selectedCourse.module_structure.length === 0) {
                          alert(`This course doesn't have lesson content yet. Please contact support.`);
                          setSelectedCourseModal(null);
                          return;
                        }
                      }

                      // Enroll user in the course
                      const { error } = await supabase
                        .from('users')
                        .update({ enrolled_course: selectedCourse.name })
                        .eq('id', user.id);

                      if (error) throw error;

                      console.log('✅ User enrolled in course:', selectedCourse.name);

                      // Navigate to progress hub
                      window.location.href = '/progress';
                    } catch (error) {
                      console.error('Error enrolling in course:', error);
                      alert('Failed to enroll in course. Please try again.');
                    }
                  } else {
                    // Close modal first
                    setSelectedCourseModal(null);
                    // Set to sign-up mode
                    setIsLogin(false);
                    // Wait for modal close animation, then scroll to top
                    setTimeout(() => {
                      if (authScrollContainerRef.current) {
                        authScrollContainerRef.current.scrollTo({
                          top: 0,
                          behavior: 'smooth'
                        });
                      }
                    }, 300);
                  }
                }}
                className="w-full font-semibold py-3 rounded-lg transition bg-[#EF0B72] text-white hover:bg-[#D50A65]"
              >
                {selectedCourse.status === 'coming_soon' ? 'Register Interest' : 'Get Started'}
              </button>
                </div>
              </div>
            </div>
          </div>
          </>
        </div>
      </div>
    )}
    </>
  );
};

export default Auth;
