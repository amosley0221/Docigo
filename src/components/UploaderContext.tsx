import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

interface UploaderApi {
  /** Pushes files into the assignment queue (same path as drag/drop). */
  addFiles: (files: File[]) => void;
  /** Opens the OS file picker; selected files are auto-queued. */
  pickFiles: () => void;
}

const Ctx = createContext<UploaderApi | null>(null);

interface ProviderProps {
  children: ReactNode;
  onFiles: (files: File[]) => void;
}

export function UploaderProvider({ children, onFiles }: ProviderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  const pickFiles = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const value = useMemo<UploaderApi>(
    () => ({ addFiles, pickFiles }),
    [addFiles, pickFiles],
  );

  return (
    <Ctx.Provider value={value}>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) addFiles(files);
          // Reset so the same file can be picked twice in a row.
          e.target.value = '';
        }}
      />
      {children}
    </Ctx.Provider>
  );
}

export function useUploader(): UploaderApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUploader must be used inside UploaderProvider');
  return ctx;
}
