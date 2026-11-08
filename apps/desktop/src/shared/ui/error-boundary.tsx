import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  readonly children: ReactNode;
  readonly onError: (error: Error, info: ErrorInfo) => void;
};

type State = { readonly failed: boolean };

/** Catches render errors in one window and offers a reload. React requires a class here. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError(error, info);
  }

  override render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <main className="flex min-h-screen flex-col items-start gap-3 p-6">
        <h1 className="text-sm font-semibold">Something went wrong</h1>
        <p className="text-xs text-(--color-text-muted)">Details are in the ttime log file.</p>
        <button
          type="button"
          className="rounded-md bg-(--color-control) px-3 py-1.5 text-sm"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </button>
      </main>
    );
  }
}
