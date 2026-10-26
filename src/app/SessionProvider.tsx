import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearGuestProfile, loadProfile, saveProfile } from '@/features/profile/profileRepository';
import type { Profile } from '@/features/profile/types';
import { readStorage, writeStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

const GUEST_KEY = 'whybox.guest';

type Mode = 'signed-out' | 'guest' | 'account';

interface SessionValue {
  loading: boolean;
  mode: Mode;
  user: User | null;
  profile: Profile | null;
  onlineSignInAvailable: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  continueAsGuest: () => void;
  updateProfile: (profile: Profile) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(() => readStorage(GUEST_KEY) === '1');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  // Which session the current profile belongs to, so a stale profile is never shown as ready.
  const [profileOwner, setProfileOwner] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const mode: Mode = user ? 'account' : isGuest ? 'guest' : 'signed-out';
  const sessionKey = user ? `account:${user.id}` : mode;

  useEffect(() => {
    if (!authReady) return;
    if (mode === 'signed-out') {
      setProfile(null);
      setProfileOwner(sessionKey);
      return;
    }
    let cancelled = false;
    loadProfile(user?.id ?? null)
      .catch(() => null)
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        setProfileOwner(sessionKey);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, mode, sessionKey, user?.id]);

  const redirectTo = `${window.location.origin}/`;

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  }, [redirectTo]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!supabase) throw new Error('Supabase is not configured');
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
    },
    [redirectTo],
  );

  const continueAsGuest = useCallback(() => {
    writeStorage(GUEST_KEY, '1');
    setIsGuest(true);
  }, []);

  const updateProfile = useCallback(
    async (next: Profile) => {
      await saveProfile(user?.id ?? null, next);
      setProfile(next);
    },
    [user?.id],
  );

  const signOut = useCallback(async () => {
    if (user && supabase) await supabase.auth.signOut();
    writeStorage(GUEST_KEY, null);
    clearGuestProfile();
    setIsGuest(false);
    setProfile(null);
  }, [user]);

  const value = useMemo<SessionValue>(
    () => ({
      loading: !authReady || profileOwner !== sessionKey,
      mode,
      user,
      profile,
      onlineSignInAvailable: Boolean(supabase),
      signInWithGoogle,
      signInWithEmail,
      continueAsGuest,
      updateProfile,
      signOut,
    }),
    [authReady, profileOwner, sessionKey, mode, user, profile, signInWithGoogle, signInWithEmail, continueAsGuest, updateProfile, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
};
