import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";
import { sectionCatalog } from "@/features/discovery/data/sectionCatalog";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

function DiscoveryPage({ sectionKey }) {
  const section = sectionCatalog[sectionKey];
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(section.items[0]?.id ?? "");
  const [message, setMessage] = useState("");

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return section.items.filter((item) => {
      const searchable = [item.title, item.category, item.venue, item.date, item.description]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !needle || searchable.includes(needle);
      const matchesFilter = activeFilter === "All" || item.category === activeFilter;
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, query, section.items]);

  const selected =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? section.items[0];

  const selectItem = (item) => {
    setSelectedId(item.id);
    setMessage("");
  };

  const reserveInterest = () => {
    saveShortlistItem({
      id: `${sectionKey}-${selected.id}`,
      title: selected.title,
      category: selected.category,
      image: selected.image,
      venue: selected.venue,
      date: selected.date,
      price: selected.price,
      savedAt: new Date().toISOString(),
    });
    setMessage(`${selected.title} saved to your dashboard shortlist.`);
  };

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="relative h-[430px] md:h-[520px]">
          <img
            src={section.heroImage}
            alt={section.title}
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/82 to-background/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-10 md:items-center md:pb-0">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {section.eyebrow}
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
                {section.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {section.subtitle}
              </p>
              <div className="mt-6 flex max-w-2xl items-center gap-2 rounded-lg border border-border/70 bg-background/70 p-2 shadow-2xl shadow-black/20 backdrop-blur">
                <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={section.searchPlaceholder}
                  className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4">
        <div className="grid gap-3 md:grid-cols-3">
          {section.stats.map((stat) => (
            <SpotlightCard key={stat.label} className="rounded-lg p-5 text-center">
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {section.filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === filter
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-5 px-4 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4 md:grid-cols-2">
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <DiscoveryCard
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onSelect={() => selectItem(item)}
              />
            ))
          ) : (
            <SpotlightCard className="rounded-lg p-8 text-center md:col-span-2">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Search className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No matches found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term or clear the active filter.
              </p>
            </SpotlightCard>
          )}
        </div>

        {selected && (
          <SpotlightCard className="sticky top-28 h-max rounded-lg p-5">
            <div className="overflow-hidden rounded-lg border border-border/60">
              <img src={selected.image} alt={selected.title} className="h-52 w-full object-cover" />
            </div>
            <div className="mt-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase text-primary">{selected.category}</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">{selected.title}</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {selected.rating}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {selected.description}
            </p>
            <div className="mt-5 grid gap-3 text-sm">
              <DetailRow icon={Ticket} label="Experience" value={selected.venue} />
              <DetailRow
                icon={CalendarDays}
                label="When"
                value={`${selected.date} - ${selected.time}`}
              />
              <DetailRow icon={Ticket} label="From" value={`Rs ${selected.price}`} />
              <DetailRow icon={ShieldCheck} label="Entry" value="QR ticket supported" />
            </div>
            {message && (
              <p className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                {message}
              </p>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {selected.movieId ? (
                <Button asChild className="gap-2">
                  <Link to="/movies/$id" params={{ id: selected.movieId }}>
                    <Ticket className="h-4 w-4" />
                    Book
                  </Link>
                </Button>
              ) : (
                <Button onClick={reserveInterest} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Shortlist
                </Button>
              )}
              <Button variant="secondary" onClick={reserveInterest} className="gap-2">
                <Play className="h-4 w-4" />
                Remind me
              </Button>
            </div>
          </SpotlightCard>
        )}
      </section>
    </div>
  );
}

function DiscoveryCard({ item, selected, onSelect }) {
  return (
    <SpotlightCard
      className={`group rounded-lg p-3 transition-transform hover:-translate-y-0.5 ${
        selected ? "border-primary/50" : ""
      }`}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="relative overflow-hidden rounded-lg border border-border/60">
          <img
            src={item.image}
            alt={item.title}
            className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <span className="inline-flex rounded-md bg-background/80 px-2 py-1 text-[11px] font-semibold text-primary backdrop-blur">
              {item.badge}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted-foreground">{item.category}</p>
            <h2 className="mt-1 truncate text-lg font-semibold">{item.title}</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{item.venue}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {item.date}
          </span>
          <span className="font-semibold text-primary">Rs {item.price}</span>
        </div>
      </button>
    </SpotlightCard>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/35 px-3 py-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function saveShortlistItem(item) {
  if (typeof window === "undefined") return;
  const key = "bms-shortlist";
  let existing = [];
  try {
    existing = JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    existing = [];
  }
  const next = [item, ...existing.filter((saved) => saved.id !== item.id)].slice(0, 12);
  window.localStorage.setItem(key, JSON.stringify(next));
}

export { DiscoveryPage };
