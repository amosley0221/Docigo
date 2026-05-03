import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

export type IconName =
  | 'menu'
  | 'plus'
  | 'briefcase'
  | 'graduation'
  | 'home'
  | 'spark'
  | 'folder'
  | 'sheet'
  | 'doc'
  | 'pdf'
  | 'image'
  | 'text'
  | 'quote'
  | 'upload'
  | 'chevron-down'
  | 'chevron-right'
  | 'x'
  | 'search'
  | 'trash'
  | 'edit'
  | 'check'
  | 'logo'
  | 'sparkle'
  | 'checklist'
  | 'chart'
  | 'chart-bar'
  | 'chart-line'
  | 'chart-pie'
  | 'eye'
  | 'eye-off'
  | 'star'
  | 'star-filled';

export function Icon({ name, ...props }: IconProps) {
  const common = {
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
  };
  switch (name) {
    case 'menu':
      return (
        <svg {...common} {...props}>
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common} {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg {...common} {...props}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
        </svg>
      );
    case 'graduation':
      return (
        <svg {...common} {...props}>
          <path d="M2 9l10-4 10 4-10 4L2 9z" />
          <path d="M6 11v4c2 2 10 2 12 0v-4" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common} {...props}>
          <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-9z" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common} {...props}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...common} {...props}>
          <path d="M12 3l1.8 4.8L18 9l-4.2 1.2L12 15l-1.8-4.8L6 9l4.2-1.2L12 3zM18 14l.9 2.4L21 17l-2.1.6L18 20l-.9-2.4L15 17l2.1-.6L18 14z" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...common} {...props}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
    case 'sheet':
      return (
        <svg {...common} {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M3 14h18M9 4v16M15 4v16" />
        </svg>
      );
    case 'doc':
      return (
        <svg {...common} {...props}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
          <path d="M14 3v6h6M8 13h8M8 17h6" />
        </svg>
      );
    case 'pdf':
      return (
        <svg {...common} {...props}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
          <path d="M14 3v6h6" />
          <path d="M9 14h1.5a1.5 1.5 0 0 1 0 3H9v-3zM14 14v3M14 14h2M14 16h1.5" />
        </svg>
      );
    case 'image':
      return (
        <svg {...common} {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="M21 16l-5-5-9 9" />
        </svg>
      );
    case 'text':
      return (
        <svg {...common} {...props}>
          <path d="M5 6h14M5 12h14M5 18h9" />
        </svg>
      );
    case 'quote':
      return (
        <svg {...common} {...props}>
          <path d="M7 7h4v6H7zM13 7h4v6h-4zM7 13c0 3-2 4-4 4M17 13c0 3-2 4-4 4" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common} {...props}>
          <path d="M12 16V4M6 10l6-6 6 6M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common} {...props}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common} {...props}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common} {...props}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common} {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common} {...props}>
          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common} {...props}>
          <path d="M4 20h4l11-11-4-4L4 16v4zM14 6l4 4" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} {...props}>
          <path d="M5 12l5 5L20 7" />
        </svg>
      );
    case 'checklist':
      return (
        <svg {...common} {...props}>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <path d="M3 5l1.5 1.5L7 4M3 11l1.5 1.5L7 10M3 17l1.5 1.5L7 16" />
        </svg>
      );
    case 'chart':
    case 'chart-bar':
      return (
        <svg {...common} {...props}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case 'chart-line':
      return (
        <svg {...common} {...props}>
          <path d="M3 17l5-6 4 4 8-9M22 20H2" />
        </svg>
      );
    case 'chart-pie':
      return (
        <svg {...common} {...props}>
          <path d="M21 12a9 9 0 1 1-9-9v9h9z" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common} {...props}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'eye-off':
      return (
        <svg {...common} {...props}>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17.3 17.3 0 0 1-3.3 4.1M6.6 6.6A17.5 17.5 0 0 0 2 12s3.5 6 10 6a10 10 0 0 0 4-.8" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common} {...props}>
          <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L12 3.5z" />
        </svg>
      );
    case 'star-filled':
      return (
        <svg {...common} {...props} fill="currentColor">
          <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L12 3.5z" />
        </svg>
      );
    case 'logo':
      return (
        <svg width={22} height={22} viewBox="0 0 32 32" fill="none" {...props}>
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6788ff" />
              <stop offset="1" stopColor="#aa3bff" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#lg1)" />
          <path
            d="M10 9h7a7 7 0 0 1 0 14h-7V9zm4 4v6h3a3 3 0 1 0 0-6h-3z"
            fill="white"
          />
        </svg>
      );
  }
}
