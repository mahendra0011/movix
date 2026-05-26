import { Link } from "@tanstack/react-router";
import { Search, MapPin, User, Film } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary">
            <Film className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            book<span className="text-primary">my</span>screen
          </span>
        </Link>

        <div className="ml-4 hidden flex-1 md:block">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for movies, events, theaters..."
              className="h-10 border-border/60 bg-card/60 pl-9"
            />
          </div>
        </div>

        <button className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground md:flex">
          <MapPin className="h-4 w-4" />
          Bengaluru
        </button>

        <Button size="sm" className="gap-2">
          <User className="h-4 w-4" /> Sign in
        </Button>
      </div>

      <nav className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2 text-sm text-muted-foreground">
          {["Movies", "Stream", "Events", "Plays", "Sports", "Activities"].map((x) => (
            <a key={x} className="whitespace-nowrap hover:text-foreground" href="#">
              {x}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
export { Navbar };
