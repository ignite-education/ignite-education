import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Mail, Linkedin, ChevronLeft, ChevronRight, MessageSquare, Share2, ThumbsUp, ThumbsDown, MoreHorizontal, X, Lock, FileEdit, User, Inbox, CheckCircle } from 'lucide-react';
import { InlineWidget } from "react-calendly";
import { loadStripe } from '@stripe/stripe-js';
import Lottie from 'lottie-react';
import { getLessonsByModule, getLessonsMetadata, getRedditPosts, getCompletedLessons, likePost, unlikePost, getUserLikedPosts, createComment, getMultiplePostsComments, getRedditComments, createCommunityPost, generateCertificate, getUserCertificates, getCoachesForCourse } from '../lib/api';
import { isRedditAuthenticated, initiateRedditAuth, postToReddit, getRedditUsername, clearRedditTokens, voteOnReddit, commentOnReddit, getUserRedditPosts, getUserRedditComments, SUBREDDIT_FLAIRS } from '../lib/reddit';
import { useAuth } from '../contexts/AuthContext';
import { useAnimation } from '../contexts/AnimationContext';
import { supabase } from '../lib/supabase';
import LoadingScreen from './LoadingScreen';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const ProgressHub = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { firstName, user: authUser, isAdFree, signOut, updateProfile } = useAuth();
  const { lottieData } = useAnimation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ firstName: firstName || 'User', lastName: 'Smith', enrolledCourse: 'Product Management', progress: 40 });
  const [groupedLessons, setGroupedLessons] = useState({});
  const [lessonsMetadata, setLessonsMetadata] = useState([]);
  const [currentModule, setCurrentModule] = useState(1);
  const [currentLesson, setCurrentLesson] = useState(1);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [cardOffset, setCardOffset] = useState(0);
  const [showPostModal, setShowPostModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', shareToReddit: true, flair: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redditAuthenticated, setRedditAuthenticated] = useState(false);
  const [redditUsername, setRedditUsername] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [hoveredPostId, setHoveredPostId] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [hoverTimer, setHoverTimer] = useState(null);
  const [leaveTimer, setLeaveTimer] = useState(null);
  const [visiblePosts, setVisiblePosts] = useState(new Set());
  const postRefs = useRef({});
  const [collapsedHeights, setCollapsedHeights] = useState({});
  const [isCollapsing, setIsCollapsing] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [postComments, setPostComments] = useState({}); // Store actual comments for each post
  const [loadingComments, setLoadingComments] = useState({}); // Track which posts are loading comments
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isClosingSettingsModal, setIsClosingSettingsModal] = useState(false);
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [isClosingCalendlyModal, setIsClosingCalendlyModal] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [calendlyLink, setCalendlyLink] = useState('');
  const [courseReddit, setCourseReddit] = useState({
    channel: 'r/ProductManagement',
    url: 'https://www.reddit.com/r/ProductManagement/'
  });
  const [userRole, setUserRole] = useState(null); // 'student', 'teacher', 'admin'

  // Pull-to-refresh states
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const postsScrollRef = useRef(null);
  const [settingsTab, setSettingsTab] = useState('account'); // 'account', 'preferences', 'danger'
  const [settingsForm, setSettingsForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    selectedCourse: 'product-manager',
    marketingEmails: true
  });
  const [availableCourses, setAvailableCourses] = useState([]);

  // Scroll container ref for lesson cards
  const scrollContainerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [snappedCardIndex, setSnappedCardIndex] = useState(0);
  const [isCarouselReady, setIsCarouselReady] = useState(false);
  const hasInitializedScrollRef = useRef(false);
  const [enableSmoothScroll, setEnableSmoothScroll] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [showMyPostsModal, setShowMyPostsModal] = useState(false);
  const [isClosingMyPostsModal, setIsClosingMyPostsModal] = useState(false);
  const [myRedditPosts, setMyRedditPosts] = useState([]);
  const [myRedditComments, setMyRedditComments] = useState([]);
  const [loadingMyPosts, setLoadingMyPosts] = useState(false);
  const [loadingMyComments, setLoadingMyComments] = useState(false);
  const [hasPostedToReddit, setHasPostedToReddit] = useState(false);
  const [expandedMyPostId, setExpandedMyPostId] = useState(null);
  const [myPostHoverTimer, setMyPostHoverTimer] = useState(null);
  const [userCertificate, setUserCertificate] = useState(null);
  const [certificateGenerated, setCertificateGenerated] = useState(false);

  // Payment modal state variables
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradingToAdFree, setUpgradingToAdFree] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const checkoutRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Clean up hash fragments from OAuth redirect
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Check if user has posted to Reddit before
  useEffect(() => {
    const hasPosted = localStorage.getItem('hasPostedToReddit');
    if (hasPosted === 'true') {
      setHasPostedToReddit(true);
    }
  }, []);


  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!authUser) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          return;
        }

        if (data) {
          setUserRole(data.role);
          console.log('User role:', data.role);
        }
      } catch (err) {
        console.error('Exception fetching user role:', err);
      }
    };

    fetchUserRole();
  }, [authUser]);

  // Check Reddit authentication status
  useEffect(() => {
    const checkRedditAuth = async () => {
      if (isRedditAuthenticated()) {
        setRedditAuthenticated(true);
        try {
          const username = await getRedditUsername();
          setRedditUsername(username);

          // Check if we should reopen the post modal after OAuth
          const shouldReopenModal = localStorage.getItem('reopen_post_modal');
          const pendingPost = localStorage.getItem('pending_reddit_post');

          if (shouldReopenModal && pendingPost) {
            try {
              const postData = JSON.parse(pendingPost);
              console.log('📮 Restoring pending post to modal...');

              // Restore the post data to the form
              setNewPost({
                title: postData.title,
                content: postData.content,
                shareToReddit: true,
                flair: postData.flair || ''
              });

              // Reopen the modal
              setShowPostModal(true);

              // Clear the flags
              localStorage.removeItem('reopen_post_modal');
              localStorage.removeItem('pending_reddit_post');
            } catch (error) {
              console.error('Error restoring pending post:', error);
              localStorage.removeItem('reopen_post_modal');
              localStorage.removeItem('pending_reddit_post');
            }
          }
        } catch (error) {
          console.error('Error getting Reddit username:', error);
          setRedditAuthenticated(false);
        }
      }
    };
    checkRedditAuth();
  }, []);

  // Fetch data from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchData();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Refetch completed lessons when returning to ProgressHub
  useEffect(() => {
    const refetchCompletedLessons = async () => {
      console.log('🔄 ProgressHub useEffect triggered - Location:', location.pathname);
      if (!authUser) {
        console.log('❌ No authUser, skipping refetch');
        return;
      }

      const userId = authUser?.id || 'temp-user-id';

      // Fetch user's enrolled course
      let courseId = 'product-manager'; // Default fallback
      if (authUser?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('enrolled_course')
          .eq('id', authUser.id)
          .single();

        if (userData?.enrolled_course) {
          courseId = userData.enrolled_course;
        }
      }

      console.log('🔄 Fetching completed lessons for userId:', userId);

      try {
        const completedLessonsData = await getCompletedLessons(userId, courseId);
        console.log('✅ Refetched completed lessons on navigation:', completedLessonsData);
        console.log('📊 Number of completed lessons:', completedLessonsData.length);
        setCompletedLessons(completedLessonsData);
      } catch (error) {
        console.error('❌ Error refetching completed lessons:', error);
      }
    };

    refetchCompletedLessons();
  }, [location, authUser]);

  // Update user state when firstName from auth changes
  useEffect(() => {
    if (firstName) {
      setUser(prev => ({ ...prev, firstName }));
    }
  }, [firstName]);

  // Reset pull distance when refresh completes
  useEffect(() => {
    if (!isRefreshing && pullDistance > 0) {
      // Smoothly reset the pull distance
      const timer = setTimeout(() => {
        setPullDistance(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRefreshing, pullDistance]);

  // Mount Stripe Checkout when clientSecret is available
  useEffect(() => {
    let checkout = null;

    const mountCheckout = async () => {
      if (clientSecret && checkoutRef.current) {
        try {
          const stripe = await stripePromise;

          checkout = await stripe.initEmbeddedCheckout({
            clientSecret,
          });

          checkout.mount(checkoutRef.current);
        } catch (error) {
          console.error('Error mounting Stripe checkout:', error);
          setUpgradingToAdFree(false);
          alert('Failed to load payment form. Please try again.');
        }
      }
    };

    mountCheckout();

    // Cleanup function
    return () => {
      if (checkout) {
        checkout.destroy();
      }
    };
  }, [clientSecret]);

  // Check for course completion and generate certificate
  useEffect(() => {
    const checkAndGenerateCertificate = async () => {
      if (!authUser?.id || certificateGenerated || !completedLessons.length) return;

      const totalLessons = getTotalLessonsCount();
      const completedCount = getCompletedLessonsCount();

      // Check if course is 100% complete
      if (totalLessons > 0 && completedCount >= totalLessons) {
        try {
          console.log('🎓 Course 100% complete! Generating certificate...');

          // Get user's enrolled course
          const { data: userData } = await supabase
            .from('users')
            .select('enrolled_course')
            .eq('id', authUser.id)
            .single();

          const courseId = userData?.enrolled_course || 'product-manager';

          // Generate certificate
          const certificate = await generateCertificate(authUser.id, courseId);
          setUserCertificate(certificate);
          setCertificateGenerated(true);
          console.log('✅ Certificate generated:', certificate);
        } catch (error) {
          console.error('❌ Error generating certificate:', error);
        }
      }
    };

    checkAndGenerateCertificate();
  }, [completedLessons, authUser, certificateGenerated]);


  const fetchData = async () => {
    try {
      console.log('🔄 Starting fetchData...');

      // Fetch user's enrolled course from database
      const userId = authUser?.id;
      let courseId = 'product-manager'; // Default fallback
      let fetchedCourseData = null; // Store course data for later use

      if (userId) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('enrolled_course')
          .eq('id', userId)
          .single();

        if (userData?.enrolled_course) {
          courseId = userData.enrolled_course;
          console.log('✅ User enrolled in course:', courseId);
        } else {
          console.log('⚠️ No enrolled_course found, using default:', courseId);
        }
      }

      // Fetch course data including tutor information
      try {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('name', courseId)
          .single();

        if (courseError) throw courseError;

        if (courseData) {
          fetchedCourseData = courseData; // Store for later use

          // Fetch coaches for this course
          try {
            const coachesData = await getCoachesForCourse(courseId);
            setCoaches(coachesData || []);
            console.log('✅ Fetched coaches data:', coachesData);
          } catch (error) {
            console.error('Error fetching coaches:', error);
            setCoaches([]);
          }

          // Set calendly link from course (round-robin link)
          setCalendlyLink(courseData.calendly_link || '');
          console.log('✅ Fetched course data:', courseData);

          // Update user state with enrolled course title
          setUser(prev => ({
            ...prev,
            enrolledCourse: courseData.title || courseData.name || 'Product Manager'
          }));

          // Update reddit data for community forum
          console.log('📱 Reddit data from DB:', {
            reddit_channel: courseData.reddit_channel,
            reddit_url: courseData.reddit_url
          });
          setCourseReddit({
            channel: courseData.reddit_channel || 'r/ProductManagement',
            url: courseData.reddit_url || 'https://www.reddit.com/r/ProductManagement/'
          });
          console.log('📱 courseReddit state updated to:', {
            channel: courseData.reddit_channel || 'r/ProductManagement',
            url: courseData.reddit_url || 'https://www.reddit.com/r/ProductManagement/'
          });
        }
      } catch (error) {
        console.error('❌ Error fetching course/tutor data:', error);
      }

      // Fetch lessons grouped by module using the new API function
      try {
        const lessonsData = await getLessonsByModule(courseId);
        console.log('📚 Fetched grouped lessons:', lessonsData);
        setGroupedLessons(lessonsData);
      } catch (error) {
        console.error('❌ Error fetching lessons by module:', error);
        setGroupedLessons({}); // Default to empty object
      }

      // Fetch lessons metadata (for upcoming lessons carousel)
      try {
        const metadataData = await getLessonsMetadata(courseId);
        console.log('📋 Fetched lessons metadata:', metadataData);
        setLessonsMetadata(metadataData);
      } catch (error) {
        console.error('❌ Error fetching lessons metadata:', error);
        setLessonsMetadata([]); // Default to empty array
      }

      // userId is already declared above, reuse it
      console.log('👤 Using userId for progress:', userId);

      // Fetch completed lessons for this user
      let completedLessonsData = [];
      try {
        completedLessonsData = await getCompletedLessons(userId, courseId);
        console.log('✅ Fetched completed lessons:', completedLessonsData);
        console.log('📊 Completed lessons breakdown:', completedLessonsData.map(l => `M${l.module_number}L${l.lesson_number}`).join(', '));
        setCompletedLessons(completedLessonsData);
      } catch (error) {
        console.error('❌ Error fetching completed lessons (table may not exist yet):', error);
        setCompletedLessons([]); // Default to no completed lessons
      }

      // Check for certificate (after course completion)
      try {
        const certificates = await getUserCertificates(userId);
        const courseCertificate = certificates.find(cert => cert.course_id === courseId);
        if (courseCertificate) {
          setUserCertificate(courseCertificate);
          setCertificateGenerated(true);
          console.log('🎓 Certificate found:', courseCertificate);
        }
      } catch (error) {
        console.error('❌ Error fetching certificates:', error);
      }

      // Calculate current lesson based on completed lessons
      // The current lesson is the first lesson that hasn't been completed yet
      if (completedLessonsData.length === 0) {
        // No lessons completed, start from the first lesson
        setCurrentModule(1);
        setCurrentLesson(1);
        console.log('👤 No completed lessons, starting at Module 1, Lesson 1');
      } else {
        // Find the highest completed lesson
        const lastCompleted = completedLessonsData.reduce((max, lesson) => {
          const lessonIndex = (lesson.module_number - 1) * 10 + lesson.lesson_number;
          const maxIndex = (max.module_number - 1) * 10 + max.lesson_number;
          return lessonIndex > maxIndex ? lesson : max;
        }, completedLessonsData[0]);

        console.log('📍 Last completed lesson:', lastCompleted);

        // Set current lesson to the next uncompleted lesson
        // For now, assume linear progression: next lesson after the last completed
        const nextLessonNumber = lastCompleted.lesson_number + 1;
        const nextModuleNumber = lastCompleted.module_number;

        setCurrentModule(nextModuleNumber);
        setCurrentLesson(nextLessonNumber);
        console.log(`✅ Progress calculated - Current lesson: Module ${nextModuleNumber}, Lesson ${nextLessonNumber}`);
      }

      // Fetch both Reddit posts and user-generated posts
      let redditData = [];
      let userPostsData = [];

      // Clear ALL caches (old and new) to ensure fresh data
      try {
        // Clear old generic cache
        localStorage.removeItem('community_posts_cache');
        // Clear all course-specific caches
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('community_posts_cache_')) {
            localStorage.removeItem(key);
            console.log('🗑️ Cleared cache:', key);
          }
        });
        console.log('🗑️ Cleared all community post caches');
      } catch (err) {
        console.error('❌ Error clearing caches:', err);
      }

      // CACHE DISABLED - Always fetch fresh data
      const CACHE_KEY = `community_posts_cache_${courseId}`;
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (matches server cache)

      // Fetch fresh data in the background (forceRefresh = false to respect server cache)
      try {
        // Use the fetched course data to get the subreddit (not state, as state updates are async)
        const redditChannel = fetchedCourseData?.reddit_channel || 'r/ProductManagement';
        const subreddit = redditChannel.replace(/^r\//, '');
        redditData = await getRedditPosts(25, false, subreddit);
      } catch (err) {
        console.error('❌ Error fetching Reddit posts:', err);
        redditData = []; // Ensure it's an empty array
      }

      // Temporarily disable user posts - only show Reddit posts for course-specific content
      // TODO: Add course_id field to community_posts table to enable course filtering
      userPostsData = [];

      // try {
      //   userPostsData = await getCommunityPosts(10);
      //   console.log('✅ User posts fetched:', userPostsData?.length || 0);
      // } catch (err) {
      //   console.error('❌ Error fetching user posts:', err);
      //   userPostsData = []; // Ensure it's an empty array
      // }

      const avatarColors = ['bg-purple-600', 'bg-yellow-500', 'bg-teal-500'];

      // Transform Reddit posts (ensure redditData is an array) - Reddit posts only
      const redditPosts = (Array.isArray(redditData) ? redditData : []).map((post, index) => ({
        id: `reddit-${post.id}`,
        redditId: post.id, // Store the original Reddit ID
        redditFullname: `t3_${post.id}`, // Full Reddit name for API calls (t3_ = post)
        author: post.author,
        author_icon: post.author_icon, // Reddit user icon URL
        time: getTimeAgo(post.created_at),
        created_at: post.created_at,
        title: post.title,
        content: post.content,
        tag: post.tag,
        upvotes: post.upvotes,
        comments: post.comments,
        avatar: avatarColors[index % avatarColors.length],
        url: post.url,
        source: 'reddit'
      }));

      // Sort by upvotes (top posts first)
      const allPosts = redditPosts.sort((a, b) => b.upvotes - a.upvotes);

      console.log('📊 Total posts to display:', allPosts.length, '(Reddit:', redditPosts.length, ')');

      // Cache posts if we have any (include subreddit to validate cache)
      if (allPosts.length > 0) {
        try {
          const currentSubreddit = fetchedCourseData?.reddit_channel || 'r/ProductManagement';
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            posts: allPosts,
            timestamp: Date.now(),
            subreddit: currentSubreddit
          }));
          console.log('💾 Cached community posts for future loads, subreddit:', currentSubreddit);
        } catch (err) {
          console.error('❌ Error caching posts:', err);
        }
      }

      setCommunityPosts(allPosts);

      // Fetch user's liked posts if authenticated
      if (authUser?.id) {
        try {
          const likedPostIds = await getUserLikedPosts(authUser.id);
          setLikedPosts(new Set(likedPostIds));
          console.log('✅ Loaded user likes:', likedPostIds.length);
        } catch (error) {
          console.error('❌ Error fetching user likes:', error);
          setLikedPosts(new Set());
        }

        // Fetch comments only for user posts initially (Reddit comments loaded on hover)
        try {
          const commentsByPost = {};

          // Fetch user post comments from database
          // Extract the numeric IDs without the 'user-' prefix for the API call
          const userPostsWithIds = allPosts.filter(p => p.source === 'user');
          const numericPostIds = userPostsWithIds.map(p => p.id.replace('user-', ''));

          console.log('🔍 Debug - User posts:', userPostsWithIds.map(p => ({ id: p.id, title: p.title })));
          console.log('🔍 Debug - Numeric post IDs for API:', numericPostIds);

          if (numericPostIds.length > 0) {
            const userComments = await getMultiplePostsComments(numericPostIds);
            console.log('🔍 Debug - Fetched comments:', userComments);

            userComments.forEach(comment => {
              // Store comments with the 'user-' prefix to match the post.id format
              const postKey = `user-${comment.post_id}`;
              console.log('🔍 Debug - Mapping comment to post:', { comment_post_id: comment.post_id, postKey });
              if (!commentsByPost[postKey]) {
                commentsByPost[postKey] = [];
              }
              commentsByPost[postKey].push(comment);
            });
          }

          console.log('🔍 Debug - Final commentsByPost mapping:', commentsByPost);
          setPostComments(commentsByPost);
          console.log('✅ Loaded user post comments:', Object.keys(commentsByPost).length);
        } catch (error) {
          console.error('❌ Error fetching comments:', error);
          setPostComments({});
        }
      }

      console.log('✅ fetchData completed successfully');
      setLoading(false);
    } catch (error) {
      console.error('❌ CRITICAL Error fetching data:', error);
      setCommunityPosts([]); // Set empty posts on error
      setLoading(false); // Always turn off loading
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hr. ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  // Handle modal close with animation
  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowPostModal(false);
      setIsClosingModal(false);
    }, 200);
  };

  // Handle post submission - posts directly to Reddit
  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check Reddit authentication
      if (!isRedditAuthenticated()) {
        console.log('🔐 Not authenticated with Reddit, initiating OAuth flow...');
        localStorage.setItem('pending_reddit_post', JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          flair: newPost.flair
        }));

        // Mark that we should reopen the modal after OAuth
        localStorage.setItem('reopen_post_modal', 'true');

        // Don't reset form or close modal - just initiate auth
        // The redirect will happen automatically
        initiateRedditAuth();
        return;
      }

      // Post to Reddit
      console.log('📤 Posting to Reddit...');
      const contextLine = `\n\nFor context, I'm on the ${user.enrolledCourse} course at [Ignite](https://ignite.education).`;
      const redditContent = newPost.content + contextLine;
      const subreddit = courseReddit.channel.replace(/^r\//, '');
      const redditResult = await postToReddit(subreddit, newPost.title, redditContent, newPost.flair || null);
      console.log('✅ Posted to Reddit successfully:', redditResult.url);

      // Open the Reddit post in a new tab
      window.open(redditResult.url, '_blank');

      // Mark that user has posted to Reddit
      localStorage.setItem('hasPostedToReddit', 'true');
      setHasPostedToReddit(true);

      // Reset form and close modal
      setNewPost({ title: '', content: '', shareToReddit: true, flair: '' });
      handleCloseModal();
      await fetchData();
    } catch (error) {
      console.error('❌ Error posting:', error);
      alert(`Failed to post: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle My Posts modal
  const handleOpenMyPosts = async () => {
    if (!isRedditAuthenticated()) {
      alert('Please connect your Reddit account in Settings to view your posts.');
      return;
    }

    setShowMyPostsModal(true);
    setLoadingMyPosts(true);
    setLoadingMyComments(true);

    try {
      // Fetch both posts and comments in parallel
      const [posts, comments] = await Promise.all([
        getUserRedditPosts(25),
        getUserRedditComments(25)
      ]);

      setMyRedditPosts(posts);
      setMyRedditComments(comments);
    } catch (error) {
      console.error('❌ Error fetching user data:', error);

      // Check if it's a 403 error (missing permissions)
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        alert('Reddit permissions need to be updated. Please disconnect and reconnect your Reddit account in Settings to view your posts and comments.');
      } else {
        alert('Failed to load your data. Please try again.');
      }

      // Close the modal since we couldn't load data
      handleCloseMyPostsModal();
    } finally {
      setLoadingMyPosts(false);
      setLoadingMyComments(false);
    }
  };

  const handleCloseMyPostsModal = () => {
    setIsClosingMyPostsModal(true);
    setTimeout(() => {
      setShowMyPostsModal(false);
      setIsClosingMyPostsModal(false);
      setMyRedditPosts([]);
    }, 200);
  };

  // Navigate to next lesson
  const goToNextLesson = () => {
    const moduleKey = `module_${currentModule}`;
    const nextLessonKey = `lesson_${currentLesson + 1}`;

    if (groupedLessons[moduleKey]?.[nextLessonKey]) {
      const nextModule = currentModule;
      const nextLesson = currentLesson + 1;

      // Check if next lesson is accessible
      if (isLessonAccessible(nextModule, nextLesson)) {
        setCurrentLesson(nextLesson);
      } else {
        console.log('🔒 Next lesson is locked. Complete current lesson first.');
      }
    } else {
      // No more lessons in current module, try next module
      const nextModuleKey = `module_${currentModule + 1}`;
      const nextModuleData = groupedLessons[nextModuleKey];

      if (nextModuleData) {
        // Find the first lesson in the next module
        const firstLessonKey = Object.keys(nextModuleData).find(key => key.startsWith('lesson_'));
        if (firstLessonKey) {
          const nextModule = currentModule + 1;
          const nextLesson = parseInt(firstLessonKey.split('_')[1]);

          // Check if next module's first lesson is accessible
          if (isLessonAccessible(nextModule, nextLesson)) {
            setCurrentModule(nextModule);
            setCurrentLesson(nextLesson);
          } else {
            console.log('🔒 Next lesson is locked. Complete current lesson first.');
          }
        }
      }
    }
  };

  // Navigate to previous lesson
  const goToPreviousLesson = () => {
    const moduleKey = `module_${currentModule}`;
    const prevLessonKey = `lesson_${currentLesson - 1}`;

    // Check if previous lesson exists in current module
    if (groupedLessons[moduleKey]?.[prevLessonKey]) {
      setCurrentLesson(currentLesson - 1);
    } else if (currentModule > 1) {
      // Go to last lesson of previous module
      const prevModuleKey = `module_${currentModule - 1}`;
      const prevModuleData = groupedLessons[prevModuleKey];

      if (prevModuleData) {
        // Find all lesson keys and get the last one
        const lessonKeys = Object.keys(prevModuleData)
          .filter(key => key.startsWith('lesson_'))
          .sort((a, b) => {
            const numA = parseInt(a.split('_')[1]);
            const numB = parseInt(b.split('_')[1]);
            return numA - numB;
          });

        const lastLessonKey = lessonKeys[lessonKeys.length - 1];
        if (lastLessonKey) {
          setCurrentModule(currentModule - 1);
          setCurrentLesson(parseInt(lastLessonKey.split('_')[1]));
        }
      }
    }
  };

  // Touch handlers for swipe gestures
  const onTouchStart = (e) => {
    setTouchEnd(0); // Reset
    setTouchStart(e.targetTouches[0].clientX);
    setDragOffset(0);
  };

  const onTouchMove = (e) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);

    // Calculate drag offset for animation
    if (touchStart) {
      const offset = currentTouch - touchStart;
      setDragOffset(offset);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setDragOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNextLesson();
    } else if (isRightSwipe) {
      goToPreviousLesson();
    }

    // Reset drag offset with animation
    setDragOffset(0);
  };

  // Mouse handlers for drag gestures (desktop support)
  const onMouseDown = (e) => {
    setIsDragging(true);
    setTouchEnd(0);
    setTouchStart(e.clientX);
    setDragOffset(0);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    setTouchEnd(currentX);

    // Calculate drag offset for animation
    if (touchStart) {
      const offset = currentX - touchStart;
      setDragOffset(offset);
    }
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!touchStart || !touchEnd) {
      setDragOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNextLesson();
    } else if (isRightSwipe) {
      goToPreviousLesson();
    }

    // Reset drag offset with animation
    setDragOffset(0);
  };

  const onMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  // Helper function to check if a lesson is completed
  const isLessonCompleted = (moduleNum, lessonNum) => {
    return completedLessons.some(
      (completion) => completion.module_number === moduleNum && completion.lesson_number === lessonNum
    );
  };

  // Helper function to check if a lesson is accessible (unlocked)
  const isLessonAccessible = (moduleNum, lessonNum) => {
    // Current lesson is always accessible
    if (moduleNum === currentModule && lessonNum === currentLesson) {
      return true;
    }

    // Check if this lesson comes before the current lesson
    if (moduleNum < currentModule) {
      return true; // All lessons in previous modules are accessible
    } else if (moduleNum === currentModule && lessonNum < currentLesson) {
      return true; // Lessons before current lesson in same module are accessible
    }

    // For lessons after the current lesson, check if previous lesson is completed
    // Find the previous lesson
    let prevModuleNum = moduleNum;
    let prevLessonNum = lessonNum - 1;

    // If previous lesson doesn't exist in current module, check previous module
    const moduleKey = `module_${prevModuleNum}`;
    const prevLessonKey = `lesson_${prevLessonNum}`;

    if (prevLessonNum < 1 || !groupedLessons[moduleKey]?.[prevLessonKey]) {
      // Need to find last lesson of previous module
      prevModuleNum = moduleNum - 1;
      if (prevModuleNum < 1) {
        // This is the first lesson of first module - always accessible
        return true;
      }

      const prevModuleKey = `module_${prevModuleNum}`;
      const prevModuleData = groupedLessons[prevModuleKey];
      if (prevModuleData) {
        const lessonKeys = Object.keys(prevModuleData)
          .filter(key => key.startsWith('lesson_'))
          .map(key => parseInt(key.split('_')[1]))
          .sort((a, b) => a - b);
        prevLessonNum = lessonKeys[lessonKeys.length - 1];
      }
    }

    // Check if previous lesson is completed
    return isLessonCompleted(prevModuleNum, prevLessonNum);
  };

  // Helper function to calculate total number of lessons in the course
  const getTotalLessonsCount = () => {
    let totalCount = 0;
    Object.keys(groupedLessons).forEach(moduleKey => {
      const moduleData = groupedLessons[moduleKey];
      const lessonKeys = Object.keys(moduleData).filter(key => key.startsWith('lesson_'));
      totalCount += lessonKeys.length;
    });
    return totalCount;
  };

  // Helper function to calculate how many lessons have been completed
  const getCompletedLessonsCount = () => {
    // Use the actual completedLessons array from the database
    return completedLessons.length;
  };

  // Calculate progress percentage
  const calculateProgressPercentage = () => {
    const totalLessons = getTotalLessonsCount();
    if (totalLessons === 0) return 0;

    const completedLessons = getCompletedLessonsCount();
    return Math.round((completedLessons / totalLessons) * 100);
  };

  // Helper function to get ALL lessons (including completed, current, and upcoming)
  const getAllLessonsForCarousel = () => {
    if (lessonsMetadata.length === 0) return [];

    // Return all lessons sorted by module and lesson number
    return lessonsMetadata.sort((a, b) => {
      if (a.module_number !== b.module_number) {
        return a.module_number - b.module_number;
      }
      return a.lesson_number - b.lesson_number;
    });
  };

  // Only call getAllLessonsForCarousel if we have data
  const hasLessonData = Object.keys(groupedLessons).length > 0;
  const upcomingLessons = hasLessonData ? getAllLessonsForCarousel() : [];
  const progressPercentage = hasLessonData ? calculateProgressPercentage() : user.progress;

  // Settings Modal Handlers
  const handleOpenSettings = async () => {
    // Fetch available courses from database (only live courses)
    try {
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('name, title, status')
        .eq('status', 'live')
        .order('display_order', { ascending: true });

      if (!error && coursesData) {
        setAvailableCourses(coursesData);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }

    // Fetch user's current enrolled course
    let userEnrolledCourse = 'product-manager';
    if (authUser?.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('enrolled_course')
        .eq('id', authUser.id)
        .single();

      if (userData?.enrolled_course) {
        userEnrolledCourse = userData.enrolled_course;
      }
    }

    // Populate form with current user data
    setSettingsForm({
      firstName: authUser?.user_metadata?.first_name || '',
      lastName: authUser?.user_metadata?.last_name || '',
      email: authUser?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      selectedCourse: userEnrolledCourse,
      marketingEmails: authUser?.user_metadata?.marketing_emails !== false
    });
    setShowSettingsModal(true);
    setSettingsTab('account');
  };

  const handleCloseSettings = () => {
    setIsClosingSettingsModal(true);
    setTimeout(() => {
      setShowSettingsModal(false);
      setIsClosingSettingsModal(false);
    }, 200);
  };

  // Payment Modal Handlers
  const handleCloseUpgradeModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowUpgradeModal(false);
      setIsClosingModal(false);
      setClientSecret(null);
      setUpgradingToAdFree(false);
    }, 200);
  };

  const handleOpenUpgradeModal = async () => {
    if (!authUser) {
      alert('Please sign in to access office hours');
      return;
    }

    setShowUpgradeModal(true);
    setUpgradingToAdFree(true);

    try {
      const response = await fetch('https://ignite-education-api.onrender.com/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authUser.id,
        }),
      });

      const data = await response.json();

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setUpgradingToAdFree(false);
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start upgrade process. Please try again.');
      handleCloseUpgradeModal();
    }
  };

  // Calendly Modal Handlers
  const handleOpenCalendly = async () => {
    // Check if user has premium subscription
    if (!isAdFree) {
      // User not subscribed - show payment modal
      await handleOpenUpgradeModal();
    } else {
      // User is subscribed - open Calendly
      setShowCalendlyModal(true);
    }
  };

  const handleCloseCalendly = () => {
    setIsClosingCalendlyModal(true);
    setTimeout(() => {
      setShowCalendlyModal(false);
      setIsClosingCalendlyModal(false);
    }, 200);
  };

  // Shop link handlers
  const handleOpenShop = () => {
    window.open('https://shop.ignite.education/products/tote-bag-1?variant=53677278495051', '_blank', 'noopener,noreferrer');
  };

  const handleOpenMug = () => {
    window.open('https://shop.ignite.education/products/black-mug-11oz-15oz?variant=53677361889611', '_blank', 'noopener,noreferrer');
  };

  const handleOpenNotebook = () => {
    window.open('https://shop.ignite.education/products/notebook?variant=53241113084235', '_blank', 'noopener,noreferrer');
  };

  const handleOpenSweatshirt = () => {
    window.open('https://shop.ignite.education/products/unisex-heavy-blend™-crewneck-sweatshirt?variant=53677325254987', '_blank', 'noopener,noreferrer');
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    try {
      const updates = {
        first_name: settingsForm.firstName,
        last_name: settingsForm.lastName
      };

      // If changing email or password, need additional handling
      if (settingsForm.email !== authUser?.email) {
        await supabase.auth.updateUser({ email: settingsForm.email });
      }

      if (settingsForm.newPassword) {
        if (settingsForm.newPassword !== settingsForm.confirmPassword) {
          alert('New passwords do not match');
          return;
        }
        await supabase.auth.updateUser({ password: settingsForm.newPassword });
      }

      await updateProfile(updates);
      alert('Account updated successfully!');
      handleCloseSettings();
    } catch (error) {
      console.error('Error updating account:', error);
      alert(`Failed to update account: ${error.message}`);
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    try {
      // Update marketing email preferences
      await updateProfile({
        marketing_emails: settingsForm.marketingEmails
      });

      // Update enrolled course in users table
      if (authUser?.id) {
        const { error: courseError } = await supabase
          .from('users')
          .update({ enrolled_course: settingsForm.selectedCourse })
          .eq('id', authUser.id);

        if (courseError) throw courseError;
      }

      // Auto-refresh page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert(`Failed to update preferences: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return;
    }

    try {
      // Call API to delete user account
      const response = await fetch('https://ignite-education-api.onrender.com/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: authUser.id })
      });

      if (response.ok) {
        await signOut();
        navigate('/auth');
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please contact support.');
    }
  };

  const handleLinkProvider = async (provider) => {
    try {
      const { data, error } = await supabase.auth.linkIdentity({ provider });
      if (error) throw error;
      alert(`${provider} account linked successfully!`);
    } catch (error) {
      console.error(`Error linking ${provider}:`, error);
      alert(`Failed to link ${provider} account: ${error.message}`);
    }
  };

  const handleUnlinkProvider = async (provider) => {
    try {
      // Get user identities
      const { data: { user } } = await supabase.auth.getUser();
      const identity = user.identities?.find(id => id.provider === provider);

      if (!identity) {
        alert(`No ${provider} account linked`);
        return;
      }

      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      alert(`${provider} account unlinked successfully!`);
    } catch (error) {
      console.error(`Error unlinking ${provider}:`, error);
      alert(`Failed to unlink ${provider} account: ${error.message}`);
    }
  };

  // Scroll handlers for lesson cards
  const handleScrollMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsScrolling(true);
    setScrollStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleScrollMouseMove = (e) => {
    if (!isScrolling || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - scrollStartX) * 2; // Multiply for faster scrolling
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleScrollMouseUp = () => {
    setIsScrolling(false);
  };

  const handleScrollMouseLeave = () => {
    setIsScrolling(false);
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current || upcomingLessons.length === 0) return;
    const scrollPosition = scrollContainerRef.current.scrollLeft;
    const gap = 16; // Gap between cards (gap-4 = 1rem = 16px)

    // Calculate which card is currently snapped based on variable widths
    let cumulativeWidth = 0;
    let index = 0;

    for (let i = 0; i < upcomingLessons.length; i++) {
      const lesson = upcomingLessons[i];
      const lessonIsCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
      const lessonIsCurrentLesson = lesson.module_number === currentModule && lesson.lesson_number === currentLesson;
      const cardWidth = (lessonIsCompleted || lessonIsCurrentLesson) ? 390 : 346.06; // Match actual card widths

      // Check if scroll position is within this card's range
      if (scrollPosition < cumulativeWidth + cardWidth / 2) {
        index = i;
        break;
      }

      cumulativeWidth += cardWidth + gap;

      // If we're past all cards, set to last card
      if (i === upcomingLessons.length - 1) {
        index = i;
      }
    }

    setSnappedCardIndex(index);
  };

  const scrollToCurrentLesson = () => {
    if (!scrollContainerRef.current || upcomingLessons.length === 0) return;

    // Find the index of the first incomplete lesson (current lesson)
    const currentLessonIndex = upcomingLessons.findIndex(
      lesson => !isLessonCompleted(lesson.module_number, lesson.lesson_number)
    );

    if (currentLessonIndex !== -1) {
      // Calculate the scroll position to show the current lesson card
      const gap = 16; // gap-4 = 16px
      let scrollPosition = 0;

      // Calculate position based on all previous cards accounting for variable widths
      for (let i = 0; i < currentLessonIndex; i++) {
        const lesson = upcomingLessons[i];
        const lessonIsCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
        const lessonIsCurrentLesson = lesson.module_number === currentModule && lesson.lesson_number === currentLesson;
        const width = (lessonIsCompleted || lessonIsCurrentLesson) ? 390 : 346.06; // Match actual card widths
        scrollPosition += width + gap;
      }

      scrollContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      setSnappedCardIndex(currentLessonIndex);
    }
  };

  // Scroll to current lesson on initial load
  useEffect(() => {
    // Only run once and only if we have lessons and the scroll container exists
    if (hasInitializedScrollRef.current || !scrollContainerRef.current || upcomingLessons.length === 0 || loading) return;

    console.log('🔍 completedLessons in scroll effect:', completedLessons);
    console.log('📊 completedLessons count:', completedLessons.length);
    console.log('📋 Completed lessons details:', completedLessons.map(l => `M${l.module_number}L${l.lesson_number}`));

    // Find the index of the first incomplete lesson (current lesson)
    const currentLessonIndex = upcomingLessons.findIndex(
      lesson => {
        const isCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
        console.log(`  Checking M${lesson.module_number}L${lesson.lesson_number}: ${isCompleted ? 'COMPLETED ✓' : 'not completed'}`);
        return !isCompleted;
      }
    );

    console.log('🎯 ProgressHub - Attempting to scroll to current lesson index:', currentLessonIndex);
    console.log('📚 ProgressHub - Total lessons:', upcomingLessons.length);
    console.log('📝 ProgressHub - All lessons:', upcomingLessons.map(l => `M${l.module_number}L${l.lesson_number}`));

    if (currentLessonIndex !== -1) {
      // Mark as initialized to prevent re-running
      hasInitializedScrollRef.current = true;

      // Calculate scroll position FIRST
      const container = scrollContainerRef.current;
      const gap = 16; // gap-4 = 16px
      let scrollPosition = 0;

      // Calculate position based on all previous cards accounting for variable widths
      for (let i = 0; i < currentLessonIndex; i++) {
        const lesson = upcomingLessons[i];
        const lessonIsCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
        const lessonIsCurrentLesson = lesson.module_number === currentModule && lesson.lesson_number === currentLesson;
        const width = (lessonIsCompleted || lessonIsCurrentLesson) ? 390 : 346.06; // Match actual card widths
        scrollPosition += width + gap;
      }

      console.log('📍 ProgressHub - Setting initial scroll position:', scrollPosition);

      // Set scroll position BEFORE making carousel visible (without smooth scroll)
      container.scrollLeft = scrollPosition;

      // Update snapped card index
      setSnappedCardIndex(currentLessonIndex);

      // Use a small timeout to ensure scroll has taken effect before showing carousel
      setTimeout(() => {
        setIsCarouselReady(true);
        // Enable smooth scroll after carousel is visible
        setEnableSmoothScroll(true);
      }, 50);
    } else {
      // No current lesson found (all lessons completed), default to first lesson
      hasInitializedScrollRef.current = true;
      setSnappedCardIndex(0);
      setIsCarouselReady(true);
      setEnableSmoothScroll(true);
    }
  }, [upcomingLessons, loading, completedLessons]);

  // Pull-to-refresh: Refresh posts data
  const refreshPosts = async () => {
    setIsRefreshing(true);
    console.log('🔄 Refreshing community posts...');

    try {
      // Fetch fresh Reddit posts only
      let redditData = [];

      try {
        // Force refresh = true to bypass cache (but respects minimum 2-min refresh on server)
        // Extract subreddit name from channel (remove 'r/' prefix)
        const subreddit = courseReddit.channel.replace(/^r\//, '');
        console.log('🔄 Refreshing Reddit posts for subreddit:', subreddit, 'from courseReddit.channel:', courseReddit.channel);
        redditData = await getRedditPosts(25, true, subreddit);
        console.log('✅ Refreshed Reddit posts:', redditData?.length || 0);
      } catch (err) {
        console.error('❌ Error refreshing Reddit posts:', err);
        redditData = [];
      }

      const avatarColors = ['bg-purple-600', 'bg-yellow-500', 'bg-teal-500'];

      // Transform Reddit posts
      const redditPosts = (Array.isArray(redditData) ? redditData : []).map((post, index) => ({
        id: `reddit-${post.id}`,
        redditId: post.id,
        redditFullname: `t3_${post.id}`,
        author: post.author,
        author_icon: post.author_icon, // Reddit user icon URL
        time: getTimeAgo(post.created_at),
        created_at: post.created_at,
        title: post.title,
        content: post.content,
        tag: post.tag,
        upvotes: post.upvotes,
        comments: post.comments,
        avatar: avatarColors[index % avatarColors.length],
        url: post.url,
        source: 'reddit'
      }));

      // Sort by upvotes (top posts first) - Reddit posts only
      const allPosts = redditPosts.sort((a, b) => b.upvotes - a.upvotes);

      setCommunityPosts(allPosts);

      console.log('✅ Posts refreshed successfully');

      // Pause for 0.75 seconds to show success state and animate icon
      await new Promise(resolve => setTimeout(resolve, 750));

    } catch (error) {
      console.error('❌ Error refreshing posts:', error);
      // Still pause on error to show feedback
      await new Promise(resolve => setTimeout(resolve, 750));
    } finally {
      setIsRefreshing(false);
      setIsPulling(false);
      setPullDistance(0);

      // Scroll back to top smoothly after refresh
      if (postsScrollRef.current) {
        postsScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Pull-to-refresh: Handle touch start
  const handlePullStart = useCallback((e) => {
    if (!postsScrollRef.current || isRefreshing) return;

    const scrollTop = postsScrollRef.current.scrollTop;
    console.log('👆 Touch/Mouse start - scrollTop:', scrollTop);

    // Allow pull when at the top (scrollTop = 0) and user scrolls up
    if (scrollTop === 0) {
      const startY = e.touches ? e.touches[0].clientY : e.clientY;
      setPullStartY(startY);
      // Track mouse down state for desktop
      if (!e.touches) {
        setIsMouseDown(true);
      }
      console.log('✅ Pull activated at Y:', startY, 'scrollTop:', scrollTop);
    }
  }, [isRefreshing]);

  // Pull-to-refresh: Handle touch move
  const handlePullMove = useCallback((e) => {
    if (!postsScrollRef.current || isRefreshing) return;

    // For mouse events, only process if mouse is down
    if (!e.touches && !isMouseDown) return;

    const scrollTop = postsScrollRef.current.scrollTop;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;

    // Allow pull when at the top (scrollTop = 0)
    if (scrollTop === 0 && pullStartY !== 0) {
      const distance = currentY - pullStartY;
      console.log('📏 Move distance:', distance, 'scrollTop:', scrollTop);

      // Only allow pulling down (positive distance)
      if (distance > 0) {
        if (!isPulling) {
          setIsPulling(true);
          console.log('🎯 Started pulling!');
        }

        // Apply resistance - harder to pull as distance increases
        const resistance = 0.6; // Increased from 0.5 for easier pull
        const adjustedDistance = Math.min(distance * resistance, 150); // Max 150px
        setPullDistance(adjustedDistance);

        // Prevent default scrolling when pulling (more aggressive)
        if (distance > 3) {
          e.preventDefault();
          if (e.cancelable) {
            e.stopPropagation();
          }
        }
      } else {
        // User is scrolling down, reset pull state
        if (isPulling) {
          setIsPulling(false);
          setPullDistance(0);
          console.log('❌ Reset pull (scrolling down)');
        }
      }
    } else if (isPulling) {
      // Reset if user scrolled away from top
      setIsPulling(false);
      setPullDistance(0);
      setPullStartY(0);
      console.log('❌ Reset pull (scrolled away)');
    }
  }, [isRefreshing, pullStartY, isPulling, isMouseDown]);

  // Pull-to-refresh: Handle touch end
  const handlePullEnd = () => {
    console.log('👋 Touch/Mouse end - pullDistance:', pullDistance);

    // Reset mouse down state
    setIsMouseDown(false);

    if (!isPulling && pullDistance === 0) {
      setPullStartY(0);
      return;
    }

    setIsPulling(false);

    // Reduced threshold to trigger refresh (60px instead of 80px)
    if (pullDistance > 60) {
      console.log('🔄 Triggering refresh!');
      refreshPosts();
    } else {
      console.log('⏪ Not enough distance, resetting');
      // Reset if didn't pull far enough
      setPullDistance(0);
      setPullStartY(0);
    }
  };

  // Handle wheel/scroll events for desktop pull-to-refresh
  const handleWheel = useCallback((e) => {
    if (!postsScrollRef.current || isRefreshing) return;

    const scrollTop = postsScrollRef.current.scrollTop;

    // If at the top and scrolling up (negative deltaY), accumulate scroll amount
    if (scrollTop === 0 && e.deltaY < 0) {
      e.preventDefault();

      // Accumulate scroll distance to require more intentional scroll
      if (!isPulling) {
        const scrollAmount = Math.abs(e.deltaY);
        setPullDistance(prev => prev + scrollAmount);
      }
    } else {
      // Reset if scrolling down or away from top
      setPullDistance(0);
    }
  }, [isRefreshing, isPulling]);

  // Trigger refresh when threshold is reached
  useEffect(() => {
    if (pullDistance > 50 && !isPulling && !isRefreshing) {
      setIsPulling(true);
      setPullDistance(0);
      console.log('🔄 Triggering refresh from scroll up at top!');
      refreshPosts();
    }
  }, [pullDistance, isPulling, isRefreshing]);

  // Add non-passive event listeners for touch/wheel events to allow preventDefault
  useEffect(() => {
    const element = postsScrollRef.current;
    if (!element) return;

    // These need to be non-passive to allow preventDefault
    element.addEventListener('touchmove', handlePullMove, { passive: false });
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('touchmove', handlePullMove);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handlePullMove, handleWheel]);

  // Add document-level mouse event listeners for drag-to-refresh
  useEffect(() => {
    if (!isMouseDown) return;

    const handleDocumentMouseMove = (e) => {
      handlePullMove(e);
    };

    const handleDocumentMouseUp = () => {
      handlePullEnd();
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isMouseDown, handlePullMove]);

  // Cleanup hover and leave timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
      if (leaveTimer) {
        clearTimeout(leaveTimer);
      }
    };
  }, [hoverTimer, leaveTimer]);

  // Track container width for dynamic padding
  useEffect(() => {
    if (!scrollContainerRef.current || !isCarouselReady) return;

    const updateContainerWidth = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };

    // Initial measurement
    updateContainerWidth();

    // Update on window resize
    window.addEventListener('resize', updateContainerWidth);

    return () => {
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, [upcomingLessons.length, isCarouselReady]);

  // Track which posts are visible in viewport using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.dataset.postId;
          if (postId) {
            setVisiblePosts((prev) => {
              const newSet = new Set(prev);
              if (entry.isIntersecting) {
                newSet.add(postId);
              } else {
                newSet.delete(postId);
              }
              return newSet;
            });
          }
        });
      },
      {
        threshold: 0.1, // Trigger when at least 10% of post is visible
        rootMargin: '50px' // Add margin to detect posts slightly before they enter viewport
      }
    );

    // Observe all post elements
    Object.values(postRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [communityPosts.length]);

  // Fetch Reddit comments for a specific post
  const fetchRedditCommentsForPost = async (post) => {
    console.log(`🔍 fetchRedditCommentsForPost called for post:`, post.id, `source:`, post.source);

    // Only fetch if it's a Reddit post and we don't already have comments
    if (post.source !== 'reddit') {
      console.log(`⏭️ Skipping - not a Reddit post`);
      return;
    }

    if (postComments[post.id] !== undefined) {
      console.log(`⏭️ Skipping - comments already loaded for this post`);
      return;
    }

    if (loadingComments[post.id]) {
      console.log(`⏭️ Skipping - already loading comments for this post`);
      return;
    }

    try {
      setLoadingComments(prev => ({ ...prev, [post.id]: true }));
      console.log(`🔄 Fetching Reddit comments for post: ${post.redditId}`);

      // Get the subreddit name from courseReddit (remove 'r/' prefix if present)
      const subredditName = courseReddit.channel.replace(/^r\//, '');
      const redditComments = await getRedditComments(subredditName, post.redditId);
      console.log(`📦 Raw Reddit comments received:`, redditComments);

      if (redditComments && redditComments.length > 0) {
        const formattedComments = redditComments.map(comment => ({
          id: comment.id,
          post_id: post.id,
          author: comment.author,
          content: comment.body,
          created_at: new Date(comment.created_utc * 1000).toISOString(),
          upvotes: comment.score || 0
        }));

        console.log(`✨ Formatted comments:`, formattedComments);

        // Reverse to show newest comments first
        const sortedComments = formattedComments.reverse();

        setPostComments(prev => {
          const updated = {
            ...prev,
            [post.id]: sortedComments
          };
          console.log(`📝 Updated postComments state:`, updated);
          return updated;
        });

        console.log(`✅ Loaded ${formattedComments.length} Reddit comments for post: ${post.redditId}`);
      } else {
        console.log(`📭 No comments found for post: ${post.redditId}`);
        // Set empty array so we don't keep trying to fetch
        setPostComments(prev => ({
          ...prev,
          [post.id]: []
        }));
      }
    } catch (error) {
      console.error(`❌ Error fetching Reddit comments for post ${post.redditId}:`, error);

      // Set empty array so we don't keep trying to fetch
      // Backend handles authentication, so no need to show AUTH_REQUIRED
      setPostComments(prev => ({
        ...prev,
        [post.id]: []
      }));
    } finally {
      setLoadingComments(prev => ({ ...prev, [post.id]: false }));
    }
  };

  // Handle post hover with debounce
  const handlePostHover = (post) => {
    // Clear any existing hover timer
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }

    // Clear any existing leave timer (in case user hovers back over)
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      setLeaveTimer(null);
    }

    // Set new timer - only load after 2000ms hover
    const timer = setTimeout(() => {
      setExpandedPostId(post.id);
      fetchRedditCommentsForPost(post);
    }, 2000);

    setHoverTimer(timer);
  };

  // Handle mouse leave - clear timer and close post with 1-second delay
  const handlePostLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }

    // Clear any existing leave timer
    if (leaveTimer) {
      clearTimeout(leaveTimer);
    }

    // Set 1-second delay before closing the expanded post
    const timer = setTimeout(() => {
      const postId = expandedPostId;

      // Check if post is out of viewport before collapsing
      if (postId && !visiblePosts.has(postId)) {
        // Post is out of view - capture current height before collapsing
        const postElement = postRefs.current[postId];
        if (postElement) {
          const currentHeight = postElement.offsetHeight;
          setCollapsedHeights(prev => ({ ...prev, [postId]: currentHeight }));
          setIsCollapsing(prev => ({ ...prev, [postId]: true }));
        }
      }

      setExpandedPostId(null);

      // Clear the collapsed state after animation completes
      setTimeout(() => {
        if (postId) {
          setIsCollapsing(prev => ({ ...prev, [postId]: false }));
          setCollapsedHeights(prev => {
            const newHeights = { ...prev };
            delete newHeights[postId];
            return newHeights;
          });
        }
      }, 300);
    }, 1000);

    setLeaveTimer(timer);
  };

  // Handle My Posts modal hover with debounce
  const handleMyPostHover = (post) => {
    // Clear any existing timer
    if (myPostHoverTimer) {
      clearTimeout(myPostHoverTimer);
    }

    // Set new timer - only load after 1000ms hover
    const timer = setTimeout(() => {
      setExpandedMyPostId(post.id);
      fetchRedditCommentsForPost(post);
    }, 1000);

    setMyPostHoverTimer(timer);
  };

  // Handle My Posts mouse leave - clear timer and close post
  const handleMyPostLeave = () => {
    if (myPostHoverTimer) {
      clearTimeout(myPostHoverTimer);
      setMyPostHoverTimer(null);
    }
    // Close the expanded post when mouse leaves
    setExpandedMyPostId(null);
  };

  // Handle post like/unlike
  const handleLikePost = async (postId) => {
    const post = communityPosts.find(p => p.id === postId);
    if (!post) return;

    const isRedditPost = post.source === 'reddit';
    const isCurrentlyLiked = likedPosts.has(postId);

    // For Reddit posts, require Reddit authentication
    if (isRedditPost && !isRedditAuthenticated()) {
      const shouldAuth = confirm('To interact with Reddit posts, you need to connect your Reddit account. Would you like to connect now?');
      if (shouldAuth) {
        initiateRedditAuth();
      }
      return;
    }

    // For user posts, require Ignite authentication
    if (!isRedditPost && !authUser?.id) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      if (isRedditPost) {
        // Vote on Reddit
        const voteDirection = isCurrentlyLiked ? 0 : 1; // 0 = remove vote, 1 = upvote
        await voteOnReddit(post.redditFullname, voteDirection);

        // Update local state
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyLiked) {
            newSet.delete(postId);
          } else {
            newSet.add(postId);
          }
          return newSet;
        });

        // Update upvote count
        setCommunityPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, upvotes: isCurrentlyLiked ? p.upvotes - 1 : p.upvotes + 1 } : p
        ));

        console.log(`✅ ${isCurrentlyLiked ? 'Removed vote from' : 'Upvoted'} Reddit post`);
      } else {
        // Like/unlike user post in Supabase
        if (isCurrentlyLiked) {
          await unlikePost(postId, authUser.id);
          setLikedPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
          setCommunityPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, upvotes: p.upvotes - 1 } : p
          ));
        } else {
          await likePost(postId, authUser.id);
          setLikedPosts(prev => {
            const newSet = new Set(prev);
            newSet.add(postId);
            return newSet;
          });
          setCommunityPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p
          ));
        }
        console.log(`✅ ${isCurrentlyLiked ? 'Unliked' : 'Liked'} user post`);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      if (error.message.includes('authentication expired')) {
        alert('Your Reddit session has expired. Please reconnect your Reddit account.');
        initiateRedditAuth();
      } else if (error.code === '23505') {
        alert('You have already liked this post');
      } else {
        alert(`Failed to update like: ${error.message}`);
      }
    }
  };

  // Handle comment submission
  const handleSubmitComment = async (postId) => {
    const post = communityPosts.find(p => p.id === postId);
    if (!post) return;

    const isRedditPost = post.source === 'reddit';
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) return;

    // For Reddit posts, require Reddit authentication
    if (isRedditPost && !isRedditAuthenticated()) {
      const shouldAuth = confirm('To comment on Reddit posts, you need to connect your Reddit account. Would you like to connect now?');
      if (shouldAuth) {
        initiateRedditAuth();
      }
      return;
    }

    // For user posts, require Ignite authentication
    if (!isRedditPost && !authUser?.id) {
      alert('Please sign in to comment');
      return;
    }

    try {
      if (isRedditPost) {
        // Comment on Reddit
        const result = await commentOnReddit(post.redditFullname, commentText.trim());

        // Create a comment object for display (Reddit format)
        const newComment = {
          id: result.id,
          post_id: postId,
          author: redditUsername || 'Reddit User',
          content: commentText.trim(),
          created_at: new Date().toISOString(),
          upvotes: 1
        };

        // Update local state - add new comment at the top
        setPostComments(prev => ({
          ...prev,
          [postId]: [newComment, ...(prev[postId] || [])]
        }));

        // Update comment count
        setCommunityPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, comments: p.comments + 1 } : p
        ));

        // Clear input
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));

        console.log('✅ Commented on Reddit post');
      } else {
        // Comment on user post in Supabase
        const newComment = await createComment(postId, authUser.id, commentText.trim());

        const commentWithUser = {
          ...newComment,
          user_metadata: {
            first_name: authUser.user_metadata?.first_name || user.firstName,
            last_name: authUser.user_metadata?.last_name || ''
          }
        };

        setPostComments(prev => ({
          ...prev,
          [postId]: [commentWithUser, ...(prev[postId] || [])]
        }));

        setCommunityPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, comments: p.comments + 1 } : p
        ));

        setCommentInputs(prev => ({ ...prev, [postId]: '' }));

        console.log('✅ Commented on user post');
      }
    } catch (error) {
      console.error('❌ Error submitting comment:', error);
      if (error.message.includes('authentication expired')) {
        alert('Your Reddit session has expired. Please reconnect your Reddit account.');
        initiateRedditAuth();
      } else {
        alert(`Failed to submit comment: ${error.message}`);
      }
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen bg-black text-white flex" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Left Sidebar - Fixed */}
      <div className="bg-black flex flex-col overflow-hidden" style={{ width: '650px', minWidth: '650px', maxHeight: '100vh' }}>
        {/* Header */}
        <div className="flex-shrink-0 px-8" style={{ paddingTop: '19.38px', paddingBottom: '5px' }}>
          <div className="flex items-center justify-between">
            <div
              className="w-auto cursor-pointer"
              style={{
                backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                width: '108.8px',
                height: '36px',
                marginBottom: '12px',
                marginLeft: '-5.44px'
              }}
              onClick={() => navigate('/')}
            />
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 pb-3 overflow-y-auto hide-scrollbar" style={{ paddingLeft: 'calc(41.56px + 15px)', paddingRight: '12px' }}>
          <div className="flex flex-col" style={{ gap: '0px', minHeight: '100%' }}>
              {/* Welcome Section */}
              <div className="flex-shrink-0" style={{ minHeight: '165px', paddingTop: '10px' }}>
                <h1 className="font-semibold" style={{ fontSize: '34px', marginBottom: '8px' }}>
                  Welcome, <span className="text-pink-500">{user.firstName}</span>
                </h1>
                <h2 className="font-semibold mb-0.5" style={{ letterSpacing: '0.011em', fontSize: '27px' }}>{user.enrolledCourse}</h2>
                <p className="text-white" style={{ letterSpacing: '0.011em', fontSize: '14px', fontWeight: '100', marginBottom: '0.2rem' }}>
                  {completedLessons.length === 0 ? (
                    `Ready when you are, ${user.firstName}.`
                  ) : progressPercentage >= 100 && userCertificate ? (
                    <>
                      You've completed the {user.enrolledCourse} course.{' '}
                      <a
                        href={`/certificate/${userCertificate.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:text-pink-400 font-medium"
                      >
                        View your certificate.
                      </a>
                    </>
                  ) : (
                    <>
                      You're <span className="text-white font-semibold">{progressPercentage}%</span> through the {user.enrolledCourse} course.
                    </>
                  )}
                </p>
                <div className="w-full bg-white rounded-full overflow-hidden" style={{ height: '14px' }}>
                  <div
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercentage === 0 ? 2.5 : progressPercentage}%`,
                      height: '14px',
                      background: 'linear-gradient(to right, #7714E0, #7714E0)'
                    }}
                  />
                </div>
              </div>

              {/* Upcoming Lessons */}
              <div className="flex-shrink-0 relative" style={{ marginTop: '3px', minHeight: '160px' }}>
                <h2 className="font-semibold" style={{ fontSize: '19px', marginBottom: '0.05rem' }}>
                  {upcomingLessons.length > 0 && snappedCardIndex < upcomingLessons.length && upcomingLessons[snappedCardIndex] ? (
                    (() => {
                      const snappedLesson = upcomingLessons[snappedCardIndex];
                      const isCompleted = isLessonCompleted(snappedLesson.module_number, snappedLesson.lesson_number);
                      // Find the first incomplete lesson (this is the current lesson)
                      const firstIncompleteIndex = upcomingLessons.findIndex(l => !isLessonCompleted(l.module_number, l.lesson_number));
                      const isCurrentLesson = snappedCardIndex === firstIncompleteIndex;

                      if (isCompleted) return 'Completed Lesson';
                      if (isCurrentLesson) return 'Current Lesson';
                      return 'Upcoming Lesson';
                    })()
                  ) : 'Upcoming Lessons'}
                </h2>
                <div
                  ref={scrollContainerRef}
                  className="overflow-x-auto overflow-y-hidden select-none"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    scrollBehavior: enableSmoothScroll ? 'smooth' : 'auto',
                    WebkitOverflowScrolling: 'touch',
                    cursor: isScrolling ? 'grabbing' : 'grab',
                    scrollSnapType: 'x mandatory',
                    scrollSnapStop: 'always',
                    scrollPaddingLeft: '0px',
                    willChange: 'scroll-position',
                    opacity: isCarouselReady ? 1 : 0,
                    visibility: isCarouselReady ? 'visible' : 'hidden',
                    transition: 'opacity 0.3s ease-in'
                  }}
                  onMouseDown={handleScrollMouseDown}
                  onMouseMove={handleScrollMouseMove}
                  onMouseUp={handleScrollMouseUp}
                  onMouseLeave={handleScrollMouseLeave}
                  onScroll={handleScroll}
                >
                  <div
                    className="flex gap-4"
                    style={{
                      minHeight: '100px',
                      height: '100px',
                      paddingRight: containerWidth > 0 ? `${Math.max(0, containerWidth - 390 - 16)}px` : '0px'
                    }}
                  >
                  {upcomingLessons.length > 0 ? (
                    upcomingLessons.map((lesson, index) => {
                      const isAccessible = isLessonAccessible(lesson.module_number, lesson.lesson_number);
                      const isCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
                      // Find the first incomplete lesson (this is the current lesson)
                      const firstIncompleteIndex = upcomingLessons.findIndex(l => !isLessonCompleted(l.module_number, l.lesson_number));
                      const isCurrentLesson = index === firstIncompleteIndex;

                      return (
                        <div
                          key={`${lesson.module_number}-${lesson.lesson_number}`}
                          className="relative flex items-center gap-3"
                          style={{
                            width: (isCompleted || isCurrentLesson) ? '390px' : '346.06px',
                            minWidth: (isCompleted || isCurrentLesson) ? '390px' : '346.06px',
                            flexShrink: 0,
                            paddingTop: '5.618px',
                            paddingRight: '5.618px',
                            paddingBottom: '5.618px',
                            paddingLeft: '14px',
                            borderRadius: '0.3rem',
                            background: '#7714E0',
                            height: '90px',
                            scrollSnapAlign: 'start',
                            scrollSnapStop: 'always'
                          }}
                        >
                            {/* Opacity overlay for non-snapped cards */}
                            {index !== snappedCardIndex && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                  backdropFilter: 'blur(0.75px)',
                                  WebkitBackdropFilter: 'blur(0.75px)',
                                  borderRadius: '0.3rem',
                                  pointerEvents: 'none',
                                  transition: 'background-color 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), backdrop-filter 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'
                                }}
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold truncate text-white" style={{ marginBottom: '3px', fontSize: '13px' }}>
                                {lesson.lesson_name || `Lesson ${lesson.lesson_number}`}
                              </h4>
                              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.01rem' }}>
                                {(lesson.bullet_points || [])
                                  .slice(0, 3)
                                  .map((bulletPoint, idx) => (
                                    <li key={idx} className="text-xs flex items-start gap-2 text-purple-100">
                                      <span className="mt-0.5 text-purple-200">•</span>
                                      <span>{bulletPoint}</span>
                                    </li>
                                  ))}
                              </ul>
                            </div>

                            {/* Arrow button for completed and current lessons */}
                            {(isCompleted || isCurrentLesson) && (
                              <button
                                className="bg-white text-black font-bold hover:bg-purple-50 transition-colors flex-shrink-0 group"
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '0.3rem',
                                  marginRight: '10px'
                                }}
                                onClick={() => {
                                  console.log('🎯 Navigating to lesson:', {
                                    module: lesson.module_number,
                                    lesson: lesson.lesson_number,
                                    userEnrolledCourse: user.enrolledCourse,
                                    lessonCourseId: lesson.course_id
                                  });
                                  navigate(`/learning?module=${lesson.module_number}&lesson=${lesson.lesson_number}`);
                                }}
                              >
                                <svg className="group-hover:stroke-pink-500 transition-colors" width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                              </button>
                            )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center" style={{ padding: '7.398px' }}>
                      <p className="text-purple-200 text-sm">No lesson data available</p>
                    </div>
                  )}
                  </div>
                </div>

                {/* Back to Current Lesson Button - Hide when viewing current lesson or when all lessons are completed */}
                {(() => {
                  // Check if all lessons in the course are completed
                  const allLessonsCompleted = completedLessons.length === upcomingLessons.length && upcomingLessons.length > 0;

                  // Find the index of the first incomplete lesson (current lesson)
                  const currentLessonIndex = upcomingLessons.findIndex(
                    l => !isLessonCompleted(l.module_number, l.lesson_number)
                  );
                  // Show button only when NOT viewing the current lesson
                  const isNotViewingCurrentLesson = snappedCardIndex !== currentLessonIndex;
                  // Determine if viewing a completed lesson (left of current) or upcoming lesson (right of current)
                  const isViewingCompletedLesson = snappedCardIndex < currentLessonIndex;

                  return isNotViewingCurrentLesson && !allLessonsCompleted && (
                    <button
                      onClick={scrollToCurrentLesson}
                      className="absolute bg-white text-black hover:bg-purple-50 transition-all"
                      style={{
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(calc(-50% - 5px))',
                        width: '40px',
                        height: '40px',
                        borderRadius: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 10,
                        opacity: 0.7
                      }}
                    >
                      {isViewingCompletedLesson ? (
                        // Right-pointing arrow when viewing completed lessons
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      ) : (
                        // Left-pointing arrow when viewing upcoming lessons
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                      )}
                    </button>
                  );
                })()}
              </div>

              {/* Office Hours */}
              <div className="flex-shrink-0" style={{ marginTop: '-28px', minHeight: '160px' }}>
                <h2 className="font-semibold" style={{ fontSize: '19px', marginBottom: '-2px' }}>Office Hours</h2>
                <p className="text-white" style={{ letterSpacing: '0.011em', fontSize: '14px', fontWeight: '100', marginBottom: '2px' }}>Get personalised support from your course leaders.</p>
                <div className="rounded-lg" style={{ padding: '12px', minHeight: '100px', background: '#7714E0' }}>
                  {coaches || calendlyLink ? (
                    <div className="flex gap-2.5 h-full items-center">
                      <div className="flex-1 grid grid-cols-4" style={{ gap: '-1px' }}>
                        {(() => {
                          // Create array of 4 slots, fill with coaches or placeholders
                          const displayCoaches = [];
                          for (let i = 0; i < 4; i++) {
                            displayCoaches.push(coaches && coaches[i] ? coaches[i] : null);
                          }

                          return displayCoaches.map((coach, index) => (
                            <div key={coach?.id || `placeholder-${index}`} className="flex flex-col items-center text-center group">
                              {coach && coach.linkedin_url ? (
                                <a
                                  href={coach.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center cursor-pointer"
                                >
                                  {coach.image_url ? (
                                    <img
                                      src={coach.image_url}
                                      alt={coach.name}
                                      className="w-[50.4px] h-[50.4px] rounded object-cover mb-1"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                                  )}
                                  <span className="font-semibold text-white block truncate w-full" style={{ fontSize: '12px', lineHeight: '1.2' }}>
                                    {coach.name}
                                  </span>
                                  {coach.position && (
                                    <p className="text-white truncate w-full" style={{ fontSize: '10px', marginTop: '0.5px', lineHeight: '1.2', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>
                                  )}
                                </a>
                              ) : (
                                <div className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center">
                                  {coach ? (
                                    <>
                                      {coach.image_url ? (
                                        <img
                                          src={coach.image_url}
                                          alt={coach.name}
                                          className="w-[50.4px] h-[50.4px] rounded object-cover mb-1"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                                      )}
                                      <h3 className="font-semibold text-white mb-0 truncate w-full" style={{ fontSize: '12px', lineHeight: '1.2' }}>{coach.name}</h3>
                                      {coach.position && (
                                        <p className="text-white truncate w-full" style={{ fontSize: '10px', marginTop: '0.5px', lineHeight: '1.2', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                                      <div className="h-2.5 bg-white/10 rounded mb-0.5 w-16" />
                                      <div className="h-2 bg-white/10 rounded w-12" style={{ marginBottom: '-3px' }} />
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                      {calendlyLink && (
                        <div className="flex items-center" style={{ paddingRight: '2px' }}>
                          <button
                            onClick={handleOpenCalendly}
                            className="bg-white text-black font-bold hover:bg-purple-50 transition-colors flex-shrink-0 group"
                            style={{
                              width: '48px',
                              height: '48px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '0.3rem'
                            }}
                            title="Book Office Hours"
                          >
                            <svg className="group-hover:stroke-pink-500 transition-colors" width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <button
                        onClick={handleOpenCalendly}
                        className="bg-white hover:bg-gray-100 text-black font-semibold py-3 px-6 rounded-lg transition"
                      >
                        Book Office Hours
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Merchandise */}
              <div className="flex-shrink-0" style={{ marginTop: '4px', minHeight: '160px' }}>
                <h2 className="font-semibold" style={{ fontSize: '19px', marginBottom: '-2px' }}>Merchandise</h2>
                <p className="text-white font-light" style={{ letterSpacing: '0.011em', fontSize: '14px', marginBottom: '2px' }}>All profit supports education projects across the UK.</p>
                <div className="bg-white rounded-lg flex justify-between items-center gap-2" style={{ padding: '10px', paddingLeft: '14px', paddingRight: '14px', height: '105px' }}>
                  <img
                    src="https://auth.ignite.education/storage/v1/object/public/assets/15296564955925613761_2048.jpg.webp"
                    alt="Tote bag"
                    className="h-full object-cover rounded transition-transform duration-200 hover:scale-105 cursor-pointer"
                    onClick={handleOpenShop}
                  />
                  <img
                    src="https://auth.ignite.education/storage/v1/object/public/assets/6000531078946675470_2048.jpg.webp"
                    alt="Black Mug"
                    className="h-full object-cover rounded transition-transform duration-200 hover:scale-105 cursor-pointer"
                    onClick={handleOpenMug}
                  />
                  <img
                    src="https://auth.ignite.education/storage/v1/object/public/assets/15764184527208086102_2048%20(1).jpg"
                    alt="Notebook"
                    className="h-full object-cover rounded transition-transform duration-200 hover:scale-105 cursor-pointer"
                    onClick={handleOpenNotebook}
                  />
                  <img
                    src="https://auth.ignite.education/storage/v1/object/public/assets/13210320553437944029_2048.jpg.webp"
                    alt="Sweatshirt"
                    className="h-full object-cover rounded transition-transform duration-200 hover:scale-105 cursor-pointer"
                    onClick={handleOpenSweatshirt}
                  />
                </div>
              </div>

              {/* Footer Links */}
              <div className="flex gap-4 text-white font-semibold flex-shrink-0" style={{ fontSize: '14px', paddingTop: '2px', marginTop: '1px' }}>
                <button
                  className="hover:text-pink-500 transition"
                  onClick={() => window.open('https://www.linkedin.com/school/ignite-courses', '_blank', 'noopener,noreferrer')}
                >
                  LinkedIn
                </button>
                <button className="hover:text-pink-500 transition" onClick={handleOpenSettings}>Settings</button>
                <button
                  className="hover:text-pink-500 transition"
                  onClick={() => window.location.href = `mailto:support@ignite.education?subject=Support Request: ${user.firstName} ${user.lastName}&body=My Ignite Account is ${user.email}`}
                >
                  Support
                </button>
                <button
                  className="hover:text-pink-500 transition"
                  onClick={() => window.location.href = `mailto:feedback@ignite.education?subject=Feedback: ${user.firstName} ${user.lastName}`}
                >
                  Feedback
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* Right Panel - Community Forum */}
      <div className="flex-1 h-screen flex flex-col overflow-hidden py-2 px-8">
        <div className="w-full flex flex-col h-full" style={{ maxWidth: '739px', minWidth: '600px', margin: '0 auto' }}>
          {/* Static Header Section */}
          <div className="flex-shrink-0" style={{ paddingTop: '138px' }}>
              <h2 className="font-semibold" style={{ fontSize: '25.3px', marginBottom: '0.175rem' }}>Community Forum</h2>

              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setShowPostModal(true)}
                  className="bg-white flex items-center justify-center hover:bg-purple-50 flex-shrink-0 group"
                  style={{
                    width: '38.4px',
                    height: '38.4px',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '0.3rem'
                  }}
                >
                  <FileEdit size={20} className="text-black group-hover:text-pink-500 transition-colors" />
                </button>
                {hasPostedToReddit && (
                  <button
                    onClick={handleOpenMyPosts}
                    className="bg-white flex items-center justify-center hover:bg-purple-50 flex-shrink-0 group"
                    style={{
                      width: '38.4px',
                      height: '38.4px',
                      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: '0.3rem'
                    }}
                  >
                    <Inbox size={20} className="text-black group-hover:text-pink-500 transition-colors" />
                  </button>
                )}
                <div className="flex-1">
                  <p className="text-pink-500 font-bold text-base" style={{ marginBottom: '1px' }}>Join the {user.enrolledCourse} conversation.</p>
                  <p className="text-white" style={{ fontSize: '14px' }}>Discover discussions, ask questions and engage with the {courseReddit.channel} community.</p>
                </div>
              </div>
            </div>

            {/* Scrollable Posts Section */}
            <div
              ref={postsScrollRef}
              className="flex-1 overflow-y-auto relative"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overscrollBehavior: 'contain' // Prevent browser's native pull-to-refresh
              }}
              onTouchStart={handlePullStart}
              onTouchEnd={handlePullEnd}
              onMouseDown={handlePullStart}
            >
              {/* Refresh indicator that pushes posts down slightly */}
              <div
                style={{
                  height: isRefreshing ? '40px' : '0px',
                  transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden'
                }}
              >
                {isRefreshing && (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      height: '40px',
                      paddingTop: '8px',
                      animation: 'fadeIn 0.2s ease-out'
                    }}
                  >
                    <div
                      className="bg-white rounded-full flex items-center justify-center animate-spin"
                      style={{
                        width: '28px',
                        height: '28px'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pb-8 pt-2">
                  {communityPosts.length === 0 && !loading && (
                    <div className="bg-gray-900 rounded-lg p-8 text-center">
                      <p className="text-gray-400">No posts yet. Be the first to start a conversation!</p>
                    </div>
                  )}
                  {communityPosts.map(post => (
                    <div
                      key={post.id}
                      ref={(el) => postRefs.current[post.id] = el}
                      data-post-id={post.id}
                      onMouseEnter={() => handlePostHover(post)}
                      onMouseLeave={handlePostLeave}
                      style={{
                        minHeight: isCollapsing[post.id] && collapsedHeights[post.id]
                          ? `${collapsedHeights[post.id]}px`
                          : 'auto',
                        transition: 'min-height 0.3s ease-out'
                      }}
                    >
                    <div
                      className="bg-gray-900 rounded-lg p-5 hover:bg-gray-800 transition"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {post.author_icon ? (
                          <img
                            src={post.author_icon}
                            alt={post.author}
                            className="w-7 h-7 rounded-full flex-shrink-0 object-cover"
                            onError={(e) => {
                              // Fallback to colored circle if image fails to load
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-7 h-7 ${post.avatar} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${post.author_icon ? 'hidden' : ''}`}>
                          {post.author && post.author.length > 2 ? post.author.charAt(2).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-white">{post.author}</span>
                            <span className="text-xs text-white">• {post.time}</span>
                          </div>
                          <h3 className="font-bold mb-1 text-sm text-white">{post.title}</h3>
                          <p className={`text-xs text-white leading-relaxed mb-2 ${expandedPostId === post.id ? '' : 'line-clamp-3'}`}>{post.content}</p>
                          <div className="flex items-center gap-4 text-xs text-white">
                            <div className="flex items-center gap-1.5">
                              <button
                                className={`hover:text-white transition ${likedPosts.has(post.id) ? 'text-pink-500' : ''}`}
                                onClick={() => handleLikePost(post.id)}
                              >
                                <ThumbsUp size={14} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
                              </button>
                              <span className="font-semibold text-xs">{post.upvotes}</span>
                              <button className="hover:text-white transition">
                                <ThumbsDown size={14} />
                              </button>
                            </div>
                            <button
                              className="flex items-center gap-1 hover:text-white transition"
                              onClick={() => {
                                // Toggle expanded state
                                if (expandedPostId === post.id) {
                                  setExpandedPostId(null);
                                } else {
                                  setExpandedPostId(post.id);
                                  // Fetch comments if not already loaded
                                  fetchRedditCommentsForPost(post);
                                }
                              }}
                            >
                              <MessageSquare size={14} />
                              <span className="text-xs">{post.comments || 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Comments Section - Separate box below post, aligned right, 90% width */}
                    {(expandedPostId === post.id || (isCollapsing[post.id] && collapsedHeights[post.id])) && (
                      <div
                        className="ml-auto mt-2 animate-fadeIn"
                        style={{
                          width: '90%',
                          animation: 'slideDown 0.3s ease-out',
                          opacity: expandedPostId === post.id ? 1 : 0,
                          transition: 'opacity 0.3s ease-out'
                        }}
                      >
                        <div className={`bg-gray-800 rounded-lg ${postComments[post.id] === 'AUTH_REQUIRED' ? 'p-3' : 'p-4'}`}>
                          {postComments[post.id] !== 'AUTH_REQUIRED' && (
                            <h4 className="text-xs font-semibold text-gray-400 mb-3">
                              Comments ({postComments[post.id]?.length || 0})
                            </h4>
                          )}

                          {/* Comment Input - Only show if Reddit is authenticated */}
                          {postComments[post.id] !== 'AUTH_REQUIRED' && (
                            <div className="flex gap-2 mb-4">
                              <div className={`w-6 h-6 ${post.avatar} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                                {user.firstName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  value={commentInputs[post.id] || ''}
                                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSubmitComment(post.id);
                                    }
                                  }}
                                  placeholder="Add a comment..."
                                  className="flex-1 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                                <button
                                  onClick={() => handleSubmitComment(post.id)}
                                  className="bg-pink-500 text-white text-xs px-3 py-2 rounded-lg hover:bg-pink-600 transition font-semibold"
                                >
                                  Post
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Loading indicator */}
                          {loadingComments[post.id] && (
                            <div className="flex justify-center py-4">
                              <div className="text-gray-400 text-xs">Loading comments...</div>
                            </div>
                          )}

                          {/* Scrollable comments area - max 3 visible */}
                          <div
                            className="space-y-3 overflow-y-auto"
                            style={{
                              maxHeight: postComments[post.id] === 'AUTH_REQUIRED' ? '60px' : '200px', // Reduce height for auth required
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#4B5563 #1F2937'
                            }}
                          >
                            {/* Display actual comments from database or Reddit */}
                            {postComments[post.id] === 'AUTH_REQUIRED' ? (
                              <div className="flex items-center justify-center gap-3 py-2">
                                <p className="text-xs text-gray-400">Connect your Reddit account to view comments</p>
                                <button
                                  onClick={() => initiateRedditAuth()}
                                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-lg font-semibold transition"
                                >
                                  Connect Reddit
                                </button>
                              </div>
                            ) : postComments[post.id] && postComments[post.id].length > 0 ? (
                              postComments[post.id].map((comment) => {
                                // Handle both Reddit comments and user comments
                                const commentAuthor = comment.author || comment.user_metadata?.first_name || 'User';
                                const avatarColors = ['bg-purple-600', 'bg-yellow-500', 'bg-teal-500', 'bg-blue-600', 'bg-green-600', 'bg-red-600'];
                                const avatarColor = comment.user_id
                                  ? avatarColors[comment.user_id.charCodeAt(0) % avatarColors.length]
                                  : avatarColors[commentAuthor.charCodeAt(0) % avatarColors.length];
                                const timeAgo = getTimeAgo(comment.created_at);

                                return (
                                  <div key={comment.id} className="flex gap-2">
                                    {comment.author_icon ? (
                                      <img
                                        src={comment.author_icon}
                                        alt={commentAuthor}
                                        className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                                        onError={(e) => {
                                          // Fallback to colored circle if image fails to load
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className={`w-6 h-6 ${avatarColor} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}
                                      style={{ display: comment.author_icon ? 'none' : 'flex' }}
                                    >
                                      {commentAuthor.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-400">u/{commentAuthor}</span>
                                        <span className="text-xs text-gray-500">• {timeAgo}</span>
                                      </div>
                                      <p className="text-xs text-gray-300">{comment.content}</p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

      {/* Post Creation Modal */}
      {showPostModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseModal}
        >
          <div className="relative w-full px-4" style={{ maxWidth: '700px' }}>
            <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>What's on your mind?</h2>

            <div
              className="bg-white text-black relative"
              style={{
                animation: isClosingModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
                padding: '1.5rem',
                maxHeight: '85vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-gray-600 hover:text-black"
              >
                <X size={24} />
              </button>

              <form onSubmit={handleSubmitPost}>
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-gray-700" style={{ marginBottom: '0.1rem' }}>Title</label>
                    <input
                      type="text"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                      style={{ borderRadius: '0.3rem' }}
                      placeholder="Enter your post title"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700" style={{ marginBottom: '0.1rem' }}>Content</label>
                    <textarea
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none"
                      style={{ height: '120px', borderRadius: '0.3rem' }}
                      placeholder="What's on your mind?"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Flair Selector */}
                  {(() => {
                    const subreddit = courseReddit.channel.replace(/^r\//, '');
                    const availableFlairs = SUBREDDIT_FLAIRS[subreddit];

                    if (availableFlairs && availableFlairs.length > 0) {
                      return (
                        <div>
                          <label className="block font-semibold text-gray-700" style={{ marginBottom: '0.1rem' }}>
                            Post Flair
                          </label>
                          <select
                            value={newPost.flair}
                            onChange={(e) => setNewPost({ ...newPost, flair: e.target.value })}
                            className="w-full bg-gray-100 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            style={{
                              borderRadius: '0.3rem',
                              color: newPost.flair ? 'black' : '#6B7280',
                              paddingRight: '2rem',
                              backgroundPosition: 'right calc(0.5rem + 20px) center'
                            }}
                            disabled={isSubmitting}
                            required
                          >
                            <option value="" style={{ color: '#6B7280' }}>
                              Select a flair
                            </option>
                            {availableFlairs.map((flair) => (
                              <option key={flair.value} value={flair.value} style={{ color: 'black' }}>
                                {flair.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div>
                    <div className="flex items-center gap-3 p-3 bg-gray-100" style={{ borderRadius: '0.3rem' }}>
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#FF4500">
                        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                      </svg>
                      <span className="text-black text-sm font-medium flex-1">
                        This will be posted to {courseReddit.channel}
                      </span>
                      {redditAuthenticated && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Connected as u/{redditUsername}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2 bg-gray-300 text-black font-semibold hover:bg-gray-400 transition"
                      style={{ borderRadius: '0.3rem' }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-pink-500 text-white font-semibold hover:bg-pink-600 transition disabled:opacity-50"
                      style={{ borderRadius: '0.3rem' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* My Posts Modal */}
      {showMyPostsModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingMyPostsModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseMyPostsModal}
        >
          <div className="relative w-full px-4" style={{ maxWidth: '800px' }}>
            <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
              My Posts
            </h2>

            <div
              className="bg-white text-black relative"
              style={{
                animation: isClosingMyPostsModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
                padding: '2rem 2rem 1rem 2rem',
                maxHeight: '68vh',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseMyPostsModal}
                className="absolute top-8 right-8 text-gray-600 hover:text-black z-10"
              >
                <X size={24} />
              </button>

              {/* Show loading animation while any content is loading */}
              {(loadingMyPosts || loadingMyComments) ? (
                <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                  {lottieData && Object.keys(lottieData).length > 0 ? (
                    <Lottie
                      animationData={lottieData}
                      loop={true}
                      autoplay={true}
                      style={{
                        width: 150,
                        height: 150
                      }}
                    />
                  ) : (
                    <div className="text-gray-600">Loading...</div>
                  )}
                </div>
              ) : (
                <>
                  {/* Reddit Account Section */}
                  {redditUsername && (
                <div className="pb-4 border-b border-gray-200" style={{ marginBottom: '0.9rem' }}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Account</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {redditUsername.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">u/{redditUsername}</p>
                        <p className="text-xs text-gray-500">Connected Reddit Account</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Disconnect your Reddit account? You will need to reconnect to view and post to Reddit.')) {
                          clearRedditTokens();
                          setRedditAuthenticated(false);
                          setRedditUsername(null);
                          handleCloseMyPostsModal();
                        }
                      }}
                      className="text-xs text-gray-600 hover:text-gray-900 underline transition"
                      style={{ marginRight: '28px', marginTop: '-3px' }}
                    >
                      Change Account
                    </button>
                  </div>
                </div>
              )}

              {/* Posts Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Posts</h3>
                {myRedditPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-gray-600 mb-2">No posts found</p>
                    <p className="text-gray-500 text-sm">Start sharing your thoughts with the community!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                  {myRedditPosts.map((post) => (
                    <div key={post.id}>
                      <div
                        className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition"
                        onMouseEnter={() => handleMyPostHover(post)}
                        onMouseLeave={handleMyPostLeave}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(post.author || redditUsername || user.firstName)?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-600">{post.author || redditUsername || user.firstName || 'User'}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-600">{new Date(post.created_utc * 1000).toLocaleDateString()}</span>
                            </div>
                            <h3 className="font-bold mb-1 text-sm text-gray-900">{post.title}</h3>
                            <p className="text-xs text-gray-600 mb-2">r/{post.subreddit}</p>
                            {post.selftext && (
                              <p className={`text-sm text-gray-900 mb-2 whitespace-pre-wrap ${expandedMyPostId === post.id ? '' : 'line-clamp-3'}`}>{post.selftext}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <ThumbsUp size={12} />
                                <span>{post.score}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare size={12} />
                                <span>{post.num_comments}</span>
                              </div>
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-gray-900 underline"
                              >
                                View on Reddit
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Comments Section */}
                      {expandedMyPostId === post.id && (
                        <div
                          className="ml-auto mt-2 animate-fadeIn"
                          style={{
                            width: '90%',
                            animation: 'slideDown 0.3s ease-out'
                          }}
                        >
                          <div className={`bg-gray-100 rounded-lg ${postComments[post.id] === 'AUTH_REQUIRED' ? 'p-3' : 'p-4'}`}>
                            {postComments[post.id] !== 'AUTH_REQUIRED' && (
                              <h4 className="text-xs font-semibold text-gray-700 mb-3">
                                Comments ({postComments[post.id]?.length || 0})
                              </h4>
                            )}

                            {/* Loading indicator */}
                            {loadingComments[post.id] && (
                              <div className="flex justify-center py-4">
                                <div className="text-gray-600 text-xs">Loading comments...</div>
                              </div>
                            )}

                            {/* Scrollable comments area */}
                            <div
                              className="space-y-3 overflow-y-auto"
                              style={{
                                maxHeight: postComments[post.id] === 'AUTH_REQUIRED' ? '60px' : '200px',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#4B5563 #1F2937'
                              }}
                            >
                              {/* Display actual comments from Reddit */}
                              {postComments[post.id] === 'AUTH_REQUIRED' ? (
                                <div className="flex items-center justify-center gap-3 py-2">
                                  <p className="text-xs text-gray-600">Connect your Reddit account to view comments</p>
                                  <button
                                    onClick={() => initiateRedditAuth()}
                                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-lg font-semibold transition"
                                  >
                                    Connect Reddit
                                  </button>
                                </div>
                              ) : postComments[post.id] && postComments[post.id].length > 0 ? (
                                postComments[post.id].map((comment, index) => {
                                  const commentAuthor = comment.author || 'User';
                                  const avatarColors = ['bg-purple-600', 'bg-yellow-500', 'bg-teal-500', 'bg-blue-600', 'bg-green-600', 'bg-red-600'];
                                  const avatarColor = avatarColors[commentAuthor.charCodeAt(0) % avatarColors.length];

                                  return (
                                    <div key={index} className="flex items-start gap-2">
                                      <div className={`w-6 h-6 ${avatarColor} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                                        {commentAuthor.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-semibold text-gray-900">{commentAuthor}</span>
                                        </div>
                                        <p className="text-xs text-gray-700 break-words">{comment.body}</p>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : !loadingComments[post.id] && (
                                <p className="text-xs text-gray-600 text-center py-4">No comments yet</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Comments</h3>
                {myRedditComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-2">No comments found</p>
                    <p className="text-gray-500 text-sm">Start engaging with the community!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRedditComments.map((comment) => (
                      <div key={comment.id} className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition">
                        {/* Comment metadata */}
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(comment.author || redditUsername)?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-600">Commented in</span>
                              <span className="text-xs font-semibold text-gray-900">r/{comment.subreddit}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-600">{new Date(comment.created_utc * 1000).toLocaleDateString()}</span>
                            </div>
                            {/* Post title */}
                            <a
                              href={comment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-700 hover:text-gray-900 font-medium mb-2 block line-clamp-2"
                            >
                              On: "{comment.post_title}"
                            </a>
                            {/* Comment body */}
                            <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">{comment.body}</p>
                            {/* Comment stats */}
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <ThumbsUp size={12} />
                                <span>{comment.score}</span>
                              </div>
                              <a
                                href={comment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-gray-900 underline"
                              >
                                View on Reddit
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm animate-fadeIn"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingSettingsModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out',
            padding: '2rem',
            overflowY: 'auto'
          }}
          onClick={handleCloseSettings}
        >
          <div className="relative w-full px-4" style={{ maxWidth: '700px', marginBottom: '2rem' }}>
            {/* Title above the box */}
            <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>Settings</h2>

            {/* Settings Card */}
            <div
              className="bg-white text-black relative"
              style={{
                animation: isClosingSettingsModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
                padding: '1.5rem',
                minHeight: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseSettings}
                className="absolute top-4 right-4 text-gray-600 hover:text-black"
              >
                <X size={24} />
              </button>

              {/* Tabs */}
              <div className="flex gap-4 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setSettingsTab('account')}
                  className={`pb-2 px-1 font-medium transition ${settingsTab === 'account' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Account
                </button>
                <button
                  onClick={() => setSettingsTab('preferences')}
                  className={`pb-2 px-1 font-medium transition ${settingsTab === 'preferences' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Preferences
                </button>
                <button
                  onClick={() => setSettingsTab('danger')}
                  className={`pb-2 px-1 font-medium transition ${settingsTab === 'danger' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Account Actions
                </button>
              </div>

              {/* Account Tab */}
              {settingsTab === 'account' && (
                <form onSubmit={handleUpdateAccount} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-0.5">First Name</label>
                      <input
                        type="text"
                        value={settingsForm.firstName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, firstName: e.target.value })}
                        className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        style={{ borderRadius: '0.3rem' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-0.5">Last Name</label>
                      <input
                        type="text"
                        value={settingsForm.lastName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, lastName: e.target.value })}
                        className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        style={{ borderRadius: '0.3rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-0.5">Email</label>
                    <input
                      type="email"
                      value={settingsForm.email}
                      onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                      style={{ borderRadius: '0.3rem' }}
                    />
                    <p className="text-xs text-gray-500 mt-0.5">You'll need to verify your new email address</p>
                  </div>

                  {authUser?.app_metadata?.provider === 'email' && (
                    <>
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <h3 className="font-semibold mb-2">Change Password</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-0.5">New Password</label>
                            <input
                              type="password"
                              value={settingsForm.newPassword}
                              onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                              className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              style={{ borderRadius: '0.3rem' }}
                              placeholder="Leave blank to keep current"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-0.5">Confirm New Password</label>
                            <input
                              type="password"
                              value={settingsForm.confirmPassword}
                              onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                              className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              style={{ borderRadius: '0.3rem' }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <h3 className="font-semibold mb-2">Linked Accounts</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="text-sm">Google</span>
                        </div>
                        {authUser?.identities?.some(id => id.provider === 'google') ? (
                          <button
                            type="button"
                            onClick={() => handleUnlinkProvider('google')}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Unlink
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLinkProvider('google')}
                            className="text-xs text-purple-600 hover:text-purple-700"
                          >
                            Link
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="#0077B5" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          <span className="text-sm">LinkedIn</span>
                        </div>
                        {authUser?.identities?.some(id => id.provider === 'linkedin_oidc') ? (
                          <button
                            type="button"
                            onClick={() => handleUnlinkProvider('linkedin_oidc')}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Unlink
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLinkProvider('linkedin_oidc')}
                            className="text-xs text-purple-600 hover:text-purple-700"
                          >
                            Link
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-pink-500 text-white px-5 py-3 text-sm font-semibold hover:bg-pink-600 transition"
                    style={{ borderRadius: '0.3rem' }}
                  >
                    Save Changes
                  </button>
                </form>
              )}

              {/* Preferences Tab */}
              {settingsTab === 'preferences' && (
                <form onSubmit={handleUpdatePreferences} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Course</label>
                    <div className="relative">
                      <select
                        value={settingsForm.selectedCourse}
                        onChange={(e) => setSettingsForm({ ...settingsForm, selectedCourse: e.target.value })}
                        className="w-full bg-gray-100 text-black px-4 py-3 pr-10 focus:outline-none focus:ring-1 focus:ring-pink-500 appearance-none cursor-pointer font-medium"
                        style={{ borderRadius: '0.3rem' }}
                      >
                        {availableCourses.length > 0 ? (
                          availableCourses.map((course) => (
                            <option key={course.name} value={course.name}>
                              {course.title || course.name}
                            </option>
                          ))
                        ) : (
                          <option value="product-manager">Product Manager</option>
                        )}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Switch between available courses</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="font-semibold mb-3">Email Preferences</h3>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Marketing Emails</p>
                        <p className="text-xs text-gray-500">Receive updates about new courses and features</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsForm.marketingEmails}
                          onChange={(e) => setSettingsForm({ ...settingsForm, marketingEmails: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-pink-500 text-white px-5 py-3 text-sm font-semibold hover:bg-pink-600 transition"
                    style={{ borderRadius: '0.3rem' }}
                  >
                    Save Preferences
                  </button>
                </form>
              )}

              {/* Danger Zone Tab */}
              {settingsTab === 'danger' && (
                <div className="space-y-3.2">
                  <div className="p-4">
                    <h3 className="font-semibold text-black mb-0.8">Log Out</h3>
                    <p className="text-sm text-gray-700 mb-3">Sign out of your account on this device.</p>
                    <button
                      onClick={handleLogout}
                      className="px-5 py-1.5 bg-yellow-500 text-white font-semibold text-sm rounded-lg hover:bg-yellow-600 transition"
                    >
                      Log Out
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-black mb-0.8">Delete Account</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-5 py-1.5 bg-red-600 text-white font-semibold text-sm rounded-lg hover:bg-red-700 transition"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment/Upgrade Modal */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseUpgradeModal}
        >
          <div className="relative">
            <div
              className="bg-white relative flex"
              style={{
                width: '850px',
                height: '75vh',
                minHeight: '500px',
                padding: '0px',
                animation: isClosingModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseUpgradeModal}
                className="absolute top-6 right-6 text-gray-600 hover:text-black z-10"
              >
                <X size={24} />
              </button>

              {/* Left side - Features section (fixed) */}
              <div style={{ width: '45.6%', borderRadius: '0.3rem 0 0 0.3rem' }} className="bg-black p-8 flex flex-col justify-center">
                <h3 className="text-white text-2xl font-medium mb-8" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                  For just 99p/week,<br />
                  <span className="text-pink-500">get exclusive access to</span>
                </h3>

                <div className="space-y-2">
                  {/* Ad-free feature */}
                  <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '1.5s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-1">Ad-free</h4>
                      <p className="text-white text-sm opacity-90">Learn without distractions</p>
                    </div>
                  </div>

                  {/* Office Hours feature */}
                  <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '3.0s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-1">Office Hours</h4>
                      <p className="text-white text-sm opacity-90">Get personalised support from course leaders</p>
                    </div>
                  </div>

                  {/* Weekly Handpicked Roles feature */}
                  <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '4.5s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-1">Weekly Handpicked Roles</h4>
                      <p className="text-white text-sm opacity-90">Every week, we'll send you our top career opportunities to your email.</p>
                    </div>
                  </div>

                  {/* Billing info */}
                  <p className="text-white text-sm mt-6" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '6.0s', opacity: 0, animationFillMode: 'forwards' }}>
                    Billed monthly. Cancel anytime.
                  </p>
                </div>
              </div>

              {/* Right side - Stripe checkout (scrollable) */}
              <div style={{ width: '54.4%', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="relative overflow-y-auto">
                <div
                  key={clientSecret}
                  ref={checkoutRef}
                  style={{
                    minHeight: '350px',
                    paddingTop: '10px',
                    paddingBottom: '10px'
                  }}
                >
                  {/* Stripe Checkout will be mounted here */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendly Modal */}
      {showCalendlyModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingCalendlyModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseCalendly}
        >
          <div className="relative w-full px-4" style={{ maxWidth: '900px' }}>
            {/* Title above the box */}
            <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>Office Hours</h2>

            {/* Calendly Card */}
            <div
              className="bg-white text-black relative"
              style={{
                animation: isClosingCalendlyModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
                padding: '0',
                height: '600px',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseCalendly}
                className="absolute top-4 right-4 text-gray-600 hover:text-black z-10"
              >
                <X size={24} />
              </button>

              {/* Calendly Widget */}
              <InlineWidget
                url={calendlyLink || "https://calendly.com/hello-ignite/30min"}
                styles={{
                  height: '100%',
                  minWidth: '100%'
                }}
                pageSettings={{
                  backgroundColor: 'ffffff',
                  hideEventTypeDetails: false,
                  hideLandingPageDetails: false,
                  primaryColor: 'ec4899',
                  textColor: '1f2937'
                }}
                prefill={{
                  email: authUser?.email || '',
                  firstName: user?.firstName || '',
                  lastName: user?.lastName || '',
                  name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : ''
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Admin/Teacher Navigation Box */}
      {(userRole === 'teacher' || userRole === 'admin') && (
        <div className="fixed bottom-8 right-8 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 group/menu hover:min-w-[240px] transition-all duration-300 overflow-hidden">
          {/* Compact View - Icon Only */}
          <div className="p-3 group-hover/menu:hidden flex items-center justify-center">
            <Settings size={24} className="text-pink-400" />
          </div>

          {/* Expanded View - On Hover */}
          <div className="hidden group-hover/menu:block p-4">
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {userRole === 'admin' ? 'Admin Tools' : 'Teacher Tools'}
              </div>

              {/* Curriculum Upload Link */}
              <button
                onClick={() => navigate('/admin/curriculum')}
                className="flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition group/item"
              >
                <FileEdit size={18} className="text-pink-400 group-hover/item:text-pink-300" />
                <span className="text-sm font-medium">Curriculum Upload</span>
              </button>

              {/* Analytics Dashboard Link - Only for Admins */}
              {userRole === 'admin' && (
                <button
                  onClick={() => navigate('/admin/analytics')}
                  className="flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition group/item"
                >
                  <svg
                    className="w-[18px] h-[18px] text-pink-400 group-hover/item:text-pink-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Analytics Dashboard</span>
                </button>
              )}

              {/* Design Test Link - Only for Admins */}
              {userRole === 'admin' && (
                <button
                  onClick={() => navigate('/auth-design')}
                  className="flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition group/item"
                >
                  <FileEdit size={18} className="text-pink-400 group-hover/item:text-pink-300" />
                  <span className="text-sm font-medium">Auth Design Test</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressHub;