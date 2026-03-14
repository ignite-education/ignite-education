import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function useLessonNavigation({ groupedLessons, lessonsMetadata, completedLessons }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentModule, setCurrentModule] = useState(parseInt(searchParams.get('module')) || 1);
  const [currentLesson, setCurrentLesson] = useState(parseInt(searchParams.get('lesson')) || 1);

  // Sync URL params when module/lesson changes
  useEffect(() => {
    const urlModule = parseInt(searchParams.get('module')) || 1;
    const urlLesson = parseInt(searchParams.get('lesson')) || 1;
    if (urlModule !== currentModule || urlLesson !== currentLesson) {
      setSearchParams({ module: currentModule.toString(), lesson: currentLesson.toString() });
    }
  }, [currentModule, currentLesson]);

  const currentLessonSections = useMemo(() => {
    const moduleKey = `module_${currentModule}`;
    const lessonKey = `lesson_${currentLesson}`;
    return groupedLessons[moduleKey]?.[lessonKey] || [];
  }, [groupedLessons, currentModule, currentLesson]);

  const lessonName = useMemo(() => {
    const fromMetadata = lessonsMetadata.find(
      m => m.module_number === currentModule && m.lesson_number === currentLesson
    )?.lesson_name;
    return fromMetadata || currentLessonSections.lessonName || `Lesson ${currentLesson}`;
  }, [lessonsMetadata, currentModule, currentLesson, currentLessonSections]);

  // Calculate global lesson number (across all modules)
  const globalLessonNumber = useMemo(() => {
    const allLessons = [...lessonsMetadata].sort((a, b) => {
      if (a.module_number !== b.module_number) return a.module_number - b.module_number;
      return a.lesson_number - b.lesson_number;
    });
    const index = allLessons.findIndex(
      l => l.module_number === currentModule && l.lesson_number === currentLesson
    );
    return index !== -1 ? index + 1 : currentLesson;
  }, [lessonsMetadata, currentModule, currentLesson]);

  const isLessonCompleted = useMemo(() => {
    return completedLessons.some(
      c => c.module_number === currentModule && c.lesson_number === currentLesson
    );
  }, [completedLessons, currentModule, currentLesson]);

  const goToNextLesson = useCallback(() => {
    const allLessons = [...lessonsMetadata].sort((a, b) => {
      if (a.module_number !== b.module_number) return a.module_number - b.module_number;
      return a.lesson_number - b.lesson_number;
    });
    const currentIndex = allLessons.findIndex(
      l => l.module_number === currentModule && l.lesson_number === currentLesson
    );

    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      const next = allLessons[currentIndex + 1];
      setCurrentModule(next.module_number);
      setCurrentLesson(next.lesson_number);
    } else {
      navigate('/');
    }
  }, [lessonsMetadata, currentModule, currentLesson, navigate]);

  const goToLesson = useCallback((module, lesson) => {
    setCurrentModule(module);
    setCurrentLesson(lesson);
  }, []);

  return {
    currentModule,
    currentLesson,
    currentLessonSections,
    lessonName,
    globalLessonNumber,
    isLessonCompleted,
    goToNextLesson,
    goToLesson,
  };
}
