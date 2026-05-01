import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';

export interface ConfirmOptions {
  title?: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<ConfirmApi | null>(null);

interface PendingState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const pendingRef = useRef<PendingState | null>(null);
  pendingRef.current = pending;

  const confirm = useCallback<ConfirmApi['confirm']>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    const p = pendingRef.current;
    if (p) p.resolve(result);
    setPending(null);
  }, []);

  const value = useMemo<ConfirmApi>(() => ({ confirm }), [confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal
        open={!!pending}
        onClose={() => close(false)}
        title={pending?.title ?? 'Confirm'}
        width={420}
        footer={
          <>
            <button className="btn-ghost" onClick={() => close(false)}>
              {pending?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              className={
                pending?.destructive
                  ? 'btn inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-400 active:bg-red-600'
                  : 'btn-primary'
              }
              autoFocus
              onClick={() => close(true)}
            >
              <Icon
                name={pending?.destructive ? 'trash' : 'check'}
                width={14}
                height={14}
              />
              {pending?.confirmLabel ??
                (pending?.destructive ? 'Delete' : 'Confirm')}
            </button>
          </>
        }
      >
        <div className="text-sm text-ink-200">{pending?.message}</div>
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx.confirm;
}
