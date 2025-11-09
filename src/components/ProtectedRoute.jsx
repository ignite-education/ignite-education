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
          .single();

        const { data, error } = await Promise.race([onboardingPromise, timeoutPromise]);

        console.log('Onboarding check:', { data, error });

        if (error) {
          console.error('Error checking onboarding:', error);
          // If there's an error, assume they need onboarding
          setNeedsOnboarding(true);
        } else if (data) {
          // Explicitly check if onboarding_completed is true
          const completed = data.onboarding_completed === true;
          console.log('Onboarding completed:', completed, 'Raw value:', data.onboarding_completed);
          setNeedsOnboarding(!completed);
        } else {
          // No data returned, need onboarding
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
