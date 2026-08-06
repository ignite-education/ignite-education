import React, { useState, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import useProgressData from './hooks/useProgressData';
import useCourseProgress from './hooks/useCourseProgress';
import useIsMobile from './hooks/useIsMobile';
import useEnrollmentWatch from './hooks/useEnrollmentWatch';
import useFadeTransition from '../../hooks/useFadeTransition';
import Footer from '../Footer';
import IntroSection from './sections/IntroSection';
import CourseDetailsSection from './sections/CourseDetailsSection';
import CourseSelectorSection from './sections/CourseSelectorSection';
import SeamSticker from './SeamSticker';
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
    hasCourse,
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
    communityPostsError,
    refetchCommunityPosts,
    userLessonScores,
    globalLessonScores,
    resources,
    userRole,
    userCountry,
    username,
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

      // Poll for updated insider status (webhook may still be processing).
      // Reads is_ad_free directly on purpose: this waits specifically for the
      // Stripe webhook to land in the JWT. Referral/comp grants live in
      // insider_grants and need no polling — AuthContext re-queries them on
      // every auth change.
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

  const { showContent } = useFadeTransition(loading, { autoRefreshAfter: 30000 });

  // Preload profile picture during loading screen so it's cached when content renders
  useEffect(() => {
    if (profilePicture) {
      const img = new Image();
      img.src = profilePicture.replace(/=s\d+-c/, '=s200-c');
    }
  }, [profilePicture]);

  // While the tab is open with no course, watch for the user enrolling in the
  // new tab the selector opened, and reload into the real hub when they return.
  useEnrollmentWatch(!loading && !hasCourse, authUser?.id);

  // The 'Product Manager' fallback covers an enrolled course whose row failed to
  // load — it must not stand in for having no course at all.
  const courseTitle = hasCourse ? (courseData?.title || courseData?.name || 'Product Manager') : null;

  // Lesson slider — rendered in the white IntroSection on mobile, in the black CourseDetailsSection on desktop
  const lessonSlider = hasCourse ? (
    <LessonSlider
      upcomingLessons={upcomingLessons}
      completedLessons={completedLessons}
      isLessonCompleted={isLessonCompleted}
    />
  ) : null;

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif', ...(isMobile && { overflowX: 'hidden' }) }}>
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
        courseId={courseData?.name}
        onSettingsClick={() => setShowSettings(true)}
        completedLessons={completedLessons}
        lessonsMetadata={lessonsMetadata}
        userLessonScores={userLessonScores}
        upcomingLessons={upcomingLessons}
        userRole={userRole}
        userCountry={userCountry}
        username={username}
        communityCount={communityCount}
        behaviourStat={behaviourStat}
        achievementStat={achievementStat}
        lessonSlider={lessonSlider}
        hasCourse={hasCourse}
      />

      {/* Sticker straddling the seam between sections 1 and 2. Self-positioning
          and zero-height, so neither section's layout changes. */}
      <SeamSticker />

      {/* Section 2: Course Details — or, with no course yet, the course selector
          in its place. Both own id="course-details", so the intro copy's anchor
          lands correctly either way. */}
      {!hasCourse ? <CourseSelectorSection /> : (
      <CourseDetailsSection
        courseTitle={courseTitle}
        graph={<ProgressGraph userName={firstName} courseData={courseData} userLessonScores={userLessonScores} globalLessonScores={globalLessonScores} completedLessons={completedLessons} />}
        lessonSlider={lessonSlider}
        left={
          <>
            <OfficeHoursCard coaches={coaches} courseId={courseData?.name} />
            <ResourcesSlider resources={resources} />
          </>
        }
        right={<CommunityForumCard courseName={courseTitle} courseReddit={courseReddit} posts={communityPosts} postsError={communityPostsError} onCreatePost={() => setShowPostModal(true)} onMyPosts={localStorage.getItem('hasPostedToReddit') ? () => setShowMyPostsModal(true) : undefined} userRole={userRole} userId={authUser?.id} onBlockPost={async (postId) => { try { await blockRedditPost(postId, authUser?.id); await refetchCommunityPosts(); } catch {} }} />}
      />
      )}

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
