import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { createBuyerProfile, fetchBuyerProfile } from '@/lib/api';
import { signInWithGoogle as googleSignIn } from '@/lib/googleAuth';
import { isSupabaseConfigured } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import type { BuyerProfile } from '@/types';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: BuyerProfile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [loading, setLoading] = useState(configured);

  const loadProfile = useCallback(async (user: User | null) => {
    if (!user?.email) {
      setProfile(null);
      return;
    }

    try {
      const existing = await fetchBuyerProfile({ email: user.email });
      setProfile(existing);
    } catch {
      const name =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email.split('@')[0] ||
        'Buyer';
      try {
        const created = await createBuyerProfile({
          name,
          email: user.email,
          phone: (user.user_metadata?.phone as string | undefined) ?? '',
        });
        setProfile(created);
      } catch {
        setProfile(null);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user ?? null);
  }, [loadProfile, session?.user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      void loadProfile(data.session?.user ?? null).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile, supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, name } },
      });
      if (error) throw error;
    },
    [supabase],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    await googleSignIn();
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      configured,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [configured, loading, profile, refreshProfile, session, signIn, signInWithGoogle, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
