import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Onboarding from './Onboarding';
import LoadingScreen from './LoadingScreen';

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

      try {
        // Create a timeout promise (reduced from 8s to 5s for faster response)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Onboarding check timed out')), 5000);
        });

        // Check if user has completed onboarding with timeout
        const onboardingPromise = supabase
          .from('users')
          .select('onboarding_completed, enrolled_course, seniority_level')
          .eq('id', user.id)
          .maybeSingle();

        const { data, error } = await Promise.race([onboardingPromise, timeoutPromise]);

        console.log('Onboarding check:', { data, error, userId: user.id });

        if (error) {
          console.error('Error checking onboarding:', error);
          // If there's a real database error (not just missing record), assume they need onboarding
          setNeedsOnboarding(true);
        } else if (data) {
          // User record exists - check if onboarding is completed
          const completed = data.onboarding_completed === true;
          const hasEnrolledCourse = Boolean(data.enrolled_course);

          console.log('Onboarding status:', {
            completed,
            hasEnrolledCourse,
            enrolledCourse: data.enrolled_course,
            seniorityLevel: data.seniority_level
          });

          // Only show onboarding if BOTH conditions are true:
          // 1. onboarding_completed is not true AND
          // 2. user doesn't have an enrolled course
          // This handles OAuth linking - if user already has a course, skip onboarding
          setNeedsOnboarding(!completed && !hasEnrolledCourse);
        } else {
          // No user record found - this is a new user who needs onboarding
          console.log('No user record found, creating one and showing onboarding');

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
          } catch (insertError) {
            // Ignore duplicate key errors (user might have been created by trigger)
            if (!insertError.message?.includes('duplicate key')) {
              console.error('Error creating user record:', insertError);
            }
          }

          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.error('Exception checking onboarding:', err);
        // On timeout or error, default to showing onboarding (safe fallback)
        setNeedsOnboarding(true);
      } finally {
        setOnboardingLoading(false);
      }
    };

    checkOnboarding();
  }, [user]);

  // Wait for auth to be initialized first
  if (!isInitialized || onboardingLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  if (needsOnboarding) {
    return <Onboarding firstName={firstName || user.user_metadata?.first_name || 'there'} userId={user.id} />;
  }

  return children;
};

export default ProtectedRoute;
