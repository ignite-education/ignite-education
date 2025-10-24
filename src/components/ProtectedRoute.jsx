import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Onboarding from './Onboarding';
import Lottie from 'lottie-react';

const ProtectedRoute = ({ children }) => {
  const { user, firstName, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [lottieData, setLottieData] = useState(null);

  useEffect(() => {
    // Fetch Lottie animation data
    fetch('https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/icon%20v1.json')
      .then(response => response.json())
      .then(data => setLottieData(data))
      .catch(error => console.error('Error loading Lottie animation:', error));
  }, []);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has completed onboarding
        const { data, error } = await supabase
          .from('users')
          .select('onboarding_completed, enrolled_course, seniority_level')
          .eq('id', user.id)
          .single();

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
        setNeedsOnboarding(true);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [user]);

  // Wait for auth context to finish loading
  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        {lottieData ? (
          <Lottie
            animationData={lottieData}
            loop={true}
            autoplay={true}
            style={{ width: 200, height: 200 }}
          />
        ) : (
          <div className="w-32 h-32 flex items-center justify-center">
            <div className="animate-pulse text-white">Loading...</div>
          </div>
        )}
      </div>
    );
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
