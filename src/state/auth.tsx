import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { setStayPreference, supabase } from '../lib/supabase';
import { requestPersistence } from '../lib/storage';

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  display: string;
}

function toAppUser(u: User | null | undefined): AppUser | null {
  if (!u || !u.email) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const firstName =
    typeof meta.first_name === 'string' ? meta.first_name : '';
  const lastName = typeof meta.last_name === 'string' ? meta.last_name : '';
  const display = `${firstName} ${lastName}`.trim() || u.email;
  return {
    id: u.id,
    email: u.email,
    firstName,
    lastName,
    display,
  };
}

interface AuthState {
  user: AppUser | null;
  hydrated: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string, stay: boolean) => Promise<void>;
  signUp: (
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    stay: boolean,
  ) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

type Auth = AuthState & AuthActions;

const AuthCtx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = toAppUser(data.session?.user);
      setUser(u);
      setHydrated(true);
      if (u) void requestPersistence();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      const u = toAppUser(session?.user);
      setUser(u);
      if (u) void requestPersistence();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthActions['signIn']>(
    async (email, password, stay) => {
      // Decide where the persisted session should land BEFORE Supabase
      // writes it via our storage adapter.
      setStayPreference(stay);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);
    },
    [],
  );

  const signUp = useCallback<AuthActions['signUp']>(
    async (email, firstName, lastName, password, stay) => {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      if (!trimmedFirst) throw new Error('First name is required');
      if (!trimmedLast) throw new Error('Last name is required');
      setStayPreference(stay);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { first_name: trimmedFirst, last_name: trimmedLast },
        },
      });
      if (error) throw new Error(error.message);
      // If email confirmation is enabled, session will be null until the
      // user clicks the link.
      const needsConfirmation = !data.session;
      return { needsConfirmation };
    },
    [],
  );

  const signOut = useCallback<AuthActions['signOut']>(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback<AuthActions['updateProfile']>(
    async (patch) => {
      const updates: { email?: string; data?: Record<string, string> } = {};
      const meta: Record<string, string> = {};
      if (patch.firstName !== undefined) {
        const f = patch.firstName.trim();
        if (!f) throw new Error('First name is required');
        meta.first_name = f;
      }
      if (patch.lastName !== undefined) {
        const l = patch.lastName.trim();
        if (!l) throw new Error('Last name is required');
        meta.last_name = l;
      }
      if (Object.keys(meta).length > 0) updates.data = meta;
      if (patch.email !== undefined) {
        const e = patch.email.trim();
        if (!e) throw new Error('Email is required');
        updates.email = e;
      }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw new Error(error.message);
    },
    [],
  );

  const changePassword = useCallback<AuthActions['changePassword']>(
    async (newPassword) => {
      if (newPassword.length < 6)
        throw new Error('Password must be at least 6 characters');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
    [],
  );

  const value = useMemo<Auth>(
    () => ({
      user,
      hydrated,
      signIn,
      signUp,
      signOut,
      updateProfile,
      changePassword,
    }),
    [user, hydrated, signIn, signUp, signOut, updateProfile, changePassword],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
