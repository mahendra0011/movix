import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { store } from "@/app/store";
import appCss from "../../styles.css?url";
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BookMyScreen" },
      { name: "description", content: "Book movie tickets, pick seats, and confirm e-tickets." },
      { name: "author", content: "BookMyScreen" },
      { property: "og:title", content: "BookMyScreen" },
      {
        property: "og:description",
        content: "Book movie tickets, pick seats, and confirm e-tickets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@BookMyScreen" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootShell({ children }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
import { Navbar } from "@/shared/components/layout/Navbar";
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground">
          <Navbar />
          <Outlet />
          <footer className="mt-20 border-t border-border/60 bg-card/30">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight">
                  book<span className="text-primary">my</span>screen
                </h3>
                <p className="mt-3 text-xs text-muted-foreground">
                  The cinematic way to book movies, events, plays & sports - all in one place.
                </p>
              </div>
              {[
                { title: "Movies", links: ["Now showing", "Coming soon", "Premieres", "Cinemas"] },
                { title: "Help", links: ["Contact us", "FAQs", "Refunds", "Terms"] },
                { title: "Company", links: ["About", "Careers", "Press", "Partners"] },
              ].map((col) => (
                <div key={col.title}>
                  <h4 className="text-sm font-semibold">{col.title}</h4>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {col.links.map((l) => (
                      <li key={l}>
                        <a href="#" className="hover:text-foreground">
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
              (c) 2026 BookMyScreen. All rights reserved.
            </div>
          </footer>
        </div>
      </QueryClientProvider>
    </Provider>
  );
}
export { Route };
