import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getLessonsByModule, getLessonsMetadata, getCompletedLessons, getCoachesForCourse, getUserCertificates, getRedditPosts, getBlockedRedditPosts, getLessonScores, getGlobalLessonScores, getCommunityLearnerCount, getRecentSignIns, getUserAchievementPercentile } from '../../../lib/api';
import { trackPageVisit } from '../../../lib/tracking';
import { COUNTRY_CONFIG, DEFAULT_COMMUNITY } from '../../../lib/countries';

const PRELOAD_IMAGES = ['/trophy.png', '/moon.png'];
const DEFAULT_STAT_IMAGES = ['/behaviour-calendar.png', '/achievement-start.png'];

const preloadImages = (urls) =>
  Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        })
    )
  );

const extractSubredditFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/reddit\.com\/r\/([^\/]+)/);
  return match ? `r/${match[1]}` : null;
};

const useProgressData = () => {
  const { user: authUser, firstName, isInitialized, isInsider, profilePicture, hasHighQualityAvatar, signOut } = useAuth();
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
  const [resources, setResources] = useState([]);
  const [userRole, setUserRole] = useState('student');
  const [userCountry, setUserCountry] = useState(null);
  const [communityCount, setCommunityCount] = useState(null);
  const [behaviourStat, setBehaviourStat] = useState(null);
  const [achievementStat, setAchievementStat] = useState(null);
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
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

      // Fire-and-forget: track this page visit with geo data
      trackPageVisit(userId, 'progress');

      // imagePromise will be replaced by stat-aware preload before setLoading(false)

      try {
        // Fetch enrolled course
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('enrolled_course, role, country')
          .eq('id', userId)
          .single();

        if (userError || !userData?.enrolled_course) {
          window.location.href = '/courses';
          return;
        }

        if (isMounted) {
          setUserRole(userData.role || 'student');
          setUserCountry(userData.country || null);
        }
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

        // Fetch course resources
        try {
          const { data: resourcesData, error: resourcesError } = await supabase
            .from('course_resources')
            .select('id, title, description, url, display_order')
            .eq('course_id', courseId)
            .order('display_order', { ascending: true });
          if (!resourcesError && isMounted) setResources(resourcesData || []);
        } catch {
          if (isMounted) setResources([]);
        }

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
        let completedLessonsData = [];
        try {
          completedLessonsData = await getCompletedLessons(userId, courseId);
          if (isMounted) setCompletedLessons(completedLessonsData);
        } catch {
          if (isMounted) setCompletedLessons([]);
        }

        // Fetch total completed lessons for enrolled course
        let completedCount = 0;
        try {
          const { count, error: countError } = await supabase
            .from('lesson_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('course_id', courseId);

          if (!countError) {
            completedCount = count || 0;
            if (isMounted) setTotalCompletedLessons(completedCount);
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
        let userScoresResult = {};
        try {
          const [userScores, globalScores] = await Promise.all([
            getLessonScores(userId, courseId),
            getGlobalLessonScores(courseId),
          ]);
          userScoresResult = userScores || {};
          if (isMounted) {
            setUserLessonScores(userScores);
            setGlobalLessonScores(globalScores);
          }
        } catch {
          // Scores not critical — graph will render without data
        }

        // Fetch community learner count (pre-computed daily in community_stats table)
        try {
          const count = await getCommunityLearnerCount(userData.country || null);
          if (isMounted) setCommunityCount(count);
        } catch {
          // Community count not critical
        }

        // Compute behaviour stat
        let behaviourStatValue = null;
        try {
          if (completedCount === 0) {
            // Welcome message with join month
            const joinDate = new Date(authUser.created_at);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthYear = `${monthNames[joinDate.getMonth()]}-${String(joinDate.getFullYear()).slice(2)}`;
            behaviourStatValue = { label: 'Welcome to', value: `class of ${monthYear}`, image: '/behaviour-calendar.png' };
          } else {
            const signIns = await getRecentSignIns(userId);
            if (signIns.length > 0) {
              // Compute mode of time-of-day buckets
              const getTimeBucket = (dateStr) => {
                const hour = new Date(dateStr).getHours();
                if (hour >= 5 && hour < 12) return 'morning';
                if (hour >= 12 && hour < 18) return 'afternoon';
                return 'evening';
              };
              const buckets = signIns.map(s => getTimeBucket(s.signed_in_at));
              const bucketCounts = {};
              buckets.forEach(b => { bucketCounts[b] = (bucketCounts[b] || 0) + 1; });
              const topBucket = Object.entries(bucketCounts).sort((a, b) => b[1] - a[1])[0][0];

              // Compute mode of day-of-week
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayCounts = {};
              signIns.forEach(s => {
                const day = days[new Date(s.signed_in_at).getDay()];
                dayCounts[day] = (dayCounts[day] || 0) + 1;
              });
              const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0];

              const timeConfig = {
                morning: { label: "You're an early", value: 'morning learner', image: '/behaviour-morning.png' },
                afternoon: { label: "You're an", value: 'afternoon learner', image: '/behaviour-afternoon.png' },
                evening: { label: "You're an", value: 'evening learner', image: 'https://auth.ignite.education/storage/v1/object/public/assets/Progress%20Hub%20Icons/Evening.png' },
              };

              const dayImageBase = 'https://auth.ignite.education/storage/v1/object/public/assets/Progress%20Hub%20Icons';
              const dayImages = {
                Sunday: `${dayImageBase}/Sunday.png`,
                Monday: `${dayImageBase}/Monday.png`,
                Tuesday: `${dayImageBase}/Tuesday.png`,
                Wednesday: `${dayImageBase}/Wednesday.png`,
                Thursday: `${dayImageBase}/Thursday.png`,
                Friday: `${dayImageBase}/Friday.png`,
                Saturday: `${dayImageBase}/Saturday.png`,
              };

              // Random per session: time-of-day or day-of-week
              if (Math.random() < 0.5) {
                behaviourStatValue = timeConfig[topBucket];
              } else {
                behaviourStatValue = { label: 'Most active', value: `on ${topDay}s`, image: dayImages[topDay] };
              }
            } else {
              // No sign-in history yet — show welcome fallback
              const joinDate = new Date(authUser.created_at);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthYear = `${monthNames[joinDate.getMonth()]}-${String(joinDate.getFullYear()).slice(2)}`;
              behaviourStatValue = { label: 'Welcome to', value: `class of ${monthYear}`, image: '/behaviour-calendar.png' };
            }
          }
          if (isMounted) setBehaviourStat(behaviourStatValue);
        } catch {
          // Behaviour stat not critical
        }

        // Compute achievement stat
        let achievementStatValue = null;
        try {
          if (completedCount === 0) {
            achievementStatValue = { label: 'Start your', value: 'first lesson', image: '/achievement-start.png' };
          } else {
            const candidates = [];

            const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            // Streak: consecutive days with completions
            const completionDates = completedLessonsData
              .map(c => c.completed_at).filter(Boolean)
              .map(d => formatDateStr(new Date(d)));
            const uniqueDays = [...new Set(completionDates)].sort().reverse();
            if (uniqueDays.length >= 2) {
              const today = new Date();
              const todayStr = formatDateStr(today);
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = formatDateStr(yesterday);

              let startDate;
              if (uniqueDays.includes(todayStr)) {
                startDate = new Date(today);
              } else if (uniqueDays.includes(yesterdayStr)) {
                startDate = new Date(yesterday);
              } else {
                startDate = null;
              }

              if (startDate) {
                let streak = 1;
                const daySet = new Set(uniqueDays);
                const check = new Date(startDate);
                while (true) {
                  check.setDate(check.getDate() - 1);
                  if (daySet.has(formatDateStr(check))) {
                    streak++;
                  } else {
                    break;
                  }
                }
                if (streak >= 2) {
                  candidates.push({ label: "You're on a", value: `${streak} day streak`, image: '/achievement-streak.png' });
                }
              }
            }

            // Aced: lessons with 100% score
            const scoredLessons = Object.values(userScoresResult);
            const acedCount = scoredLessons.filter(s => s.total > 0 && s.correct === s.total).length;
            if (acedCount >= 1) {
              candidates.push({ label: `${acedCount} lessons with`, value: '100% score', image: '/achievement-aced.png' });
            }

            // Weekly: completions since Monday 00:00 (ISO week)
            const now = new Date();
            const dow = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
            monday.setHours(0, 0, 0, 0);
            const weekCount = completedLessonsData.filter(c => c.completed_at && new Date(c.completed_at) >= monday).length;
            if (weekCount >= 1) {
              candidates.push({ label: `${weekCount} lesson${weekCount !== 1 ? 's' : ''} completed`, value: 'this week', image: '/achievement-weekly.png' });
            }

            // Percentile: from pre-computed table
            const percentile = await getUserAchievementPercentile(userId, courseId);
            if (percentile != null && percentile <= 40) {
              candidates.push({ label: "You're in the top", value: `${percentile}% of learners`, image: '/achievement-top.png' });
            }

            // Random pick or fallback
            if (candidates.length > 0) {
              achievementStatValue = candidates[Math.floor(Math.random() * candidates.length)];
            } else {
              achievementStatValue = { label: `${completedCount} lessons`, value: 'completed', image: '/achievement-start.png' };
            }
          }
          if (isMounted) setAchievementStat(achievementStatValue);
        } catch {
          // Achievement stat not critical
        }

        // Preload stat images so they're visible immediately when loading finishes
        const communityImage = (COUNTRY_CONFIG[userData.country] || DEFAULT_COMMUNITY).image;
        const statImages = [
          behaviourStatValue?.image,
          achievementStatValue?.image,
          communityImage,
        ].filter(Boolean);
        const allImages = [...new Set([...PRELOAD_IMAGES, ...statImages])];
        await preloadImages(allImages);

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
    isInsider,
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
    resources,
    userRole,
    userCountry,
    communityCount,
    behaviourStat,
    achievementStat,
  };
};

export default useProgressData;
