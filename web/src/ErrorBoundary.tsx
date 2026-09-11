import { Component, type ErrorInfo, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?:
    | ReactNode
    | ((props: { error: Error; reset: () => void }) => ReactNode);
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (typeof fallback === "function") {
        return fallback({ error, reset: this.handleReset });
      }
      if (fallback) {
        return fallback;
      }

      return (
        <div className="error-fallback">
          <div className="card">
            <div className="pill no" style={{ marginBottom: 14 }}>
              Application Error
            </div>
            <h2>Something went wrong</h2>
            <p>
              A client error occurred while rendering the page. This is usually
              caused by unexpected contract simulation data or temporary network issues.
            </p>
            <pre className="error-details">
              {error.message || String(error)}
            </pre>
            <div className="error-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleReload}
              >
                Reload application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
