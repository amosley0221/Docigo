import { useState } from 'react';
import { useAuth } from '../state/auth';
import { Icon } from './Icon';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stay, setStay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords don’t match');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password, stay);
      } else {
        await signUp(email, firstName, lastName, password, stay);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-bg flex h-full items-center justify-center p-6">
      <div className="grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="hidden flex-col justify-between lg:flex">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="logo" />
              <div className="font-display text-2xl font-bold tracking-tight text-white">
                Docigo
              </div>
            </div>
            <h1 className="mt-10 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-white">
              Stay in flow
              <br />
              <span className="bg-gradient-to-r from-accent-300 to-fuchsia-400 bg-clip-text text-transparent">
                across every job.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-300">
              One workspace for every part of your life. Drop a spreadsheet
              into your day job, paste a quote into your class notes, and
              switch between them with one click.
            </p>
          </div>
          <ul className="mt-10 space-y-2 text-sm text-ink-300">
            <FeatureBullet icon="briefcase">
              Per-account vault — your files stay private to your login on
              this device.
            </FeatureBullet>
            <FeatureBullet icon="upload">
              Drag &amp; drop or paste anything; Docigo asks where it belongs.
            </FeatureBullet>
            <FeatureBullet icon="sheet">
              Beautiful in-app viewers for Excel, Word, PDFs, images, and notes.
            </FeatureBullet>
          </ul>
        </div>

        <div className="glass-strong rounded-2xl p-7 shadow-soft">
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <Icon name="logo" />
            <div className="font-display text-xl font-bold text-white">Docigo</div>
          </div>
          <div className="mb-1 font-display text-2xl font-bold tracking-tight text-white">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </div>
          <div className="mb-6 text-sm text-ink-300">
            {mode === 'signin'
              ? 'Sign in to access your private workspace.'
              : 'Tell us a little about you so we can save your work.'}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="label">First name</div>
                  <input
                    autoFocus
                    className="input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    placeholder="Alex"
                    required
                  />
                </div>
                <div>
                  <div className="label">Last name</div>
                  <input
                    className="input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    placeholder="Morgan"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <div className="label">Email</div>
              <input
                autoFocus={mode === 'signin'}
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="alex@example.com"
                required
              />
            </div>
            <div>
              <div className="label">Password</div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {mode === 'signup' && (
              <div>
                <div className="label">Confirm password</div>
                <input
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-200 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-white/[0.05] text-accent-500"
                checked={stay}
                onChange={(e) => setStay(e.target.checked)}
              />
              Keep me signed in on this device
            </label>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full justify-center py-2 text-sm font-semibold"
            >
              {busy ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  <Icon name="check" width={14} height={14} />
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-ink-400">
            {mode === 'signin' ? (
              <>
                New here?{' '}
                <button
                  className="font-medium text-accent-300 hover:text-accent-200"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  className="font-medium text-accent-300 hover:text-accent-200"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-500">
            <div className="h-px flex-1 bg-white/10" />
            or
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={continueAsGuest}
            className="btn-quiet w-full justify-center py-2 text-sm font-medium"
          >
            <Icon name="spark" width={14} height={14} />
            Continue without an account
          </button>

          <div className="mt-5 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs leading-relaxed text-ink-400">
            <span className="font-medium text-ink-200">Optional sign-in.</span>{' '}
            You can use Docigo right away — registering is only needed if you
            want to keep your work tied to an account so it’s waiting for you
            when you come back. Either way, files stay on this device and
            never leave your browser.
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBullet({
  icon,
  children,
}: {
  icon: 'briefcase' | 'upload' | 'sheet';
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-accent-300">
        <Icon name={icon} width={13} height={13} />
      </span>
      <span>{children}</span>
    </li>
  );
}
