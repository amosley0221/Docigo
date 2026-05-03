import { useEffect, useState } from 'react';
import { Icon } from './Icon';

const STORAGE_KEY = 'docigo:mac-install-banner-dismissed';

function isMacSafari(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  // Touch-capable Macs are iPads masquerading as desktop — exclude them so
  // the iOS Add-to-Home-Screen flow takes over there instead.
  const isMac = /Macintosh/.test(ua) && !('ontouchend' in document);
  if (!isMac) return false;
  // Only Safari supports "Add to Dock". Filter out Chrome, Firefox, Edge,
  // and the Safari-on-iOS browsers that share the substring.
  const isSafari =
    /Safari/.test(ua) &&
    !/Chrome/.test(ua) &&
    !/CriOS/.test(ua) &&
    !/FxiOS/.test(ua) &&
    !/Edg/.test(ua);
  if (!isSafari) return false;
  // Already running as a Dock app — don't nag.
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  return true;
}

export function MacInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isMacSafari()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // localStorage may be unavailable (private mode); fall through and show.
    }
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Ignore — the banner stays dismissed for this session regardless.
    }
  };

  return (
    <div className="glass flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-sm md:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon
          name="upload"
          width={16}
          height={16}
          className="shrink-0 text-accent-300"
        />
        <span className="min-w-0 truncate text-ink-200">
          <span className="font-medium text-white">
            Install Docigo as a Mac app.
          </span>{' '}
          <span className="hidden sm:inline">In Safari, choose </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-ink-100">
            File
          </span>
          <span className="mx-1 text-ink-400">→</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-ink-100">
            Add to Dock
          </span>
          <span className="hidden sm:inline">.</span>
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-ink-400 transition hover:bg-white/5 hover:text-white"
      >
        <Icon name="x" width={16} height={16} />
      </button>
    </div>
  );
}
