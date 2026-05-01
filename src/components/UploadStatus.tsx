import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface UploadTask {
  id: string;
  name: string;
  state: 'uploading' | 'done' | 'error';
  message?: string;
  startedAt: number;
  finishedAt?: number;
}

interface UploadStatusApi {
  start: (name: string) => string;
  succeed: (id: string) => void;
  fail: (id: string, message?: string) => void;
}

const Ctx = createContext<UploadStatusApi | null>(null);

const FLASH_MS = 2400;

export function UploadStatusProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const start = useCallback((name: string) => {
    const id = crypto.randomUUID();
    setTasks((prev) => [
      ...prev,
      { id, name, state: 'uploading', startedAt: Date.now() },
    ]);
    return id;
  }, []);

  const succeed = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, state: 'done', finishedAt: Date.now() } : t,
      ),
    );
    window.setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }, FLASH_MS);
  }, []);

  const fail = useCallback((id: string, message?: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, state: 'error', message, finishedAt: Date.now() }
          : t,
      ),
    );
    window.setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }, FLASH_MS * 2);
  }, []);

  const api = useMemo<UploadStatusApi>(
    () => ({ start, succeed, fail }),
    [start, succeed, fail],
  );

  const uploading = tasks.filter((t) => t.state === 'uploading');
  const recentlyDone = tasks.filter((t) => t.state === 'done');
  const recentlyFailed = tasks.filter((t) => t.state === 'error');
  const visible = tasks.length > 0;

  return (
    <Ctx.Provider value={api}>
      {children}
      {visible && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-32px)] flex-col gap-2 md:max-w-sm">
          {uploading.length > 0 && (
            <Toast
              tone="busy"
              title={
                uploading.length === 1
                  ? `Uploading ${uploading[0].name}…`
                  : `Uploading ${uploading.length} files…`
              }
              subtitle={
                uploading.length > 1
                  ? uploading.map((t) => t.name).slice(0, 2).join(', ') +
                    (uploading.length > 2 ? `, +${uploading.length - 2} more` : '')
                  : undefined
              }
            />
          )}
          {recentlyDone.map((t) => (
            <Toast
              key={t.id}
              tone="ok"
              title={`${t.name} uploaded`}
            />
          ))}
          {recentlyFailed.map((t) => (
            <Toast
              key={t.id}
              tone="error"
              title={`${t.name} didn’t upload`}
              subtitle={t.message}
            />
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}

function Toast({
  tone,
  title,
  subtitle,
}: {
  tone: 'busy' | 'ok' | 'error';
  title: string;
  subtitle?: string;
}) {
  const ring =
    tone === 'busy'
      ? 'border-accent-500/40'
      : tone === 'ok'
        ? 'border-emerald-500/40'
        : 'border-red-500/40';
  const dot =
    tone === 'busy'
      ? 'bg-accent-400 animate-pulse'
      : tone === 'ok'
        ? 'bg-emerald-400'
        : 'bg-red-400';
  return (
    <div
      className={`glass-strong pointer-events-auto flex items-start gap-3 rounded-xl border ${ring} px-3 py-2.5 shadow-soft`}
    >
      <span
        className={`mt-1 flex h-2 w-2 shrink-0 rounded-full ${dot}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{title}</div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[11px] text-ink-300">
            {subtitle}
          </div>
        )}
      </div>
      {tone === 'ok' && (
        <Icon
          name="check"
          width={14}
          height={14}
          className="mt-0.5 text-emerald-300"
        />
      )}
    </div>
  );
}

export function useUploadStatus(): UploadStatusApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUploadStatus must be used inside UploadStatusProvider');
  return ctx;
}
