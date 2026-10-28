import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_KEY = 'nyaya_maarg_guest_mode';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem(GUEST_KEY) === 'true';
  });
  const [loading, setLoading] = useState<boolean>(() => isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    localStorage.setItem(GUEST_KEY, 'true');
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!email?.trim() || !password) {
      return { error: new Error('Email or password is incorrect') };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error(
          'Authentication service is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        ),
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data?.session || !data?.user) {
      return { error: new Error('Email or password is incorrect') };
    }

    setUser(data.user);
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
    return { error: null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!email?.trim()) {
      return { error: new Error('Email is required') };
    }
    if (!password || password.length < 6) {
      return { error: new Error('Password must be at least 6 characters') };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error(
          'Authentication service is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        ),
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error };
    }

    if (data?.session?.user) {
      setUser(data.session.user);
      setIsGuest(false);
      localStorage.removeItem(GUEST_KEY);
    }
    return { error: null };
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error(
          'Authentication service is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        ),
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    if (!email?.trim()) {
      return { error: new Error('Email is required') };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error(
          'Authentication service is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        ),
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const signOut = async () => {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore network error on signout
      }
    }
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isAuthenticated: Boolean(user || isGuest),
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth } from './useAuth';
