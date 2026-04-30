import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('Docigo crashed:', error, info);
  }

  reset = () => this.setState({ error: null });

  reload = () => window.location.reload();

  resetData = async () => {
    const proceed = window.confirm(
      "This will clear Docigo's local storage on this browser. Files and accounts saved here will be removed. Continue?",
    );
    if (!proceed) return;
    try {
      const dbs = (await indexedDB.databases?.()) ?? [];
      for (const d of dbs) {
        if (d.name) indexedDB.deleteDatabase(d.name);
      }
    } catch {
      // best effort
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid-bg flex h-full items-center justify-center p-6">
        <div className="glass-strong max-w-lg rounded-2xl p-7 text-center shadow-soft">
          <div className="font-display text-2xl font-bold text-white">
            Something went sideways.
          </div>
          <div className="mt-2 text-sm text-ink-300">
            Docigo hit an unexpected error and couldn’t finish loading.
          </div>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-white/5 bg-black/40 p-3 text-left text-[11px] text-ink-200">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button className="btn-quiet" onClick={this.reset}>
              Try again
            </button>
            <button className="btn-quiet" onClick={this.reload}>
              Reload page
            </button>
            <button
              className="btn-quiet text-red-300 hover:bg-red-500/10 hover:text-red-200"
              onClick={this.resetData}
            >
              Reset local data
            </button>
          </div>
        </div>
      </div>
    );
  }
}
