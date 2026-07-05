import { Component } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="max-w-md text-muted-foreground">
            An unexpected error occurred. You can try again or head back home.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Go Home
            </a>
          </div>
          {this.props.showError && process.env.NODE_ENV === "development" && (
            <pre className="mt-4 max-w-xl overflow-auto rounded-lg bg-muted p-4 text-left text-xs text-muted-foreground">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };
