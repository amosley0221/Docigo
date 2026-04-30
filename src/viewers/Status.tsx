import { Icon } from '../components/Icon';

export function ViewerError({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-300">
          <Icon name="x" />
        </div>
        <div className="font-medium text-white">Couldn’t open this file</div>
        <div className="mt-1 text-sm text-ink-400">{message}</div>
      </div>
    </div>
  );
}

export function ViewerLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-ink-400">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />
        {label}
      </div>
    </div>
  );
}
