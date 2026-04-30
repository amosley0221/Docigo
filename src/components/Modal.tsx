import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 480,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong relative max-h-[88vh] w-[92vw] overflow-hidden rounded-2xl shadow-soft"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="x" />
        </button>
        {(title || subtitle) && (
          <div className="border-b border-white/5 px-6 pb-4 pt-5">
            {title && (
              <div className="font-display text-lg font-semibold text-white">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mt-0.5 text-sm text-ink-300">{subtitle}</div>
            )}
          </div>
        )}
        <div className="max-h-[64vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-white/5 bg-black/20 px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
