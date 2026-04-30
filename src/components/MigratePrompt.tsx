import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import {
  findLocalWorkspaces,
  pushWorkspaceToCloud,
  summarizeWorkspace,
  type findLocalWorkspaces as _F,
} from '../lib/migrate';
import { useAuth } from '../state/auth';
import { useStore } from '../state/store';

type Workspaces = Awaited<ReturnType<typeof _F>>;

const DISMISSED_KEY = 'docigo.migrate.dismissed.v1';

export function MigratePrompt() {
  const { user } = useAuth();
  const store = useStore();
  const [workspaces, setWorkspaces] = useState<Workspaces | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(DISMISSED_KEY) === user.id) return;
    let cancelled = false;
    findLocalWorkspaces().then((ws) => {
      if (cancelled) return;
      if (ws.length === 0) {
        // Mark dismissed so we don't keep scanning every session.
        localStorage.setItem(DISMISSED_KEY, user.id);
        return;
      }
      setWorkspaces(ws);
      setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const dismiss = () => {
    if (user) localStorage.setItem(DISMISSED_KEY, user.id);
    setOpen(false);
  };

  const push = async () => {
    if (!user || !workspaces) return;
    setBusy(true);
    setError(null);
    try {
      for (const ws of workspaces) {
        await pushWorkspaceToCloud(user.id, ws, (p) => {
          setProgress(`${p.stage}: ${p.done} / ${p.total}`);
        });
      }
      setProgress('Done — refreshing your workspace…');
      await store.refresh();
      dismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setBusy(false);
    }
  };

  if (!open || !workspaces || workspaces.length === 0) return null;

  const total = workspaces.reduce(
    (acc, w) => {
      const s = summarizeWorkspace(w);
      acc.locations += s.locations;
      acc.groups += s.groups;
      acc.items += s.items;
      acc.files += s.files;
      return acc;
    },
    { locations: 0, groups: 0, items: 0, files: 0 },
  );

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="We found local data on this device"
      subtitle="Push it up to your account so it's available on your other devices?"
      width={520}
      footer={
        <>
          <button className="btn-ghost" disabled={busy} onClick={dismiss}>
            Not now
          </button>
          <button className="btn-primary" disabled={busy} onClick={push}>
            <Icon name="upload" width={14} height={14} />
            {busy ? 'Pushing…' : 'Push to cloud'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Locations" value={total.locations} />
            <Stat label="Groups" value={total.groups} />
            <Stat label="Items" value={total.items} />
            <Stat label="Files" value={total.files} />
          </div>
        </div>
        <p className="text-sm text-ink-300">
          The local copy will be cleared once everything is in the cloud.
          Files larger than the storage limit may be skipped.
        </p>
        {progress && (
          <div className="rounded-lg border border-accent-500/30 bg-accent-500/10 px-3 py-2 text-sm text-accent-100">
            {progress}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="font-display text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
