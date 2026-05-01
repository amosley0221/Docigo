import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Workspace } from './components/Workspace';
import { StoreProvider, useStore } from './state/store';
import { AssignModal, inferPendingFromFile, type Pending } from './components/AssignModal';
import { DuplicateModal } from './components/DuplicateModal';
import { Icon } from './components/Icon';
import { nextUniqueName } from './lib/files';
import type { Item } from './lib/types';
import { AuthProvider, useAuth } from './state/auth';
import { AuthScreen } from './components/AuthScreen';
import { MigratePrompt } from './components/MigratePrompt';
import { useIsMobile } from './lib/useMediaQuery';
import { UploaderProvider } from './components/UploaderContext';
import { ConfirmProvider } from './components/ConfirmProvider';
import { UploadStatusProvider, useUploadStatus } from './components/UploadStatus';

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <UploadStatusProvider>
          <AuthGate />
        </UploadStatusProvider>
      </ConfirmProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, hydrated } = useAuth();
  if (!hydrated) {
    return (
      <div className="grid-bg flex h-full items-center justify-center text-sm text-ink-400">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />
          Loading…
        </div>
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  return (
    <StoreProvider key={user.id} userId={user.id}>
      <Shell />
      <MigratePrompt />
    </StoreProvider>
  );
}

interface DuplicateState {
  existing: Item;
  file: File;
  target: { locationId: string; groupId: string };
}

function Shell() {
  const store = useStore();
  const isMobile = useIsMobile();
  const uploadStatus = useUploadStatus();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  // Auto-collapse when screen becomes mobile.
  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [dropOverlay, setDropOverlay] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateState | null>(null);
  const [batchTarget, setBatchTarget] = useState<{
    locationId: string;
    groupId: string;
  } | null>(null);
  const dragDepth = useRef(0);

  const current = queue[0] ?? null;
  const fileQueueLength = useMemo(
    () => queue.filter((p) => p.kind === 'file').length,
    [queue],
  );

  // Listen for files dropped anywhere
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer || !hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDropOverlay(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer || !hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer || !hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDropOverlay(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDropOverlay(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length) {
        setQueue((q) => [...q, ...files.map((f) => inferPendingFromFile(f))]);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // Listen for paste -> quote
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Don't intercept pastes into editable controls.
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          (t as HTMLElement).isContentEditable
        ) {
          return;
        }
      }
      if (!e.clipboardData) return;
      const files = Array.from(e.clipboardData.files ?? []);
      if (files.length) {
        e.preventDefault();
        setQueue((q) => [...q, ...files.map((f) => inferPendingFromFile(f))]);
        return;
      }
      const text = e.clipboardData.getData('text/plain');
      if (text && text.trim().length > 0) {
        e.preventDefault();
        const trimmed = text.trim();
        setQueue((q) => [
          ...q,
          {
            kind: 'quote',
            text: trimmed,
            preview:
              trimmed.length > 280 ? `${trimmed.slice(0, 277)}…` : trimmed,
          },
        ]);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const closeCurrent = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  const processFileWithTarget = useCallback(
    async (
      pending: Pending,
      target: { locationId: string; groupId: string },
    ) => {
      if (pending.kind === 'quote') {
        await store.addQuote(pending.text, target);
        closeCurrent();
        return;
      }
      const existing = store.items.find(
        (i) => i.groupId === target.groupId && i.name === pending.file.name,
      );
      if (existing) {
        setDuplicate({ existing, file: pending.file, target });
        return;
      }
      const taskId = uploadStatus.start(pending.file.name);
      try {
        await store.addFile(pending.file, target);
        uploadStatus.succeed(taskId);
      } catch (err) {
        uploadStatus.fail(
          taskId,
          err instanceof Error ? err.message : 'Upload failed',
        );
      } finally {
        closeCurrent();
      }
    },
    [store, closeCurrent, uploadStatus],
  );

  const handleAssign = useCallback(
    async (
      target: { locationId: string; groupId: string },
      options?: { applyToAll?: boolean },
    ) => {
      if (!current) return;
      if (options?.applyToAll && current.kind === 'file') {
        setBatchTarget(target);
      }
      await processFileWithTarget(current, target);
    },
    [current, processFileWithTarget],
  );

  // When a batch target is set, drain remaining file pendings to that target.
  useEffect(() => {
    if (!batchTarget) return;
    if (!current) {
      setBatchTarget(null);
      return;
    }
    if (duplicate) return; // wait for user resolution
    if (current.kind !== 'file') {
      // Hand control back to the modal for non-file items (quotes).
      setBatchTarget(null);
      return;
    }
    void processFileWithTarget(current, batchTarget);
  }, [batchTarget, current, duplicate, processFileWithTarget]);

  const suggestedRename = useMemo(() => {
    if (!duplicate) return '';
    const taken = new Set(
      store.items
        .filter((i) => i.groupId === duplicate.target.groupId)
        .map((i) => i.name),
    );
    return nextUniqueName(duplicate.file.name, taken);
  }, [duplicate, store.items]);

  return (
    <UploaderProvider
      onFiles={(files) =>
        setQueue((q) => [...q, ...files.map((f) => inferPendingFromFile(f))])
      }
    >
    <div className="grid-bg flex h-full">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onCollapse={() => setCollapsed(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          sidebarCollapsed={collapsed}
          onOpenSidebar={() => setCollapsed(false)}
        />
        <div className="min-h-0 flex-1">
          <Workspace />
        </div>
      </div>

      {dropOverlay && <DropOverlay />}

      <AssignModal
        open={!!current && !batchTarget}
        pending={current}
        fileQueueLength={fileQueueLength}
        onClose={() => {
          setBatchTarget(null);
          closeCurrent();
        }}
        onAssign={handleAssign}
      />

      <DuplicateModal
        open={!!duplicate}
        existing={duplicate?.existing ?? null}
        incoming={
          duplicate
            ? {
                name: duplicate.file.name,
                size: duplicate.file.size,
                mime: duplicate.file.type,
              }
            : null
        }
        suggestedName={suggestedRename}
        onCancel={() => {
          setDuplicate(null);
          setBatchTarget(null);
        }}
        onReplace={async () => {
          if (!duplicate) return;
          const taskId = uploadStatus.start(duplicate.file.name);
          try {
            await store.addFile(duplicate.file, duplicate.target, {
              replaceItemId: duplicate.existing.id,
            });
            uploadStatus.succeed(taskId);
          } catch (err) {
            uploadStatus.fail(
              taskId,
              err instanceof Error ? err.message : 'Upload failed',
            );
          } finally {
            setDuplicate(null);
            closeCurrent();
          }
        }}
        onRename={async (newName) => {
          if (!duplicate) return;
          const taskId = uploadStatus.start(newName);
          try {
            await store.addFile(duplicate.file, duplicate.target, {
              renameTo: newName,
            });
            uploadStatus.succeed(taskId);
          } catch (err) {
            uploadStatus.fail(
              taskId,
              err instanceof Error ? err.message : 'Upload failed',
            );
          } finally {
            setDuplicate(null);
            closeCurrent();
          }
        }}
      />
    </div>
    </UploaderProvider>
  );
}

function hasFiles(dt: DataTransfer) {
  if (dt.types) {
    for (let i = 0; i < dt.types.length; i++) {
      if (dt.types[i] === 'Files') return true;
    }
  }
  return false;
}

function DropOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass-strong flex flex-col items-center gap-3 rounded-2xl px-10 py-8 shadow-glow">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/20 text-accent-200">
          <Icon name="upload" width={26} height={26} />
        </div>
        <div className="font-display text-xl font-bold text-white">Drop to organize</div>
        <div className="text-sm text-ink-300">
          We’ll ask where this should live.
        </div>
      </div>
    </div>
  );
}
