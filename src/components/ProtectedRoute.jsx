import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Onboarding from './Onboarding';
import LoadingScreen from './LoadingScreen';

const ONBOARDING_CACHE_KEY = 'onboarding_status_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DB_TIMEOUT = 30000; // 30 seconds to handle Supabase cold starts
const MAX_RETRIES = 2; // Will try 3 times total (initial + 2 retries)

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
            setNeedsOnboarding(cachedNeedsOnboarding);
            setOnboardingLoading(false);
            return;
          } else {
            sessionStorage.removeItem(ONBOARDING_CACHE_KEY);
          }
        }
      } catch {
        // Continue to database check
      }

      // Retry logic wrapper
      let lastError = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
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

          if (error) {
            console.error('[ProtectedRoute] Database error:', error);
            lastError = error;
            if (attempt < MAX_RETRIES) continue;
            // On last attempt with error, assume they need onboarding (safe fallback)
            setNeedsOnboarding(true);
            cacheOnboardingStatus(user.id, true);
          } else if (data) {
            // User record exists - check if onboarding is completed
            const completed = data.onboarding_completed === true;
            const hasEnrolledCourse = Boolean(data.enrolled_course);

            // Only show onboarding if BOTH conditions are true:
            // 1. onboarding_completed is not true AND
            // 2. user doesn't have an enrolled course
            // This handles OAuth linking - if user already has a course, skip onboarding
            const needsOnboardingValue = !completed && !hasEnrolledCourse;
            setNeedsOnboarding(needsOnboardingValue);
            cacheOnboardingStatus(user.id, needsOnboardingValue);
          } else {
            // No user record found - this is a new user who needs onboarding
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
          lastError = err;
          if (attempt < MAX_RETRIES) continue;

          // On last attempt with exception, default to showing onboarding (safe fallback)
          console.error('[ProtectedRoute] All retry attempts failed:', err);
          setNeedsOnboarding(true);
          cacheOnboardingStatus(user.id, true);
        }
      }

      setOnboardingLoading(false);
    };

    checkOnboarding();
  }, [user?.id]);

  // Helper function to cache onboarding status
  const cacheOnboardingStatus = (userId, needsOnboarding) => {
    try {
      sessionStorage.setItem(ONBOARDING_CACHE_KEY, JSON.stringify({
        userId,
        needsOnboarding,
        timestamp: Date.now()
      }));
    } catch {
      // Non-critical error, continue
    }
  };

  // Wait for auth to be initialized first
  if (!isInitialized || onboardingLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    window.location.href = '/welcome';
    return null;
  }

  if (needsOnboarding) {
    return <Onboarding firstName={firstName || user.user_metadata?.first_name || 'there'} userId={user.id} />;
  }

  return children;
};

export default ProtectedRoute;
