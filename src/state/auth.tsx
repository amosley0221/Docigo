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

const SESSION_KEY = 'docigo.session.v1';

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

interface AuthState {
  user: UserRecord | null;
  hydrated: boolean;
}

interface AuthActions {
  signIn: (username: string, password: string, stay: boolean) => Promise<void>;
  signUp: (username: string, password: string, stay: boolean) => Promise<void>;
  signOut: () => void;
}

type Auth = AuthState & AuthActions;

const AuthCtx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = readSession();
      if (session) {
        const u = await getUserById(session.userId);
        if (!cancelled) {
          if (u) setUser(u);
          else writeSession(null);
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback<AuthActions['signIn']>(async (username, password, stay) => {
    const u = await verifyUser(username, password);
    if (!u) throw new Error('Wrong username or password');
    writeSession({ userId: u.id, persistent: stay });
    setUser(u);
  }, []);

  const signUp = useCallback<AuthActions['signUp']>(async (username, password, stay) => {
    const u = await createUser(username, password);
    writeSession({ userId: u.id, persistent: stay });
    setUser(u);
  }, []);

  const signOut = useCallback<AuthActions['signOut']>(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const value = useMemo<Auth>(
    () => ({ user, hydrated, signIn, signUp, signOut }),
    [user, hydrated, signIn, signUp, signOut],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
