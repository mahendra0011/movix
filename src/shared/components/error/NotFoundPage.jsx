import { Link } from "react-router-dom";
import { Home, SearchX } from "lucide-react";

function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-6xl font-bold tracking-tight text-primary">404</h1>
      <h2 className="text-xl font-semibold">Page not found</h2>
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

export { NotFoundPage };
