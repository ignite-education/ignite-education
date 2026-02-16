import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';

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
    let isSubscribed = true;
    let sessionFromListener = null;
    let hasInitialized = false;

    const safeInitialize = (session) => {
      if (!isSubscribed || hasInitialized) return;
      hasInitialized = true;
      setUser(session?.user ?? null);
      setLoading(false);
      setIsInitialized(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;

      sessionFromListener = session;

      if (session?.user) {
        safeInitialize(session);
      }

      setUser(session?.user ?? null);
      setLoading(false);
    });

    const loadingTimeout = setTimeout(() => {
      if (!isSubscribed) return;
      if (sessionFromListener?.user) {
        safeInitialize(sessionFromListener);
      } else {
        safeInitialize(null);
      }
    }, 30000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isSubscribed) return;
        clearTimeout(loadingTimeout);

        if (!sessionFromListener?.user) {
          safeInitialize(session);
        } else {
          safeInitialize(sessionFromListener);
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        clearTimeout(loadingTimeout);

        if (sessionFromListener?.user) {
          safeInitialize(sessionFromListener);
        } else {
          safeInitialize(null);
        }
      });

    return () => {
      isSubscribed = false;
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

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (error.message?.includes('Auth session missing') || error.status === 403) {
          clearSupabaseCookies();
          window.location.href = 'https://ignite.education/welcome';
          return;
        }
        throw error;
      }
      window.location.href = 'https://ignite.education/welcome';
    } catch (err) {
      console.error('Error during logout:', err);
      clearSupabaseCookies();
      window.location.href = 'https://ignite.education/welcome';
    }
  };

  const clearSupabaseCookies = () => {
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; path=/; domain=.ignite.education; max-age=0`;
      }
    });
  };

  const value = useMemo(() => ({
    user,
    loading,
    isInitialized,
    signOut,
    firstName: user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || null,
    lastName: user?.user_metadata?.last_name || user?.user_metadata?.full_name?.split(' ')[1] || null,
    profilePicture: user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
    userRole,
  }), [user, loading, isInitialized, userRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
