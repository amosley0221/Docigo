import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { createUser, getUserById, verifyUser, type UserRecord } from '../lib/auth';
import {
  GUEST_USER_ID,
  deleteState,
  loadState,
  saveState,
  stateKeyFor,
} from '../lib/db';

const SESSION_KEY = 'docigo.session.v1';
const GUEST_KEY = 'docigo.guest.v1';

interface SessionPayload {
  userId: string;
  persistent: boolean;
}

function readSession(): SessionPayload | null {
  try {
    const local = localStorage.getItem(SESSION_KEY);
    if (local) return JSON.parse(local) as SessionPayload;
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) return JSON.parse(session) as SessionPayload;
  } catch {
    // ignore
  }
  return null;
}

function writeSession(payload: SessionPayload | null) {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  if (!payload) return;
  const target = payload.persistent ? localStorage : sessionStorage;
  target.setItem(SESSION_KEY, JSON.stringify(payload));
}

function readGuest(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

function writeGuest(active: boolean) {
  if (active) localStorage.setItem(GUEST_KEY, '1');
  else localStorage.removeItem(GUEST_KEY);
}

interface AuthState {
  user: UserRecord | null;
  isGuest: boolean;
  hydrated: boolean;
}

interface AuthActions {
  signIn: (identifier: string, password: string, stay: boolean) => Promise<void>;
  signUp: (
    username: string,
    email: string,
    password: string,
    stay: boolean,
  ) => Promise<void>;
  signOut: () => void;
  continueAsGuest: () => void;
  exitGuest: () => void;
}

type Auth = AuthState & AuthActions;

const AuthCtx = createContext<Auth | null>(null);

async function migrateGuestStateTo(userId: string) {
  const guestKey = stateKeyFor(GUEST_USER_ID);
  const targetKey = stateKeyFor(userId);
  const guestState = await loadState<unknown>(guestKey);
  if (!guestState) return;
  const existing = await loadState<unknown>(targetKey);
  // Only migrate when the new account doesn't already have data, to avoid
  // clobbering an established account.
  if (existing) return;
  await saveState(targetKey, guestState);
  await deleteState(guestKey);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = readSession();
      if (session) {
        const u = await getUserById(session.userId);
        if (!cancelled) {
          if (u) {
            setUser(u);
            writeGuest(false);
          } else {
            writeSession(null);
          }
        }
      } else if (readGuest()) {
        if (!cancelled) setIsGuest(true);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback<AuthActions['signIn']>(async (identifier, password, stay) => {
    const u = await verifyUser(identifier, password);
    if (!u) throw new Error('Wrong username/email or password');
    writeSession({ userId: u.id, persistent: stay });
    writeGuest(false);
    setIsGuest(false);
    setUser(u);
  }, []);

  const signUp = useCallback<AuthActions['signUp']>(
    async (username, email, password, stay) => {
      const u = await createUser(username, email, password);
      // If the user was working as a guest, carry that work into their new
      // account so "save my work" actually preserves the session.
      await migrateGuestStateTo(u.id);
      writeSession({ userId: u.id, persistent: stay });
      writeGuest(false);
      setIsGuest(false);
      setUser(u);
    },
    [],
  );

  const signOut = useCallback<AuthActions['signOut']>(() => {
    writeSession(null);
    writeGuest(false);
    setUser(null);
    setIsGuest(false);
  }, []);

  const continueAsGuest = useCallback<AuthActions['continueAsGuest']>(() => {
    writeGuest(true);
    setIsGuest(true);
  }, []);

  const exitGuest = useCallback<AuthActions['exitGuest']>(() => {
    writeGuest(false);
    setIsGuest(false);
  }, []);

  const value = useMemo<Auth>(
    () => ({
      user,
      isGuest,
      hydrated,
      signIn,
      signUp,
      signOut,
      continueAsGuest,
      exitGuest,
    }),
    [user, isGuest, hydrated, signIn, signUp, signOut, continueAsGuest, exitGuest],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
