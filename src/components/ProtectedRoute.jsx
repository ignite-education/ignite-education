import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LoadingScreen from './LoadingScreen';

// Minimal sign-in form for local development only
const DevSignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/progress` },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px', padding: '32px', background: '#2a2a2a', borderRadius: '12px' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '18px', textAlign: 'center' }}>Dev Sign In</h2>
        <button type="button" onClick={handleGoogle} disabled={loading}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#fff', color: '#333', cursor: 'pointer', fontWeight: 500 }}>
          Sign in with Google
        </button>
        <div style={{ textAlign: 'center', color: '#888', fontSize: '12px' }}>or</div>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#fff' }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#fff' }} />
        <button type="submit" disabled={loading}
          style={{ padding: '10px', borderRadius: '8px', border: 'none', background: '#EF0B72', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        {error && <p style={{ color: '#ff6b6b', fontSize: '13px', margin: 0, textAlign: 'center' }}>{error}</p>}
      </form>
    </div>
  );
};

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
            const firstName = (metadata.first_name || metadata.given_name || metadata.name?.split(' ')[0] || '').trim();
            const lastName = (metadata.last_name || metadata.family_name || metadata.name?.split(' ')[1] || '').trim();

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
    // In local dev, show a sign-in form instead of redirecting to Next.js
    if (import.meta.env.DEV && window.location.hostname === 'localhost') {
      return <DevSignIn />;
    }
    window.location.href = '/welcome';
    return null;
  }

  // Redirect unenrolled users to course catalog (skip on localhost for dev)
  if (hasEnrolledCourse === false) {
    if (import.meta.env.DEV && window.location.hostname === 'localhost') {
      // Allow access on localhost even without enrollment
    } else {
      window.location.href = '/courses';
      return null;
    }
  }

  return children;
};

export default ProtectedRoute;
