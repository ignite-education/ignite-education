import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressHub from './ProgressHub';
import Onboarding from './Onboarding';
import { ChevronDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCoachesForCourse } from '../lib/api';
import SEO from './SEO';

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
  const [linkedInPosts, setLinkedInPosts] = useState([]);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInError, setLinkedInError] = useState(null);
  const [currentLinkedInPost, setCurrentLinkedInPost] = useState(0);
  const [animateLinkedInFAQ, setAnimateLinkedInFAQ] = useState(false);
  const [typedLinkedInHeading, setTypedLinkedInHeading] = useState('');
  const [typedFAQHeading, setTypedFAQHeading] = useState('');
  const linkedInFAQSectionRef = useRef(null);
  const [courseCoaches, setCourseCoaches] = useState({});
  const authScrollContainerRef = useRef(null);

  const { user, signIn, signUp, signInWithOAuth, resetPassword } = useAuth();
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

      cards.forEach((card, globalIndex) => {
        const cardRect = card.getBoundingClientRect();
        const cardLeft = cardRect.left;
        const cardRight = cardRect.right;
        
        // A card should NOT be blurred if it's in the first visible page (left-most 4 cards)
        // Check if card is within the first page width (~510px from container left)
        const relativeLeft = cardLeft - containerLeft;
        
        // Blur cards that start beyond ~520px (outside the first 2x2 grid)
        if (relativeLeft > 520) {
          newBlurredCards.push(globalIndex);
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
      'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Screenshot%202025-10-27%20at%2019.08.45.png'
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

  // Intersection observer for LinkedIn & FAQ section animation
  useEffect(() => {
    if (!linkedInFAQSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animateLinkedInFAQ) {
            debounce('linkedInAnimation', () => {
              setAnimateLinkedInFAQ(true);
              // Start typing animations for headings
              startLinkedInFAQHeadingsTyping();
              // Fetch LinkedIn posts when section becomes visible
              fetchLinkedInPosts().catch(err => {
                console.error('Failed to fetch LinkedIn posts:', err);
              });
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
  }, [isLogin, animateLinkedInFAQ, selectedCourseModal]);

  // Auto-rotate LinkedIn posts every 5 seconds
  useEffect(() => {
    if (linkedInPosts.length === 0) return;

    const interval = setInterval(() => {
      setCurrentLinkedInPost((prev) => (prev + 1) % linkedInPosts.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [linkedInPosts.length]);

  // Fetch LinkedIn posts from backend API
  const fetchLinkedInPosts = async () => {
    if (linkedInPosts.length > 0) return; // Already fetched

    setLinkedInLoading(true);
    setLinkedInError(null);

    try {
      // Call backend API endpoint instead of direct LinkedIn API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/linkedin/posts?count=5`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const posts = await response.json();
      setLinkedInPosts(posts);
    } catch (error) {
      console.error('Error fetching LinkedIn posts:', error);
      setLinkedInLoading(false);
    }
  };

  // Typing animation for LinkedIn and FAQ headings
  const startLinkedInFAQHeadingsTyping = () => {
    const linkedInText = 'Latest from Ignite';
    const faqText = 'FAQs';
    let linkedInIndex = 0;
    let faqIndex = 0;

    // Add delay before starting typing
    setTimeout(() => {
      // Type LinkedIn heading first
      const linkedInInterval = setInterval(() => {
        if (linkedInIndex <= linkedInText.length) {
          setTypedLinkedInHeading(linkedInText.substring(0, linkedInIndex));
          linkedInIndex++;
        } else {
          clearInterval(linkedInInterval);

          // Wait 1 second, then type FAQ heading
          setTimeout(() => {
            const faqInterval = setInterval(() => {
              if (faqIndex <= faqText.length) {
                setTypedFAQHeading(faqText.substring(0, faqIndex));
                faqIndex++;
              } else {
                clearInterval(faqInterval);
              }
            }, 75); // 75ms per character
          }, 1000); // 1 second delay
        }
      }, 75); // 75ms per character
    }, 1000); // 1000ms delay before starting
  };

  // Typing animation for education text
  const startEducationTyping = () => {
    const fullText = 'Education should be \naccessible, personalised and integrated for everyone.';
    const pausePositions = [
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
    const fullText = 'Education should be \naccessible, personalised and integrated for everyone.';

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
        title="Welcome to Ignite"
        description="Transform your career with Ignite's interactive courses in Product Management, Cyber Security, Data Analysis, and UX Design. Learn from industry experts with AI-powered lessons, real-world projects, and personalized feedback."
        keywords="product management course, cyber security training, data analyst course, UX design course, online learning, AI-powered education, tech skills, career development"
        url="https://www.ignite.education/welcome"
      />
      {/* Background - Progress Hub */}
                      {/* Fixed outer container */}
                      <div
                        key={course.name}
                        data-course-card
                        style={{ position: 'relative', width: '249px', height: '249px', scrollSnapAlign: 'start' }}
                        onClick={() => setSelectedCourseModal(course.name)}
                      >
                        {/* Inner scalable card */}
                        <div
                          className="bg-white text-black rounded transition-all duration-300 ease-in-out flex flex-col justify-start hover:shadow-2xl overflow-visible aspect-square cursor-pointer"
                          style={{ position: 'absolute', inset: 0, padding: '0px', filter: isBlurred ? 'blur(1px) brightness(0.7)' : 'none', transition: 'filter 200ms ease-out, transform 100ms ease-in-out', transformOrigin: 'center', isolation: 'isolate', willChange: 'transform', zIndex: 1, backfaceVisibility: 'hidden', contain: 'layout style paint' }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.zIndex = '20'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                        >
                      >
                        <div className="flex flex-col h-full" style={{ padding: "13px", backgroundColor: "white", borderRadius: "inherit" }}>
                          <h4 className="text-lg font-semibold" style={{ color: '#7714E0', marginBottom: '5.1px', lineHeight: '23px' }}>{course.title}</h4>
                          {course.description && (
                            <p className="text-xs text-black mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                              {(() => {
                                const firstSentenceEnd = course.description.indexOf('. ');
                                return firstSentenceEnd !== -1
                                  ? course.description.substring(0, firstSentenceEnd + 1)
                                  : course.description;
                              })()}
                            </p>
                          )}
                          {course.module_names && (
                            <div className="pb-8">
                              <p className="text-xs text-black font-semibold mb-1">Modules:</p>
                              <ul className="text-xs text-black space-y-0.5">
                                {course.module_names.split(', ').slice(0, course.title.length > 25 ? 4 : 5).map((moduleName, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-1.5">•</span>
                                    <span className="line-clamp-1">{moduleName}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Plus Icon */}
                        <div className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
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
                      {/* Fixed outer container */}
                      <div
                        key={course.name}
                        data-course-card
                        style={{ position: 'relative', width: '249px', height: '249px', scrollSnapAlign: 'start' }}
                        onClick={() => setSelectedCourseModal(course.name)}
                      >
                        {/* Inner scalable card */}
                        <div
                          className="bg-white text-black rounded transition-all duration-300 ease-in-out flex flex-col justify-start hover:shadow-2xl overflow-visible aspect-square cursor-pointer"
                          style={{ position: 'absolute', inset: 0, padding: '0px', filter: isBlurred ? 'blur(1px) brightness(0.7)' : 'none', transition: 'filter 200ms ease-out, transform 100ms ease-in-out', transformOrigin: 'center', isolation: 'isolate', willChange: 'transform', zIndex: 1, backfaceVisibility: 'hidden', contain: 'layout style paint' }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.zIndex = '20'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                        >
