import React, { useState, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useProgressData from './hooks/useProgressData';
import useCourseProgress from './hooks/useCourseProgress';
import LoadingScreen from '../LoadingScreen';
import Footer from '../Footer';
import IntroSection from './sections/IntroSection';
import CourseDetailsSection from './sections/CourseDetailsSection';
import ProgressGraph from './sections/ProgressGraph';
import LessonSlider from './sections/LessonSlider';
import OfficeHoursCard from './sections/OfficeHoursCard';
import CommunityForumCard from './sections/CommunityForumCard';
import MerchandiseSection from './sections/MerchandiseSection';
import BlogSection from './sections/BlogSection';

// Mobile Block Screen
const MobileBlockScreen = ({ onSignOut }) => {
  const handleGoBack = async () => {
    await onSignOut();
    window.location.href = 'https://ignite.education';
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-black text-white px-8 relative">
      <div
        className="absolute top-6 left-8"
        style={{
          backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          width: '120px',
          height: '40px'
        }}
      />
      <p className="font-semibold" style={{ fontSize: '2.5rem', lineHeight: '1.2', color: '#EF0B72' }}>
        Learning looks<br />better on a laptop.
      </p>
      <p className="mt-4" style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>
        We're building the mobile version of Ignite. In the meantime, please re-visit us on a tablet or computer.
      </p>
      <button
        onClick={handleGoBack}
        className="mt-6 px-6 py-3 bg-white text-black font-semibold rounded-lg text-center"
        style={{ width: 'fit-content' }}
      >
        Go back
      </button>
    </div>
  );
};

const ProgressHubV2 = () => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const {
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
  } = useProgressData();

  const {
    progressPercentage,
    upcomingLessons,
    isLessonCompleted,
    isLessonAccessible,
    currentModule,
    currentLesson,
  } = useCourseProgress(groupedLessons, lessonsMetadata, completedLessons);

  // Track viewport size for mobile blocking
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set Safari theme color to black
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const originalColor = metaThemeColor?.getAttribute('content') || '#EF0B72';
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#000000');
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
    return () => {
      if (metaThemeColor) metaThemeColor.setAttribute('content', originalColor);
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

  // Clean up hash fragments
  useLayoutEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  if (loading) {
    return <LoadingScreen autoRefresh={true} autoRefreshDelay={30000} />;
  }

  if (isMobile) {
    return <MobileBlockScreen onSignOut={signOut} />;
  }

  const courseTitle = courseData?.title || courseData?.name || 'Product Manager';

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Section 1: Introduction */}
      <IntroSection
        firstName={firstName}
        profilePicture={profilePicture}
        progressPercentage={progressPercentage}
        courseTitle={courseTitle}
        joinedAt={authUser?.created_at}
      />

      {/* Section 2: Course Details */}
      <CourseDetailsSection
        courseTitle={courseTitle}
        graph={<ProgressGraph userName={firstName} />}
        left={
          <>
            <LessonSlider
              upcomingLessons={upcomingLessons}
              completedLessons={completedLessons}
              isLessonCompleted={isLessonCompleted}
              isLessonAccessible={isLessonAccessible}
              currentModule={currentModule}
              currentLesson={currentLesson}
            />
            <OfficeHoursCard coaches={coaches} calendlyLink={calendlyLink} />
          </>
        }
        right={<CommunityForumCard courseName={courseTitle} courseReddit={courseReddit} />}
      />

      {/* Section 3: Merchandise */}
      <MerchandiseSection />

      {/* Section 4: Blog */}
      <BlogSection />

      {/* Section 5: Footer */}
      <Footer />
    </div>
  );
};

export default ProgressHubV2;
