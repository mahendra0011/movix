import { Suspense } from "react";
import { Provider } from "react-redux";
import { Outlet, Link } from "react-router-dom";
import { Film, MonitorSmartphone, Loader2 } from "lucide-react";
import { store } from "@/app/store";
import { Navbar } from "@/shared/components/layout/Navbar";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { OfflineIndicator } from "@/shared/components/error/OfflineIndicator";
import { Toaster } from "@/shared/components/ui/sonner";

const footerColumns = [
  {
    title: "Movies",
    links: [
      { label: "Now showing", to: "/" },
      { label: "Coming soon", to: "/coming-soon" },
      { label: "Cinemas", to: "/" },
      { label: "Offers", to: "/offers" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Contact us", to: "/dashboard" },
      { label: "FAQs", to: "/dashboard" },
      { label: "Refunds", to: "/dashboard" },
      { label: "Terms", to: "/auth" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Press", to: "/" },
      { label: "Partners", to: "/admin" },
    ],
  },
];

const socialLinks = ["ig", "fb", "x", "yt"];

const appBadges = [
  { label: "Download on the", store: "App Store" },
  { label: "Get it on", store: "Google Play" },
];

function RootLayout() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background text-foreground">
          <OfflineIndicator />
          <Navbar />
          <Suspense
            fallback={
              <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <div className="animate-in fade-in duration-300">
              <Outlet />
            </div>
          </Suspense>
          <footer className="border-t border-border/60 bg-card/45">
            <div className="mx-auto grid max-w-[1560px] gap-6 px-4 py-7 sm:px-5 md:grid-cols-[1.35fr_repeat(3,0.72fr)_1.1fr] lg:px-6">
              <div>
                <Link to="/" className="inline-flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                    <Film className="h-4 w-4" />
                  </span>
                  <span className="text-lg font-bold tracking-tight">
                    mov<span className="text-primary">i</span>x
                  </span>
                </Link>
                <p className="mt-3 max-w-56 text-sm leading-5 text-muted-foreground">
                  The cinematic way to book movies with ease.
                </p>
                <div className="mt-4 flex gap-2">
                  {socialLinks.map((item) => (
                    <a
                      key={item}
                      href="#"
                      className="grid h-9 w-9 place-items-center rounded-md border border-border/70 bg-background/70 text-xs font-bold uppercase text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {item}
                    </a>
                  ))}
                </div>
              </div>
              {footerColumns.map((col) => (
                <div key={col.title}>
                  <h4 className="text-sm font-semibold">{col.title}</h4>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link to={link.to} className="hover:text-foreground">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="relative min-h-[130px] pr-24">
                <h4 className="text-sm font-semibold">Mobile App</h4>
                <div className="mt-3 grid gap-2">
                  {appBadges.map((badge) => (
                    <a
                      key={badge.store}
                      href="#"
                      className="inline-flex h-10 max-w-44 items-center gap-3 rounded-lg border border-border/70 bg-background px-3 text-left shadow-sm transition-colors hover:border-primary/40"
                    >
                      <MonitorSmartphone className="h-5 w-5 text-primary" />
                      <span>
                        <span className="block text-[10px] leading-none text-muted-foreground">
                          {badge.label}
                        </span>
                        <span className="block text-sm font-bold">{badge.store}</span>
                      </span>
                    </a>
                  ))}
                </div>
                <div className="absolute bottom-0 right-0 w-24 rounded-[1.35rem] border border-border/70 bg-background p-1.5 shadow-xl">
                  <div className="overflow-hidden rounded-[1.2rem] border border-border bg-card">
                    <div className="h-11 bg-gradient-to-br from-primary/35 via-sky-300/20 to-background p-2">
                      <div className="h-1.5 w-12 rounded-full bg-foreground/70" />
                      <div className="mt-4 h-1.5 w-14 rounded-full bg-primary" />
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-2">
                      <span className="h-5 rounded bg-primary/20" />
                      <span className="h-5 rounded bg-amber-300/30" />
                      <span className="h-5 rounded bg-sky-300/30" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-border/60">
              <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:px-5 lg:px-6">
                <span>(c) 2024 movix. All rights reserved.</span>
                <span className="flex gap-5">
                  <a href="#" className="hover:text-foreground">
                    Privacy Policy
                  </a>
                  <a href="#" className="hover:text-foreground">
                    Terms & Conditions
                  </a>
                </span>
              </div>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
      <Toaster />
    </Provider>
  );
}

export { RootLayout };
