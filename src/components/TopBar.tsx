import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { useStore } from '../state/store';
import type { LocationKind } from '../lib/types';
import { useAuth } from '../state/auth';
import { SettingsModal } from './SettingsModal';
import { SearchBar } from './SearchBar';

const KIND_ICON: Record<LocationKind, IconName> = {
  work: 'briefcase',
  school: 'graduation',
  personal: 'home',
  project: 'spark',
  custom: 'folder',
};

interface TopBarProps {
  sidebarCollapsed: boolean;
  onOpenSidebar: () => void;
}

export function TopBar({ sidebarCollapsed, onOpenSidebar }: TopBarProps) {
  const store = useStore();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const active = store.locations.find((l) => l.id === store.activeLocationId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!userOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [userOpen]);

  return (
    <header className="flex items-center gap-2 border-b border-white/5 bg-black/30 px-2.5 py-2 md:px-4 md:py-2.5">
      {sidebarCollapsed && (
        <button
          className="rounded-md p-1.5 text-ink-200 hover:bg-white/10 hover:text-white"
          onClick={onOpenSidebar}
          title="Open menu"
        >
          <Icon name="menu" />
        </button>
      )}

      <div className="relative min-w-0 flex-1 md:flex-none" ref={ref}>
        <button
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm font-medium text-white transition hover:bg-white/[0.08] md:w-auto md:gap-2.5 md:px-2.5"
          onClick={() => setOpen((v) => !v)}
        >
          {store.viewMode === 'home' ? (
            <>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent-500/30 to-fuchsia-500/30 text-accent-200 ring-1 ring-accent-500/30">
                <Icon name="home" width={13} height={13} />
              </span>
              <span className="min-w-0 flex-1 truncate text-left md:max-w-[180px] md:flex-none">
                Home
              </span>
            </>
          ) : active ? (
            <>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{ background: `${active.color}1f`, color: active.color }}
              >
                <Icon name={KIND_ICON[active.kind]} width={13} height={13} />
              </span>
              <span className="min-w-0 flex-1 truncate text-left md:max-w-[180px] md:flex-none">
                {active.name}
              </span>
            </>
          ) : (
            <span className="text-ink-300">Pick a location</span>
          )}
          <Icon name="chevron-down" width={14} height={14} className="shrink-0 text-ink-300" />
        </button>
        {open && (
          <div className="glass-strong absolute left-0 top-[calc(100%+6px)] z-40 w-72 overflow-hidden rounded-xl shadow-soft">
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Switch location
            </div>
            <div className="px-1 pb-1">
              <button
                onClick={() => {
                  store.goHome();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                  store.viewMode === 'home'
                    ? 'bg-white/10 text-white'
                    : 'text-ink-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-500/30 to-fuchsia-500/30 text-accent-200 ring-1 ring-accent-500/30">
                  <Icon name="home" width={14} height={14} />
                </span>
                <span className="flex-1 truncate font-medium">Home</span>
                {store.viewMode === 'home' && (
                  <Icon name="check" width={14} height={14} className="text-accent-300" />
                )}
              </button>
            </div>
            <div className="border-t border-white/5" />
            <div className="max-h-72 overflow-y-auto p-1">
              {store.locations.map((loc) => {
                const isActive =
                  store.viewMode === 'location' && loc.id === store.activeLocationId;
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      store.setActiveLocation(loc.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-ink-200 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{ background: `${loc.color}1f`, color: loc.color }}
                    >
                      <Icon name={KIND_ICON[loc.kind]} width={14} height={14} />
                    </span>
                    <span className="flex-1 truncate font-medium">{loc.name}</span>
                    {isActive && (
                      <Icon name="check" width={14} height={14} className="text-accent-300" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-white/5 p-1.5">
              <button
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                onClick={() => {
                  setOpen(false);
                  // Open the sidebar so the user can use New Location button
                  onOpenSidebar();
                }}
              >
                <Icon name="plus" width={14} height={14} />
                Manage locations
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ml-2 hidden items-center gap-2 text-xs text-ink-400 lg:flex">
        {active && (
          <>
            <span className="chip">
              <Icon name="folder" width={12} height={12} />
              {store.groupsInLocation(active.id).length} groups
            </span>
            <span className="chip">
              <Icon name="doc" width={12} height={12} />
              {store.items.filter((i) => i.locationId === active.id).length} items
            </span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3 text-xs text-ink-400">
        <SearchBar />

        <div className="relative" ref={userRef}>
          <button
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            onClick={() => setUserOpen((v) => !v)}
            title={user?.display ?? 'Guest'}
          >
            {user && (
              <>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-fuchsia-500 text-[11px] font-bold text-white">
                  {initialsFor(user.firstName, user.lastName)}
                </span>
                <span className="hidden max-w-[140px] truncate md:inline">
                  {user.display}
                </span>
              </>
            )}
            <Icon
              name="chevron-down"
              width={13}
              height={13}
              className="hidden shrink-0 text-ink-300 md:block"
            />
          </button>
          {userOpen && (
            <div className="glass-strong absolute right-0 top-[calc(100%+6px)] z-40 w-72 overflow-hidden rounded-xl shadow-soft">
              <div className="border-b border-white/5 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Signed in
                </div>
                <div className="mt-0.5 truncate font-medium text-white">
                  {user?.display}
                </div>
                <div className="truncate text-xs text-ink-400">{user?.email}</div>
              </div>
              <div className="p-1">
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                  onClick={() => {
                    setUserOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  <Icon name="edit" width={14} height={14} />
                  Account settings
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                  onClick={() => {
                    setUserOpen(false);
                    void signOut();
                  }}
                >
                  <Icon name="x" width={14} height={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}

function initialsFor(first: string, last: string): string {
  const a = first?.trim()?.[0] ?? '';
  const b = last?.trim()?.[0] ?? '';
  return `${a}${b}`.toUpperCase() || '?';
}

