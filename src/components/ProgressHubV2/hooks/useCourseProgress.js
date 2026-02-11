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

  // Calculate current module and lesson
  const { currentModule, currentLesson } = useMemo(() => {
    if (completedLessons.length === 0) {
      return { currentModule: 1, currentLesson: 1 };
    }

    const lastCompleted = completedLessons.reduce((max, lesson) => {
      const lessonIndex = (lesson.module_number - 1) * 10 + lesson.lesson_number;
      const maxIndex = (max.module_number - 1) * 10 + max.lesson_number;
      return lessonIndex > maxIndex ? lesson : max;
    }, completedLessons[0]);

    return {
      currentModule: lastCompleted.module_number,
      currentLesson: lastCompleted.lesson_number + 1,
    };
  }, [completedLessons]);

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

  const isLessonAccessible = (moduleNum, lessonNum) => {
    if (moduleNum === currentModule && lessonNum === currentLesson) return true;
    if (moduleNum < currentModule) return true;
    if (moduleNum === currentModule && lessonNum < currentLesson) return true;

    // Check if previous lesson is completed
    let prevModuleNum = moduleNum;
    let prevLessonNum = lessonNum - 1;

    const moduleKey = `module_${prevModuleNum}`;
    const prevLessonKey = `lesson_${prevLessonNum}`;

    if (prevLessonNum < 1 || !groupedLessons[moduleKey]?.[prevLessonKey]) {
      prevModuleNum = moduleNum - 1;
      if (prevModuleNum < 1) return true;

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

    return isLessonCompleted(prevModuleNum, prevLessonNum);
  };

  return {
    totalLessonsCount,
    completedLessonsCount,
    progressPercentage,
    upcomingLessons,
    isLessonCompleted,
    isLessonAccessible,
    currentModule,
    currentLesson,
  };
};

export default useCourseProgress;
