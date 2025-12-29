import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Onboarding from './Onboarding';
import LoadingScreen from './LoadingScreen';

const ONBOARDING_CACHE_KEY = 'onboarding_status_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DB_TIMEOUT = 15000; // 15 seconds - allow for Supabase cold starts
const MAX_RETRIES = 1; // Will try 2 times total (initial + 1 retry)

const ProtectedRoute = ({ children }) => {
  const { user, firstName, isInitialized } = useAuth();
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setNeedsOnboarding(false);
        setOnboardingLoading(false);
        return;
      }

      setOnboardingLoading(true);

      // Check session storage cache first
      try {
        const cached = sessionStorage.getItem(ONBOARDING_CACHE_KEY);
        if (cached) {
          const { userId, needsOnboarding: cachedNeedsOnboarding, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // Use cache if it's for the current user and not expired
          if (userId === user.id && age < CACHE_DURATION) {
            console.log('[ProtectedRoute] Using cached onboarding status:', { needsOnboarding: cachedNeedsOnboarding, ageSeconds: Math.floor(age / 1000) });
            setNeedsOnboarding(cachedNeedsOnboarding);
            setOnboardingLoading(false);
            return;
          } else {
            console.log('[ProtectedRoute] Cache expired or user mismatch, fetching fresh data');
            sessionStorage.removeItem(ONBOARDING_CACHE_KEY);
          }
        }
      } catch (cacheError) {
        console.warn('[ProtectedRoute] Error reading cache:', cacheError);
        // Continue to database check
      }

      // Retry logic wrapper
      let lastError = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[ProtectedRoute] Retry attempt ${attempt} of ${MAX_RETRIES}`);
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }

          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Onboarding check timed out')), DB_TIMEOUT);
          });

          // Check if user has completed onboarding with timeout
          const onboardingPromise = supabase
            .from('users')
            .select('onboarding_completed, enrolled_course, seniority_level')
            .eq('id', user.id)
            .maybeSingle();

          const { data, error } = await Promise.race([onboardingPromise, timeoutPromise]);

          console.log('[ProtectedRoute] Onboarding check result:', {
            data,
            error,
            userId: user.id,
            attempt: attempt + 1
          });

          if (error) {
            console.error(`[ProtectedRoute] Database error on attempt ${attempt + 1}:`, error);
            lastError = error;
            // Try again unless it's the last attempt
            if (attempt < MAX_RETRIES) {
              continue;
            }
            // On last attempt with error, assume they need onboarding (safe fallback)
            // But DON'T cache this - we're just guessing and don't want to persist incorrect state
            console.warn('[ProtectedRoute] Database failed, defaulting to onboarding (not cached)');
            setNeedsOnboarding(true);
          } else if (data) {
            // User record exists - check if onboarding is completed
            const completed = data.onboarding_completed === true;
            const hasEnrolledCourse = Boolean(data.enrolled_course);

            console.log('[ProtectedRoute] Onboarding status:', {
              completed,
              hasEnrolledCourse,
              enrolledCourse: data.enrolled_course,
              seniorityLevel: data.seniority_level
            });

            // Only show onboarding if BOTH conditions are true:
            // 1. onboarding_completed is not true AND
            // 2. user doesn't have an enrolled course
            // This handles OAuth linking - if user already has a course, skip onboarding
            const needsOnboardingValue = !completed && !hasEnrolledCourse;
            setNeedsOnboarding(needsOnboardingValue);
            cacheOnboardingStatus(user.id, needsOnboardingValue);
          } else {
            // No user record found - this is a new user who needs onboarding
            console.log('[ProtectedRoute] No user record found, creating one and showing onboarding');

            // Try to create the user record from OAuth metadata
            const metadata = user.user_metadata || {};
            const firstName = metadata.first_name || metadata.given_name || metadata.name?.split(' ')[0] || '';
            const lastName = metadata.last_name || metadata.family_name || metadata.name?.split(' ')[1] || '';

            try {
              await supabase.from('users').insert({
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                onboarding_completed: false,
                role: 'student'
              });
              console.log('[ProtectedRoute] Created new user record');
            } catch (insertError) {
              // Ignore duplicate key errors (user might have been created by trigger)
              if (!insertError.message?.includes('duplicate key')) {
                console.error('[ProtectedRoute] Error creating user record:', insertError);
              }
            }

            setNeedsOnboarding(true);
            cacheOnboardingStatus(user.id, true);
          }

          // Success! Break out of retry loop
          break;
        } catch (err) {
          console.error(`[ProtectedRoute] Exception on attempt ${attempt + 1}:`, err);
          lastError = err;

          // Try again unless it's the last attempt
          if (attempt < MAX_RETRIES) {
            continue;
          }

          // On last attempt with exception, default to showing onboarding (safe fallback)
          // But DON'T cache this - we're just guessing and don't want to persist incorrect state
          console.error('[ProtectedRoute] All retry attempts failed, defaulting to show onboarding (not cached)');
          setNeedsOnboarding(true);
        }
      }

      setOnboardingLoading(false);
    };

    checkOnboarding();
  }, [user?.id]);

  // Helper function to cache onboarding status
  const cacheOnboardingStatus = (userId, needsOnboarding) => {
    try {
      const cacheData = {
        userId,
        needsOnboarding,
        timestamp: Date.now()
      };
      sessionStorage.setItem(ONBOARDING_CACHE_KEY, JSON.stringify(cacheData));
      console.log('[ProtectedRoute] Cached onboarding status:', cacheData);
    } catch (cacheError) {
      console.warn('[ProtectedRoute] Failed to cache onboarding status:', cacheError);
      // Non-critical error, continue
    }
  };

  // Debug logging for render decisions
  console.log('🟣 [ProtectedRoute] Render check:');
  console.log('🟣 [ProtectedRoute] isInitialized:', isInitialized);
  console.log('🟣 [ProtectedRoute] onboardingLoading:', onboardingLoading);
  console.log('🟣 [ProtectedRoute] user:', user?.id ?? 'null');
  console.log('🟣 [ProtectedRoute] needsOnboarding:', needsOnboarding);

  // Wait for auth to be initialized first
  if (!isInitialized || onboardingLoading) {
    console.log('🟣 [ProtectedRoute] ⏳ Showing LoadingScreen - isInitialized:', isInitialized, 'onboardingLoading:', onboardingLoading);
    return <LoadingScreen autoRefresh={true} autoRefreshDelay={45000} />;
  }

  if (!user) {
    console.log('🟣 [ProtectedRoute] ❌ No user, redirecting to /welcome');
    return <Navigate to="/welcome" replace />;
  }

  if (needsOnboarding) {
    console.log('🟣 [ProtectedRoute] 📝 Showing Onboarding');
    return <Onboarding firstName={firstName || user.user_metadata?.first_name || 'there'} userId={user.id} />;
  }

  console.log('🟣 [ProtectedRoute] ✅ Rendering children');
  return children;
};

export default ProtectedRoute;
