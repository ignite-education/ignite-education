import { useMemo } from 'react';

const useCourseProgress = (groupedLessons, lessonsMetadata, completedLessons) => {
  const totalLessonsCount = useMemo(() => {
    let total = 0;
    Object.keys(groupedLessons).forEach(moduleKey => {
      const moduleData = groupedLessons[moduleKey];
      const lessonKeys = Object.keys(moduleData).filter(key => key.startsWith('lesson_'));
      total += lessonKeys.length;
    });
    return total;
  }, [groupedLessons]);

  const completedLessonsCount = useMemo(() => {
    return completedLessons.length;
  }, [completedLessons]);

  const progressPercentage = useMemo(() => {
    if (totalLessonsCount === 0) return 0;
    return Math.round((completedLessonsCount / totalLessonsCount) * 100);
  }, [completedLessonsCount, totalLessonsCount]);

  const hasLessonData = Object.keys(groupedLessons).length > 0;

  const upcomingLessons = useMemo(() => {
    if (!hasLessonData || lessonsMetadata.length === 0) return [];
    return [...lessonsMetadata].sort((a, b) => {
      if (a.module_number !== b.module_number) {
        return a.module_number - b.module_number;
      }
      return a.lesson_number - b.lesson_number;
    });
  }, [hasLessonData, lessonsMetadata]);

  const isLessonCompleted = (moduleNum, lessonNum) => {
    return completedLessons.some(
      (completion) => completion.module_number === moduleNum && completion.lesson_number === lessonNum
    );
  };

  return {
    totalLessonsCount,
    completedLessonsCount,
    progressPercentage,
    upcomingLessons,
    isLessonCompleted,
  };
};

export default useCourseProgress;
