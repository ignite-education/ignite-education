import React, { useState, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import useProgressData from './hooks/useProgressData';
import useCourseProgress from './hooks/useCourseProgress';
import useIsMobile from './hooks/useIsMobile';
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

const ProgressHubV2 = () => {
  const isMobile = useIsMobile();
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
  } = useCourseProgress(groupedLessons, lessonsMetadata, completedLessons);

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

  // Preload profile picture during loading screen so it's cached when content renders
  useEffect(() => {
    if (profilePicture) {
      const img = new Image();
      img.src = profilePicture.replace(/=s\d+-c/, '=s200-c');
    }
  }, [profilePicture]);

  const courseTitle = courseData?.title || courseData?.name || 'Product Manager';

  return (
    <div className={`min-h-screen bg-black text-white ${contentClassName}`} style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif', ...(isMobile && { overflowX: 'hidden' }) }}>
      {showLoading && (
        <>
          <div className={`fixed inset-0 z-40 bg-white ${loadingClassName}`} />
          <div className={`fixed inset-0 z-50 ${loadingClassName}`}>
            <LoadingScreen autoRefresh={true} autoRefreshDelay={30000} />
          </div>
        </>
      )}
      {showContent && (<>
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
        graph={<ProgressGraph userName={firstName} courseData={courseData} userLessonScores={userLessonScores} globalLessonScores={globalLessonScores} completedLessons={completedLessons} />}
        lessonSlider={
          <LessonSlider
            upcomingLessons={upcomingLessons}
            completedLessons={completedLessons}
            isLessonCompleted={isLessonCompleted}
          />
        }
        left={
          <>
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
      </>)}
    </div>
  );
};

export default ProgressHubV2;
