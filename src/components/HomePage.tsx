import { useMemo } from 'react';
import { useStore } from '../state/store';
import { useAuth } from '../state/auth';
import { useUploader } from './UploaderContext';
import { Icon, type IconName } from './Icon';
import { humanSize } from '../lib/files';
import type { Item, ItemKind, LocationKind } from '../lib/types';

const ICON_FOR_KIND: Record<ItemKind, IconName> = {
  spreadsheet: 'sheet',
  document: 'doc',
  pdf: 'pdf',
  image: 'image',
  text: 'text',
  quote: 'quote',
  checklist: 'checklist',
  chart: 'chart-bar',
  unknown: 'folder',
};

const KIND_ICON: Record<LocationKind, IconName> = {
  work: 'briefcase',
  school: 'graduation',
  personal: 'home',
  project: 'spark',
  custom: 'folder',
};

export function HomePage() {
  const store = useStore();
  const { user } = useAuth();
  const { pickFiles } = useUploader();

  const stats = useMemo(() => {
    return {
      locations: store.locations.length,
      groups: store.groups.length,
      items: store.items.length,
    };
  }, [store.locations, store.groups, store.items]);

  const recent = useMemo(() => {
    return [...store.items]
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
      .slice(0, 6);
  }, [store.items]);

  const greeting = greetingFor(new Date());
  const firstName = user?.firstName?.trim() || user?.display?.split(' ')[0] || 'there';

  return (
    <div className="grid-bg h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
            <Icon
              name="sparkle"
              width={12}
              height={12}
              className="mr-1.5 inline-block align-middle"
            />
            Home
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-ink-300 md:text-base">
            Drop a file or paste a quote to capture it. Pick a location to dive
            in.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <Stat label="Locations" value={stats.locations} icon="briefcase" />
          <Stat label="Groups" value={stats.groups} icon="folder" />
          <Stat label="Items" value={stats.items} icon="doc" />
        </div>

        <DropZone onChooseFiles={pickFiles} />

        <section>
          <SectionHeader title="Locations" />
          {store.locations.length === 0 ? (
            <div className="glass rounded-xl px-4 py-3 text-sm text-ink-400">
              No locations yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {store.locations.map((loc) => {
                const groupCount = store.groupsInLocation(loc.id).length;
                const itemCount = store.items.filter(
                  (i) => i.locationId === loc.id,
                ).length;
                return (
                  <button
                    key={loc.id}
                    onClick={() => store.setActiveLocation(loc.id)}
                    className="glass group flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: `${loc.color}1f`,
                        color: loc.color,
                        boxShadow: `inset 0 0 0 1px ${loc.color}33`,
                      }}
                    >
                      <Icon name={KIND_ICON[loc.kind]} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-base font-semibold text-white">
                        {loc.name}
                      </div>
                      <div className="text-xs text-ink-400">
                        {groupCount} group{groupCount === 1 ? '' : 's'} ·{' '}
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <Icon
                      name="chevron-right"
                      width={14}
                      height={14}
                      className="text-ink-500 transition group-hover:text-accent-300"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {recent.length > 0 && (
          <section>
            <SectionHeader title="Recently added" />
            <div className="glass overflow-hidden rounded-xl">
              {recent.map((it, i) => (
                <RecentRow
                  key={it.id}
                  item={it}
                  isLast={i === recent.length - 1}
                  onOpen={() => {
                    store.setActiveLocation(it.locationId);
                    store.setActiveGroup(it.locationId, it.groupId);
                    store.setActiveItem(it.groupId, it.id);
                  }}
                  locationName={
                    store.locations.find((l) => l.id === it.locationId)?.name ?? ''
                  }
                  groupName={
                    store.groups.find((g) => g.id === it.groupId)?.name ?? ''
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Hey';
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: IconName;
}) {
  return (
    <div className="glass rounded-xl px-3 py-3 md:px-4 md:py-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        <Icon name={icon} width={11} height={11} />
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-extrabold text-white md:text-3xl">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
      {title}
    </div>
  );
}

function DropZone({ onChooseFiles }: { onChooseFiles: () => void }) {
  return (
    <div
      onClick={onChooseFiles}
      className="glass-strong group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-white/10 px-6 py-12 text-center transition hover:border-accent-500/40 hover:bg-white/[0.05] md:py-16"
      role="button"
      aria-label="Drop files or text here, or tap to choose files"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(420px 220px at 50% 0%, rgba(67,97,255,0.18), transparent 60%)',
        }}
      />
      <div className="relative">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/30 to-fuchsia-500/30 text-accent-100 ring-1 ring-accent-500/30">
          <Icon name="upload" width={26} height={26} />
        </div>
        <div className="mt-4 font-display text-xl font-bold tracking-tight text-white md:text-2xl">
          Drop something in
        </div>
        <div className="mx-auto mt-1.5 max-w-md text-sm text-ink-300">
          Drag or paste a file to upload it. Drag or paste text and Docigo
          captures it as a quote. We’ll ask where it lives.
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChooseFiles();
            }}
            className="btn-primary"
          >
            <Icon name="upload" width={14} height={14} />
            Choose files
          </button>
          <span className="text-xs text-ink-500">or paste with Cmd/Ctrl+V</span>
        </div>
      </div>
    </div>
  );
}

function RecentRow({
  item,
  isLast,
  onOpen,
  locationName,
  groupName,
}: {
  item: Item;
  isLast: boolean;
  onOpen: () => void;
  locationName: string;
  groupName: string;
}) {
  const subtitle =
    item.kind === 'quote'
      ? truncate(item.text, 80)
      : item.kind === 'checklist'
        ? `${item.entries.filter((e) => e.done).length} of ${item.entries.length} done`
        : item.kind === 'chart'
          ? `${item.chartType} chart · ${item.data.length} point${item.data.length === 1 ? '' : 's'}`
          : `${item.mime || item.kind} · ${humanSize(item.size)}`;
  return (
    <button
      onClick={onOpen}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] ${
        isLast ? '' : 'border-b border-white/5'
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-ink-200">
        <Icon name={ICON_FOR_KIND[item.kind]} width={14} height={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{item.name}</div>
        <div className="truncate text-xs text-ink-400">{subtitle}</div>
      </div>
      <div className="hidden shrink-0 text-right text-xs text-ink-500 sm:block">
        <div className="truncate">{locationName}</div>
        <div className="truncate text-ink-600">{groupName}</div>
      </div>
    </button>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s;
}
