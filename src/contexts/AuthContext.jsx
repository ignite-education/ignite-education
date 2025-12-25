import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { addContactToAudience, RESEND_AUDIENCES } from '../lib/email';

const AuthContext = createContext({});

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

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth session check timed out after 30 seconds');
      setLoading(false);
      setIsInitialized(true);
    }, 30000); // 30 second timeout to handle Supabase cold starts

    // Check active sessions and sets the user
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(loadingTimeout);
        setUser(session?.user ?? null);
        setLoading(false);
        setIsInitialized(true);
      })
      .catch((error) => {
        clearTimeout(loadingTimeout);
        console.error('Error getting session:', error);
        setUser(null);
        setLoading(false);
        setIsInitialized(true);
      });

    // Listen for changes on auth state (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Clean up OAuth hash fragments from URL after sign-in
      if (event === 'SIGNED_IN' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      // Update last_active_at on sign in
      if (event === 'SIGNED_IN' && session?.user?.id) {
        try {
          await supabase
            .from('users')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', session.user.id);
        } catch (err) {
          console.error('Failed to update last_active_at:', err);
        }
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user role from database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          return;
        }

        if (data) {
          setUserRole(data.role);
        }
      } catch (err) {
        console.error('Exception fetching user role:', err);
      }
    };

    fetchUserRole();
  }, [user]);

  // Sign up with email and password
  const signUp = async (email, password, firstName, lastName) => {
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
      try {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            onboarding_completed: false,
            role: 'student'
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If there's an auth session error, clear local storage manually
        if (error.message?.includes('Auth session missing') || error.status === 403) {
          console.log('Session already invalid, clearing local storage...');
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/';
          return;
        }
        throw error;
      }
    } catch (err) {
      // If logout fails, force clear and redirect
      console.error('Error during logout:', err);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
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
        redirectTo: `${window.location.origin}/progress`,
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
    firstName: user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || null,
    lastName: user?.user_metadata?.last_name || user?.user_metadata?.full_name?.split(' ')[1] || null,
    isAdFree: user?.user_metadata?.is_ad_free || false,
    userRole,
  }), [user, loading, isInitialized, userRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
