import React, { useState, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import useProgressData from './hooks/useProgressData';
import useCourseProgress from './hooks/useCourseProgress';
import LoadingScreen from '../LoadingScreen';
import useFadeTransition from '../../hooks/useFadeTransition';
import Footer from '../Footer';
import IntroSection from './sections/IntroSection';
import CourseDetailsSection from './sections/CourseDetailsSection';
import ProgressGraph from './sections/ProgressGraph';
import LessonSlider from './sections/LessonSlider';
import OfficeHoursCard from './sections/OfficeHoursCard';
import ResourcesSlider from './sections/ResourcesSlider';
import CommunityForumCard from './sections/CommunityForumCard';
import CreatePostModal from './sections/CreatePostModal';
import MyPostsModal from './sections/MyPostsModal';
import MerchandiseSection from './sections/MerchandiseSection';
import BlogSection from './sections/BlogSection';
import SettingsModal from '../shared/SettingsModal';
import SEO from '../SEO';
import { blockRedditPost } from '../../lib/api';

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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 950);
  const [showSettings, setShowSettings] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showMyPostsModal, setShowMyPostsModal] = useState(false);

  const { refreshSession } = useAuth();

  const {
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
    const handleResize = () => setIsMobile(window.innerWidth < 950);
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


  // Refresh user session after successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pendingRefresh = localStorage.getItem('pendingPaymentRefresh');

    const hasPaymentSuccess = params.get('payment') === 'success';
    const hasSessionId = params.get('session_id');
    const hasPendingRefresh = pendingRefresh && (Date.now() - parseInt(pendingRefresh)) < 5 * 60 * 1000;

    if (hasPaymentSuccess || hasSessionId || hasPendingRefresh) {
      localStorage.removeItem('pendingPaymentRefresh');
      window.history.replaceState({}, '', window.location.pathname);

      // Poll for updated insider status (webhook may still be processing)
      const refreshInsiderStatus = async () => {
        for (let i = 0; i < 5; i++) {
          await refreshSession();
          // Re-check after refresh — if insider status updated, stop polling
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.user_metadata?.is_ad_free) break;
          await new Promise(r => setTimeout(r, 2000));
        }
      };
      refreshInsiderStatus();
    }
  }, []);

  // Clean up hash fragments
  useLayoutEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const { showLoading, showContent, loadingClassName, contentClassName } = useFadeTransition(loading);

  if (!showContent) {
    return <LoadingScreen autoRefresh={true} autoRefreshDelay={30000} />;
  }

  if (isMobile) {
    return <MobileBlockScreen onSignOut={signOut} />;
  }

  const courseTitle = courseData?.title || courseData?.name || 'Product Manager';

  return (
    <div className={`min-h-screen bg-black text-white ${contentClassName}`} style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {showLoading && (
        <div className={`fixed inset-0 z-50 ${loadingClassName}`}>
          <LoadingScreen autoRefresh={true} autoRefreshDelay={30000} />
        </div>
      )}
      <SEO title={firstName ? `${firstName}'s Progress | Ignite` : 'Your Progress | Ignite'} />
      {/* Section 1: Introduction */}
      <IntroSection
        firstName={firstName}
        profilePicture={profilePicture}
        hasHighQualityAvatar={hasHighQualityAvatar}
        progressPercentage={progressPercentage}
        courseTitle={courseTitle}
        joinedAt={authUser?.created_at}
        totalCompletedLessons={totalCompletedLessons}
        isInsider={isInsider}
        userId={authUser?.id}
        onSettingsClick={() => setShowSettings(true)}
        completedLessons={completedLessons}
        lessonsMetadata={lessonsMetadata}
        userLessonScores={userLessonScores}
        upcomingLessons={upcomingLessons}
        userRole={userRole}
        userCountry={userCountry}
        communityCount={communityCount}
        behaviourStat={behaviourStat}
        achievementStat={achievementStat}
      />

      {/* Section 2: Course Details */}
      <CourseDetailsSection
        courseTitle={courseTitle}
        graph={<ProgressGraph userName={firstName} courseData={courseData} userLessonScores={userLessonScores} globalLessonScores={globalLessonScores} />}
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
            <OfficeHoursCard coaches={coaches} courseId={courseData?.name} />
            <ResourcesSlider resources={resources} />
          </>
        }
        right={<CommunityForumCard courseName={courseTitle} courseReddit={courseReddit} posts={communityPosts} onCreatePost={() => setShowPostModal(true)} onMyPosts={localStorage.getItem('hasPostedToReddit') ? () => setShowMyPostsModal(true) : undefined} userRole={userRole} userId={authUser?.id} onBlockPost={async (postId) => { try { await blockRedditPost(postId, authUser?.id); await refetchCommunityPosts(); } catch {} }} />}
      />

      {/* Section 3: Merchandise */}
      <MerchandiseSection />

      {/* Section 4: Blog */}
      <BlogSection />

      {/* Section 5: Footer */}
      <Footer />

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} progressPercentage={progressPercentage} courseData={courseData} />

      <CreatePostModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        courseReddit={courseReddit}
        courseName={courseTitle}
        onPostCreated={refetchCommunityPosts}
      />

      <MyPostsModal
        isOpen={showMyPostsModal}
        onClose={() => setShowMyPostsModal(false)}
      />
    </div>
  );
};

export default ProgressHubV2;
