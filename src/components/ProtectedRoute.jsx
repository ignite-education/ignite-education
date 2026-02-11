import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LoadingScreen from './LoadingScreen';

const ENROLLMENT_CACHE_KEY = 'enrollment_status_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DB_TIMEOUT = 30000; // 30 seconds to handle Supabase cold starts
const MAX_RETRIES = 2; // Will try 3 times total (initial + 2 retries)

const ProtectedRoute = ({ children }) => {
  const { user, isInitialized } = useAuth();
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [hasEnrolledCourse, setHasEnrolledCourse] = useState(null); // null = not checked yet

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user) {
        setHasEnrolledCourse(null);
        setEnrollmentLoading(false);
        return;
      }

      setEnrollmentLoading(true);

      // Check session storage cache first
      try {
        const cached = sessionStorage.getItem(ENROLLMENT_CACHE_KEY);
        if (cached) {
          const { userId, hasEnrolledCourse: cachedHasEnrolled, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // Use cache if it's for the current user and not expired
          if (userId === user.id && age < CACHE_DURATION) {
            setHasEnrolledCourse(cachedHasEnrolled);
            setEnrollmentLoading(false);
            return;
          } else {
            sessionStorage.removeItem(ENROLLMENT_CACHE_KEY);
          }
        }
      } catch {
        // Continue to database check
      }

      // Retry logic wrapper
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }

          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Enrollment check timed out')), DB_TIMEOUT);
          });

          // Check if user has an enrolled course
          const enrollmentPromise = supabase
            .from('users')
            .select('enrolled_course')
            .eq('id', user.id)
            .maybeSingle();

          const { data, error } = await Promise.race([enrollmentPromise, timeoutPromise]);

          if (error) {
            console.error('[ProtectedRoute] Database error:', error);
            if (attempt < MAX_RETRIES) continue;
            // On last attempt with error, redirect to /courses (safe fallback)
            setHasEnrolledCourse(false);
            cacheEnrollmentStatus(user.id, false);
          } else if (data) {
            const enrolled = Boolean(data.enrolled_course);
            setHasEnrolledCourse(enrolled);
            cacheEnrollmentStatus(user.id, enrolled);
          } else {
            // No user record found - create one for new users
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

            setHasEnrolledCourse(false);
            cacheEnrollmentStatus(user.id, false);
          }

          // Success! Break out of retry loop
          break;
        } catch (err) {
          if (attempt < MAX_RETRIES) continue;

          // On last attempt with exception, redirect to /courses (safe fallback)
          console.error('[ProtectedRoute] All retry attempts failed:', err);
          setHasEnrolledCourse(false);
          cacheEnrollmentStatus(user.id, false);
        }
      }

      setEnrollmentLoading(false);
    };

    checkEnrollment();
  }, [user?.id]);

  // Helper function to cache enrollment status
  const cacheEnrollmentStatus = (userId, hasEnrolled) => {
    try {
      sessionStorage.setItem(ENROLLMENT_CACHE_KEY, JSON.stringify({
        userId,
        hasEnrolledCourse: hasEnrolled,
        timestamp: Date.now()
      }));
    } catch {
      // Non-critical error, continue
    }
  };

  // Wait for auth to be initialized first
  if (!isInitialized || enrollmentLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    window.location.href = '/welcome';
    return null;
  }

  // Redirect unenrolled users to course catalog
  if (hasEnrolledCourse === false) {
    window.location.href = '/courses';
    return null;
  }

  return children;
};

export default ProtectedRoute;
