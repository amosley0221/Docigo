import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { useAuth } from '../state/auth';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      title="Account settings"
      subtitle={`Signed in as ${user.email}`}
    >
      <div className="space-y-6">
        <ProfileSection />
        <Divider />
        <EmailSection />
        <Divider />
        <PasswordSection />
      </div>
    </Modal>
  );
}

function Divider() {
  return <div className="h-px w-full bg-white/5" />;
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <div className="font-display text-base font-semibold text-white">{title}</div>
        <div className="text-xs text-ink-400">{description}</div>
      </div>
      {children}
    </section>
  );
}

function StatusLine({
  status,
}: {
  status: { kind: 'idle' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string };
}) {
  if (status.kind === 'idle') return null;
  if (status.kind === 'ok') {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
        {status.message}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {status.message}
    </div>
  );
}

type Status =
  | { kind: 'idle' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

function ProfileSection() {
  const { user, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  const dirty =
    firstName.trim() !== (user?.firstName ?? '') ||
    lastName.trim() !== (user?.lastName ?? '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'idle' });
    setBusy(true);
    try {
      await updateProfile({ firstName, lastName });
      setStatus({ kind: 'ok', message: 'Profile updated.' });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not update profile',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell title="Profile" description="Your name as it appears in Docigo.">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">First name</div>
            <input
              className="input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
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
              required
            />
          </div>
        </div>
        <StatusLine status={status} />
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !dirty || !firstName.trim() || !lastName.trim()}
          >
            <Icon name="check" width={14} height={14} />
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </SectionShell>
  );
}

function EmailSection() {
  const { user, updateProfile } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    setEmail(user?.email ?? '');
  }, [user?.email]);

  const dirty = email.trim().toLowerCase() !== (user?.email?.toLowerCase() ?? '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'idle' });
    setBusy(true);
    try {
      await updateProfile({ email });
      setStatus({ kind: 'ok', message: 'Email updated.' });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not update email',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell
      title="Email"
      description="Used to sign in. Must be unique on this device."
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="label">Email</div>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <StatusLine status={status} />
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !dirty || !email.trim()}
          >
            <Icon name="check" width={14} height={14} />
            {busy ? 'Saving…' : 'Save email'}
          </button>
        </div>
      </form>
    </SectionShell>
  );
}

function PasswordSection() {
  const { changePassword } = useAuth();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'idle' });
    if (next !== confirm) {
      setStatus({ kind: 'error', message: 'New passwords don’t match' });
      return;
    }
    if (next.length < 6) {
      setStatus({
        kind: 'error',
        message: 'New password must be at least 6 characters',
      });
      return;
    }
    setBusy(true);
    try {
      await changePassword(next);
      setNext('');
      setConfirm('');
      setStatus({ kind: 'ok', message: 'Password updated.' });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not change password',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell
      title="Password"
      description="Set a new password. You'll stay signed in on this device."
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">New password</div>
            <input
              type="password"
              className="input"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div>
            <div className="label">Confirm new password</div>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
        </div>
        <StatusLine status={status} />
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !next || !confirm}
          >
            <Icon name="check" width={14} height={14} />
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </SectionShell>
  );
}
