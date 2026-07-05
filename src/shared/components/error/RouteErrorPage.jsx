import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { RotateCcw, Home, AlertTriangle, Frown } from "lucide-react";

function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
            <Frown className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-6xl font-bold tracking-tight text-primary">404</h1>
          <h2 className="text-xl font-semibold">{error.data || "Page not found"}</h2>
          <p className="max-w-sm text-muted-foreground">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      );
    }

    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/15">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Error {error.status}</h1>
        <p className="max-w-md text-muted-foreground">
          {error.statusText || "Something went wrong while loading this page."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/15">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Unexpected Error</h1>
      <p className="max-w-md text-muted-foreground">Something went wrong. Please try again.</p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        <RotateCcw className="h-4 w-4" />
        Try Again
      </button>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-4 max-w-xl overflow-auto rounded-lg bg-muted p-4 text-left text-xs text-muted-foreground">
          {error?.message || "No error details available"}
          {"\n\n"}
          {error?.stack || ""}
        </pre>
      )}
    </div>
  );
}

export { RouteErrorPage };
