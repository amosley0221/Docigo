import { forwardRef, useState } from 'react';
import { Icon } from './Icon';

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** When true, password starts visible. Defaults to false. */
  initiallyVisible?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { className = '', initiallyVisible = false, ...rest },
    ref,
  ) {
    const [visible, setVisible] = useState(initiallyVisible);
    return (
      <div className="relative">
        <input
          {...rest}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`${className} pr-10`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-1.5 flex items-center justify-center rounded-md px-1.5 text-ink-400 transition hover:bg-white/[0.06] hover:text-white"
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} width={16} height={16} />
        </button>
      </div>
    );
  },
);
