import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getLessonsByModule, getLessonsMetadata, getCompletedLessons, getCoachesForCourse, getUserCertificates } from '../../../lib/api';

const useProgressData = () => {
  const { user: authUser, firstName, isInitialized, isAdFree, profilePicture, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState(null);
  const [groupedLessons, setGroupedLessons] = useState({});
  const [lessonsMetadata, setLessonsMetadata] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [calendlyLink, setCalendlyLink] = useState('');
  const [userCertificate, setUserCertificate] = useState(null);
  const [courseReddit, setCourseReddit] = useState({
    channel: 'r/ProductManagement',
    url: 'https://www.reddit.com/r/ProductManagement/',
  });
  const hasInitialDataFetchRef = useRef(false);

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
          .select('enrolled_course')
          .eq('id', userId)
          .single();

        if (userError || !userData?.enrolled_course) {
          window.location.href = '/courses';
          return;
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

          // Set reddit info for community forum
          setCourseReddit({
            channel: courseDataResult.reddit_channel || 'r/ProductManagement',
            url: courseDataResult.reddit_url || 'https://www.reddit.com/r/ProductManagement/',
          });
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
        try {
          const completedLessonsData = await getCompletedLessons(userId, courseId);
          if (isMounted) setCompletedLessons(completedLessonsData);
        } catch {
          if (isMounted) setCompletedLessons([]);
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
    signOut,
    courseData,
    groupedLessons,
    lessonsMetadata,
    completedLessons,
    coaches,
    calendlyLink,
    userCertificate,
    courseReddit,
  };
};

export default useProgressData;
