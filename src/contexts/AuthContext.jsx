import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { addContactToAudience, RESEND_AUDIENCES } from '../lib/email';
import { clearReferrer } from '../lib/referral';

const AuthContext = createContext({});

// Upgrade Google profile picture URLs to higher resolution
// (LinkedIn URLs are signed and can't be manipulated — handled at callback time instead)
const getHighResProfilePicture = (url) => {
  if (!url) return null;
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=s\d+-c/, '=s400-c');
  }
  return url;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [enrolledCourse, setEnrolledCourse] = useState(null);
  // Insider entitlement granted by a referral or a manual comp, as opposed to a
  // Stripe subscription. Read from public.insider_grants below.
  const [insiderUntil, setInsiderUntil] = useState(null);
  const [grantSource, setGrantSource] = useState(null);

  useEffect(() => {
    let isSubscribed = true;
    let sessionFromListener = null;
    let hasInitialized = false;

    // Helper to safely initialize (prevents double initialization)
    const safeInitialize = (session) => {
      if (!isSubscribed || hasInitialized) return;
      hasInitialized = true;
      setUser(session?.user ?? null);
      setLoading(false);
      setIsInitialized(true);
    };

    // Set up auth state listener FIRST (before getSession)
    // This ensures we catch OAuth callbacks that may fire before getSession resolves
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;

      sessionFromListener = session;

      // If we get a session from the listener, use it immediately
      if (session?.user) {
        safeInitialize(session);
      }

      // Always update user state on auth changes (for logout, token refresh, etc.)
      setUser(session?.user ?? null);
      setLoading(false);

      // Clean up OAuth hash fragments from URL after sign-in
      if (event === 'SIGNED_IN' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      // Update last_active_at on sign in
      // IMPORTANT: fire-and-forget — do NOT await inside onAuthStateChange
      // Awaiting a DB call here can deadlock the Supabase client's auth lock
      if (event === 'SIGNED_IN' && session?.user?.id) {
        supabase
          .from('users')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', session.user.id)
          .then(({ error }) => { if (error) console.error('Failed to update last_active_at:', error); });
        supabase
          .from('sign_in_history')
          .insert({ user_id: session.user.id })
          .then(({ error }) => { if (error) console.error('Failed to log sign-in:', error); });
      }
    });

    // Timeout handler - use session from listener if available
    const loadingTimeout = setTimeout(() => {
      if (!isSubscribed) return;
      if (sessionFromListener?.user) {
        safeInitialize(sessionFromListener);
      } else {
        safeInitialize(null);
      }
    }, 30000);

    // Try getSession as backup (may hang on some browsers/conditions)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isSubscribed) return;
        clearTimeout(loadingTimeout);

        // Only use getSession result if listener hasn't already initialized
        if (!sessionFromListener?.user) {
          safeInitialize(session);
        } else {
          safeInitialize(sessionFromListener);
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        clearTimeout(loadingTimeout);

        // Use listener session if available, otherwise no user
        if (sessionFromListener?.user) {
          safeInitialize(sessionFromListener);
        } else {
          // Corrupted session cookie — clear so next sign-in works cleanly
          clearSupabaseCookies();
          safeInitialize(null);
        }
      });

    // Catch unhandled Supabase internal errors (e.g. Invalid UTF-8 from corrupted cookies)
    const handleUnhandledRejection = (e) => {
      if (e.reason?.message?.includes('Invalid UTF-8')) {
        e.preventDefault();
        clearSupabaseCookies();
        safeInitialize(null);
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      isSubscribed = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Fetch user role and Insider grant from database.
  //
  // Both live here rather than in the JWT because this effect re-runs on every
  // auth change and page load, so what it reads is always current. That is what
  // lets a referral week appear (and lapse) without the user re-authenticating —
  // unlike user_metadata.is_ad_free, which is stale until the session refreshes.
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setInsiderUntil(null);
        setGrantSource(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role, enrolled_course')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          return;
        }

        if (data) {
          setUserRole(data.role);
          setEnrolledCourse(data.enrolled_course || null);
        }
      } catch (err) {
        console.error('Exception fetching user role:', err);
      }

      // Live Insider grant, if any. Expiry is evaluated here rather than by a
      // sweeper, so a lapsed week simply stops matching.
      try {
        const now = new Date().toISOString();
        const { data: grant, error: grantError } = await supabase
          .from('insider_grants')
          .select('expires_at, source')
          .eq('user_id', user.id)
          .lte('starts_at', now)
          .gt('expires_at', now)
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // migrations/add_referrals.sql is hand-applied — treat "no table" as
        // "no grant" rather than logging noise on every page load.
        if (grantError && !['42P01', 'PGRST205', 'PGRST116'].includes(grantError.code)) {
          console.error('Error fetching insider grant:', grantError);
        }

        setInsiderUntil(grant?.expires_at || null);
        setGrantSource(grant?.source || null);
      } catch (err) {
        console.error('Exception fetching insider grant:', err);
      }
    };

    fetchUserRole();
  }, [user]);

  // Sign up with email and password
  const signUp = async (email, password, firstName, lastName) => {
    firstName = firstName.trim();
    lastName = lastName.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) throw error;

    // Create user record in public.users table (fallback if trigger doesn't exist)
    if (data.user) {
      // Capture country from Vercel geo headers (non-blocking)
      let country = null;
      try {
        const geoRes = await fetch('/api/geo');
        if (geoRes.ok) {
          const geo = await geoRes.json();
          country = geo.country || null;
        }
      } catch {
        // Geo fetch failed — proceed without country
      }

      try {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            onboarding_completed: false,
            role: 'student',
            ...(country ? { country } : {}),
          });

        // Ignore conflict errors (user already exists from trigger)
        if (insertError && !insertError.message.includes('duplicate key')) {
          console.error('Error creating user record:', insertError);
        }
      } catch (err) {
        console.error('Exception creating user record:', err);
      }

      // Note: Welcome email is now sent when user enrolls in a course (Onboarding.jsx)
      // This ensures they only get an email after selecting a course

      // Add user to Resend "General" audience (new users have no course yet)
      if (RESEND_AUDIENCES.GENERAL) {
        try {
          await addContactToAudience(
            { email, firstName, lastName },
            RESEND_AUDIENCES.GENERAL
          );
          console.log('📋 New user added to General audience');
        } catch (audienceErr) {
          console.error('Failed to add user to Resend General audience:', audienceErr);
          // Don't throw - audience sync failure shouldn't block signup
        }
      }
    }

    return data;
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  // Sign out
  const signOut = async () => {
    // The referral crumb lives in localStorage, which sessionStorage.clear()
    // below doesn't touch. Drop it here so the next person to sign up on this
    // machine isn't credited to whoever just left.
    clearReferrer();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (error.message?.includes('Auth session missing') || error.status === 403) {
          console.log('Session already invalid, clearing auth state...');
          setUser(null);
          clearSupabaseCookies();
          sessionStorage.clear();
          window.location.href = '/';
          return;
        }
        throw error;
      }
      // Clear user state immediately so navbar updates before navigation
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
      clearSupabaseCookies();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  // Clear Supabase auth cookies as a fallback when signOut fails
  const clearSupabaseCookies = () => {
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; path=/; max-age=0`;
      }
    });
  };

  // Update user profile
  const updateProfile = async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) throw error;
    return data;
  };

  // Sign in with OAuth (Google, LinkedIn, etc.)
  const signInWithOAuth = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/progress`,
      }
    });

    if (error) throw error;
    return data;
  };

  // Reset password - sends password reset email
  const resetPassword = async (email) => {
    console.log('Calling resetPasswordForEmail with:', {
      email,
      redirectTo: `${window.location.origin}/reset-password`
    });

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('Supabase resetPasswordForEmail error:', error);
      throw error;
    }

    console.log('Supabase resetPasswordForEmail success:', data);
    return data;
  };

  // Update password after reset
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  };

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session?.user) setUser(session.user);
  };

  // Two independent sources of Insider access; see resolveInsider() in server.js
  // for the server-side twin. Never read is_ad_free directly for gating — a
  // referral or comp grant is just as real, and a granted user has no Stripe
  // customer, so anything billing-related must branch on insiderSource.
  const hasStripeInsider = !!user?.user_metadata?.is_ad_free;
  const hasGrantInsider = !!insiderUntil && new Date(insiderUntil) > new Date();

  const value = useMemo(() => ({
    user,
    loading,
    isInitialized,
    signUp,
    signIn,
    signOut,
    updateProfile,
    signInWithOAuth,
    resetPassword,
    updatePassword,
    refreshSession,
    firstName: (user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || '').trim() || null,
    lastName: (user?.user_metadata?.last_name || user?.user_metadata?.full_name?.split(' ')[1] || '').trim() || null,
    isInsider: hasStripeInsider || hasGrantInsider,
    // 'stripe' | 'referral_referee' | 'referral_referrer' | 'comp' | null
    insiderSource: hasStripeInsider ? 'stripe' : (hasGrantInsider ? grantSource : null),
    // ISO string, only set for grant-based access
    insiderUntil: hasStripeInsider ? null : (hasGrantInsider ? insiderUntil : null),
    profilePicture: getHighResProfilePicture(
      user?.user_metadata?.custom_avatar_url
      || user?.user_metadata?.avatar_url
      || user?.user_metadata?.picture
      || null
    ),
    hasHighQualityAvatar: !!(
      user?.user_metadata?.custom_avatar_url
      || user?.identities?.some(id => id.provider === 'google')
    ),
    userRole,
    enrolledCourse,
  }), [user, loading, isInitialized, userRole, enrolledCourse, hasStripeInsider, hasGrantInsider, grantSource, insiderUntil]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
