import { useState, useEffect, useCallback } from 'react';
import { getLessonsByModule, getLessonsMetadata, getCompletedLessons } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export default function useLessonData() {
  const { user, isInitialized } = useAuth();

  const [loading, setLoading] = useState(true);
  const [groupedLessons, setGroupedLessons] = useState({});
  const [lessonsMetadata, setLessonsMetadata] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [userCourseId, setUserCourseId] = useState('product-manager');
  const [userCourseName, setUserCourseName] = useState('Product Management');

  const getUserCourseId = useCallback(async () => {
    if (!user?.id) return 'product-manager';

    const { data: userData, error } = await supabase
      .from('users')
      .select('enrolled_course')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('getUserCourseId error:', error.message);
      return 'product-manager';
    }

    return userData?.enrolled_course || 'product-manager';
  }, [user?.id]);

  const fetchLessonData = useCallback(async () => {
    try {
      const userId = user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const courseId = await getUserCourseId();
      setUserCourseId(courseId);

      // Fetch course title
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, name')
        .eq('name', courseId)
        .single();

      setUserCourseName(courseData?.title || courseId);

      // Fetch lessons, metadata, and completions in parallel
      const [lessonsData, metadataData, completedLessonsData] = await Promise.all([
        getLessonsByModule(courseId),
        getLessonsMetadata(courseId),
        getCompletedLessons(userId, courseId).catch(() => []),
      ]);

      setGroupedLessons(lessonsData);
      setLessonsMetadata(metadataData);
      setCompletedLessons(completedLessonsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lesson data:', error);
      setLoading(false);
    }
  }, [user?.id, getUserCourseId]);

  useEffect(() => {
    if (!isInitialized) return;
    fetchLessonData();
  }, [isInitialized, fetchLessonData]);

  const refetchCompletedLessons = useCallback(async () => {
    if (!user?.id) return;
    const courseId = await getUserCourseId();
    const data = await getCompletedLessons(user.id, courseId).catch(() => []);
    setCompletedLessons(data);
  }, [user?.id, getUserCourseId]);

  return {
    loading,
    groupedLessons,
    lessonsMetadata,
    completedLessons,
    userCourseId,
    userCourseName,
    getUserCourseId,
    refetchCompletedLessons,
  };
}
