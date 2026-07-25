import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useGlobalLoading from '../hooks/useGlobalLoading';
import { holdLoadingForNavigation } from '../lib/loadingStore';

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

// Read the cached enrollment result synchronously. Used as the useState initialiser
// so that on a cache hit the very first render where `user` is known already has
// the answer — there is no window in which children can mount prematurely.
const readCachedEnrollment = () => {
  try {
    const cached = sessionStorage.getItem(ENROLLMENT_CACHE_KEY);
    if (!cached) return null;
    const { userId, hasEnrolledCourse, timestamp } = JSON.parse(cached);
    if (!userId || Date.now() - timestamp >= CACHE_DURATION) return null;
    return { userId, hasEnrolled: Boolean(hasEnrolledCourse) };
  } catch {
    return null;
  }
};

const ProtectedRoute = ({ children }) => {
  const { user, isInitialized } = useAuth();
  const [enrollment, setEnrollment] = useState(readCachedEnrollment);

  // Derived, not stateful. Previously `enrollmentLoading` started false, so there
  // existed a render where auth was initialised but the gate read "not loading" —
  // children mounted, then the effect flipped the flag and unmounted them again,
  // remounting from scratch when the DB call resolved. Deriving the gate from
  // "do I have a result for *this* user?" removes that window entirely.
  const enrollmentReady = !user || enrollment?.userId === user.id;
  const isChecking = !isInitialized || !enrollmentReady;

  const isDevLocalhost = import.meta.env.DEV && window.location.hostname === 'localhost';
  const redirectTo = isChecking
    ? null
    : !user
      ? (isDevLocalhost ? null : '/welcome')
      : (enrollment?.hasEnrolled === false && !isDevLocalhost ? '/courses' : null);

  // Keep the overlay up through the redirect so the user never sees a blank page
  // while the new document loads.
  useGlobalLoading(isChecking || !!redirectTo);

  useEffect(() => {
    if (!redirectTo) return;
    holdLoadingForNavigation();
    window.location.href = redirectTo;
  }, [redirectTo]);

  useEffect(() => {
    if (!isInitialized || !user) return;

    const cached = readCachedEnrollment();
    if (cached?.userId === user.id) {
      setEnrollment(cached);
      return;
    }
    if (cached) {
      try { sessionStorage.removeItem(ENROLLMENT_CACHE_KEY); } catch { /* ignore */ }
    }

    let cancelled = false;
    const applyResult = (hasEnrolled) => {
      cacheEnrollmentStatus(user.id, hasEnrolled);
      if (!cancelled) setEnrollment({ userId: user.id, hasEnrolled });
    };

    const checkEnrollment = async () => {
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
            applyResult(false);
          } else if (data) {
            applyResult(Boolean(data.enrolled_course));
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

            applyResult(false);
          }

          // Success! Break out of retry loop
          break;
        } catch (err) {
          if (attempt < MAX_RETRIES) continue;

          // On last attempt with exception, redirect to /courses (safe fallback)
          console.error('[ProtectedRoute] All retry attempts failed:', err);
          applyResult(false);
        }
      }
    };

    checkEnrollment();
    return () => { cancelled = true; };
  }, [isInitialized, user?.id]);

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

  // Still resolving auth/enrollment, or navigating away — the global loading
  // overlay is up (claimed above), so render nothing underneath it.
  if (isChecking || redirectTo) return null;

  // Only reachable on localhost dev; production redirects to /welcome above.
  if (!user) return <DevSignIn />;

  return children;
};

export default ProtectedRoute;
