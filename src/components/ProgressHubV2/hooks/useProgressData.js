import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getLessonsByModule, getLessonsMetadata, getCompletedLessons, getCoachesForCourse, getUserCertificates, getRedditPosts, getBlockedRedditPosts, getLessonScores, getGlobalLessonScores } from '../../../lib/api';

const extractSubredditFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/reddit\.com\/r\/([^\/]+)/);
  return match ? `r/${match[1]}` : null;
};

const useProgressData = () => {
  const { user: authUser, firstName, isInitialized, isAdFree, profilePicture, hasHighQualityAvatar, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState(null);
  const [groupedLessons, setGroupedLessons] = useState({});
  const [lessonsMetadata, setLessonsMetadata] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [totalCompletedLessons, setTotalCompletedLessons] = useState(0);
  const [coaches, setCoaches] = useState([]);
  const [calendlyLink, setCalendlyLink] = useState('');
  const [userCertificate, setUserCertificate] = useState(null);
  const [courseReddit, setCourseReddit] = useState({
    channel: 'r/ProductManagement',
    url: 'https://www.reddit.com/r/ProductManagement/',
    readUrl: 'https://www.reddit.com/r/ProductManagement/',
    postUrl: 'https://www.reddit.com/r/ProductManagement/',
    readChannel: 'r/ProductManagement',
    postChannel: 'r/ProductManagement',
  });
  const [communityPosts, setCommunityPosts] = useState([]);
  const [userLessonScores, setUserLessonScores] = useState({});
  const [globalLessonScores, setGlobalLessonScores] = useState({});
  const [userRole, setUserRole] = useState('student');
  const hasInitialDataFetchRef = useRef(false);
  const courseDataResultRef = useRef(null);

  const fetchRedditPosts = useCallback(async (courseDataForFetch, isMounted = true) => {
    const data = courseDataForFetch || courseDataResultRef.current;
    if (!data) return;
    try {
      const subreddit = (data.reddit_url || '')
        .replace(/\/$/, '')
        .split('/r/')[1] || (data.reddit_channel || 'r/ProductManagement').replace(/^r\//, '');
      const redditData = await getRedditPosts(25, false, subreddit);
      let blockedPostIds = [];
      try {
        blockedPostIds = await getBlockedRedditPosts();
      } catch {
        blockedPostIds = [];
      }
      const avatarColors = ['bg-purple-600', 'bg-yellow-500', 'bg-teal-500'];
      const posts = (Array.isArray(redditData) ? redditData : [])
        .filter(post => !blockedPostIds.includes(post.id))
        .map((post, index) => ({
        id: `reddit-${post.id}`,
        redditId: post.id,
        author: post.author,
        author_icon: post.author_icon,
        created_at: post.created_at,
        title: post.title,
        content: post.content,
        tag: post.tag,
        upvotes: post.upvotes,
        comments: post.comments,
        avatar: avatarColors[index % avatarColors.length],
        url: post.url,
        source: 'reddit',
      }));
      if (isMounted) setCommunityPosts(posts);
    } catch {
      if (isMounted) setCommunityPosts([]);
    }
  }, []);

  const refetchCommunityPosts = useCallback(() => {
    return fetchRedditPosts(null, true);
  }, [fetchRedditPosts]);

  useEffect(() => {
    if (!isInitialized) return;

    let isMounted = true;

    const fetchData = async () => {
      const userId = authUser?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch enrolled course
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('enrolled_course, role')
          .eq('id', userId)
          .single();

        if (userError || !userData?.enrolled_course) {
          window.location.href = '/courses';
          return;
        }

        if (isMounted) setUserRole(userData.role || 'student');
        const courseId = userData.enrolled_course;

        // Fetch course details
        const { data: courseDataResult } = await supabase
          .from('courses')
          .select('*')
          .eq('name', courseId)
          .single();

        if (!isMounted) return;

        if (courseDataResult) {
          setCourseData(courseDataResult);
          setCalendlyLink(courseDataResult.calendly_link || '');
          courseDataResultRef.current = courseDataResult;

          // Set reddit info for community forum
          const readUrl = courseDataResult.reddit_read_url || courseDataResult.reddit_url || 'https://www.reddit.com/r/ProductManagement/';
          const postUrl = courseDataResult.reddit_post_url || courseDataResult.reddit_url || 'https://www.reddit.com/r/ProductManagement/';
          const readChannel = extractSubredditFromUrl(readUrl) || courseDataResult.reddit_channel || 'r/ProductManagement';
          const postChannel = extractSubredditFromUrl(postUrl) || courseDataResult.reddit_channel || 'r/ProductManagement';

          setCourseReddit({
            channel: courseDataResult.reddit_channel || 'r/ProductManagement',
            url: courseDataResult.reddit_url || 'https://www.reddit.com/r/ProductManagement/',
            readUrl,
            postUrl,
            readChannel,
            postChannel,
          });
        }

        // Fetch Reddit posts for community forum
        await fetchRedditPosts(courseDataResult, isMounted);

        // Fetch coaches
        try {
          const coachesData = await getCoachesForCourse(courseId);
          if (isMounted) setCoaches(coachesData || []);
        } catch {
          if (isMounted) setCoaches([]);
        }

        // Fetch lessons grouped by module
        try {
          const lessonsData = await getLessonsByModule(courseId);
          if (isMounted) setGroupedLessons(lessonsData);
        } catch {
          if (isMounted) setGroupedLessons({});
        }

        // Fetch lessons metadata
        try {
          const metadataData = await getLessonsMetadata(courseId);
          if (isMounted) setLessonsMetadata(metadataData);
        } catch {
          if (isMounted) setLessonsMetadata([]);
        }

        // Fetch completed lessons
        try {
          const completedLessonsData = await getCompletedLessons(userId, courseId);
          if (isMounted) setCompletedLessons(completedLessonsData);
        } catch {
          if (isMounted) setCompletedLessons([]);
        }

        // Fetch total completed lessons for enrolled course
        try {
          const { count, error: countError } = await supabase
            .from('lesson_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('course_id', courseId);

          if (!countError && isMounted) {
            setTotalCompletedLessons(count || 0);
          }
        } catch {
          // Not critical
        }

        // Check for certificate
        try {
          const certificates = await getUserCertificates(userId);
          const courseCertificate = certificates.find(cert => cert.course_id === courseId);
          if (isMounted && courseCertificate) {
            setUserCertificate(courseCertificate);
          }
        } catch {
          // Certificate not critical
        }

        // Fetch lesson scores (user + global)
        try {
          const [userScores, globalScores] = await Promise.all([
            getLessonScores(userId, courseId),
            getGlobalLessonScores(courseId),
          ]);
          if (isMounted) {
            setUserLessonScores(userScores);
            setGlobalLessonScores(globalScores);
          }
        } catch {
          // Scores not critical — graph will render without data
        }

        if (isMounted) {
          hasInitialDataFetchRef.current = true;
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching progress data:', error);
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isInitialized, authUser?.id]);

  return {
    loading,
    firstName,
    authUser,
    isAdFree,
    profilePicture,
    hasHighQualityAvatar,
    signOut,
    courseData,
    groupedLessons,
    lessonsMetadata,
    completedLessons,
    totalCompletedLessons,
    coaches,
    calendlyLink,
    userCertificate,
    courseReddit,
    communityPosts,
    refetchCommunityPosts,
    userLessonScores,
    globalLessonScores,
    userRole,
  };
};

export default useProgressData;
