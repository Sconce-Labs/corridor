import { Component, type ErrorInfo, type ReactNode } from "react";

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  if (error !== null && typeof error === "object") {
    if (
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return new Error((error as { message: string }).message);
    }
    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error(String(error));
    }
  }
  return new Error(error ? String(error) : "An unexpected error occurred.");
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?:
    | ReactNode
    | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
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

  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error: toError(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.props.onError?.(toError(error), errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      const activeError = error ?? new Error("An unexpected error occurred.");

      if (typeof fallback === "function") {
        return fallback({ error: activeError, reset: this.handleReset });
      }
      if (fallback !== undefined) {
        return fallback;
      }

      return (
        <div className="error-fallback">
          <div
            className="card"
            role="alert"
            aria-labelledby="error-boundary-title"
            aria-describedby="error-boundary-desc"
          >
            <div className="pill no" aria-hidden="true">
              Application Error
            </div>
            <h2 id="error-boundary-title">Something went wrong</h2>
            <p id="error-boundary-desc">
              A client-side component failed while rendering the page. Reload
              the application to try again.
            </p>
            <pre
              className="error-details"
              tabIndex={0}
              aria-label="Error details"
            >
              {activeError.message || String(activeError)}
            </pre>
            <div className="error-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={this.handleReset}
              >
                Try again
              </button>
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
