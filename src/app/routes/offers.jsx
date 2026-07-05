import { useLoaderData, useSearchParams } from "react-router-dom";
import {
  BadgePercent,
  ChevronRight,
  Copy,
  Check,
  CreditCard,
  Crown,
  CupSoda,
  Flame,
  Flag,
  Gem,
  Gift,
  Landmark,
  Palette,
  Popcorn,
  Search,
  Share2,
  Smartphone,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  categories,
  colorMap,
  offers as fallbackOffers,
} from "@/features/offers/data/offerCatalog";

const iconMap = {
  BadgePercent,
  CreditCard,
  Crown,
  CupSoda,
  Flag,
  Gem,
  Gift,
  Landmark,
  Palette,
  Popcorn,
  Share2,
  Smartphone,
  Sparkles,
  Users,
};

const categoryIcons = {
  all: Sparkles,
  bank: Landmark,
  festival: Flag,
  first: Gift,
  food: CupSoda,
  loyalty: Crown,
};

const featuredIds = ["welcome25", "diwali-bonanza", "loyalty-platinum"];

function OffersPage() {
  const loaded = useLoaderData();
  const allOffers = loaded.length > 0 ? loaded : fallbackOffers;
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [copiedId, setCopiedId] = useState(null);
  const [animKey, setAnimKey] = useState(0);
  const gridRef = useRef(null);

  const featured = useMemo(
    () => featuredIds.map((id) => allOffers.find((o) => o.id === id)).filter(Boolean),
    [allOffers],
  );

  const filtered = useMemo(() => {
    let result = allOffers;
    if (activeCategory !== "all") {
      result = result.filter((o) => o.category === activeCategory);
    }
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.coupon.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allOffers, activeCategory, deferredSearch]);

  const nonFeatured = useMemo(
    () => filtered.filter((o) => !featuredIds.includes(o.id)),
    [filtered],
  );

  useEffect(() => {
    setAnimKey((k) => k + 1);
    if (gridRef.current) {
      gridRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeCategory, deferredSearch]);

  const setCategory = (id) => {
    setSearchParams(id === "all" ? {} : { category: id });
  };

  const copyCode = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-5 lg:px-6">
      <div className="relative mb-12 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/8 via-primary/4 to-background px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute -right-12 -top-12">
          <div className="offer-blob h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
        </div>
        <div className="pointer-events-none absolute -bottom-8 -left-8">
          <div
            className="offer-blob h-36 w-36 rounded-full bg-amber-500/8 blur-3xl"
            style={{ animationDelay: "-2s" }}
          />
        </div>

        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="offer-glow grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <BadgePercent className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Exclusive
                <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                  {" "}
                  Offers
                </span>
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {allOffers.length} deals live &bull; Grab them before they expire
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search offers, coupons..."
              className="h-11 border-border/60 bg-background/70 pl-9 shadow-sm backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      <div className="mb-10 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => {
          const CatItemIcon = categoryIcons[cat.id] || Sparkles;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`relative shrink-0 whitespace-nowrap rounded-full border px-5 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-primary hover:shadow-sm"
              }`}
            >
              {isActive && <span className="absolute inset-0 rounded-full offer-shimmer" />}
              <span className="relative inline-flex items-center gap-2">
                <CatItemIcon className="h-4 w-4" />
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {featured.length > 0 && activeCategory === "all" && !deferredSearch.trim() && (
        <section className="mb-12">
          <div className="mb-5 flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold">Hot Deals</h2>
          </div>
          <div
            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 offer-stagger"
            key={`featured-${animKey}`}
          >
            {featured.map((offer) => {
              const c = colorMap[offer.color];
              const Icon = iconMap[offer.icon] || BadgePercent;
              const isCopied = copiedId === offer.id;
              return (
                <div
                  key={offer.id}
                  className={`group relative overflow-hidden rounded-xl border-2 ${c.border} ${c.borderDark} bg-gradient-to-br ${c.light} ${c.dark} p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                >
                  <div
                    className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full ${c.icon} ${c.iconDark} opacity-20 blur-xl`}
                  />
                  <div
                    className={`pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full ${c.icon} ${c.iconDark} opacity-10 blur-lg`}
                  />

                  <div className="relative flex items-start gap-4">
                    <div
                      className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${c.icon} ${c.iconDark} shadow-sm`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base font-bold leading-6">{offer.title}</p>
                        <span
                          className={`shrink-0 animate-[offer-badge-pop_400ms_ease-out] rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.badge} ${c.badgeDark} shadow-sm`}
                        >
                          {offer.category}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {offer.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-5 flex items-center gap-3">
                    <div
                      className={`inline-flex items-center gap-2 rounded-lg border-2 border-dashed ${c.coupon} ${c.couponDark} px-3 py-2 shadow-sm`}
                    >
                      <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-sm font-bold tracking-widest">
                        {offer.coupon}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCode(offer.coupon, offer.id)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95 ${isCopied ? "bg-emerald-500" : `${c.btn} hover:brightness-110`}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Valid till: {offer.validTill}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Claim now <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {nonFeatured.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-muted/50">
            <BadgePercent className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="text-xl font-bold">No offers found</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
            {deferredSearch.trim()
              ? `No results for "${deferredSearch}". Try a different keyword.`
              : "No offers in this category right now. Check back later!"}
          </p>
          {(activeCategory !== "all" || deferredSearch.trim()) && (
            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => {
                setSearch("");
                setSearchParams({});
              }}
            >
              <Sparkles className="h-4 w-4" /> View all offers
            </Button>
          )}
        </div>
      ) : (
        <section>
          {activeCategory === "all" && !deferredSearch.trim() && featured.length > 0 && (
            <div className="mb-5 flex items-center gap-2">
              <BadgePercent className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">All Deals</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {nonFeatured.length}
              </span>
            </div>
          )}
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 offer-stagger"
            key={animKey}
            ref={gridRef}
          >
            {nonFeatured.map((offer) => {
              const c = colorMap[offer.color];
              const Icon = iconMap[offer.icon] || BadgePercent;
              const isCopied = copiedId === offer.id;

              return (
                <div
                  key={offer.id}
                  className={`group relative overflow-hidden rounded-xl border ${c.border} ${c.borderDark} bg-gradient-to-br ${c.light} ${c.dark} p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
                >
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${c.icon} ${c.iconDark} opacity-10 blur-2xl`}
                  />

                  <div className="relative flex items-start gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${c.icon} ${c.iconDark}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className="text-sm font-bold leading-5">{offer.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${c.badge} ${c.badgeDark}`}
                        >
                          {offer.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">
                        {offer.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-4 flex items-center gap-2">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-md border border-dashed ${c.coupon} ${c.couponDark} px-2.5 py-1`}
                    >
                      <span className="font-mono text-xs font-bold tracking-wider">
                        {offer.coupon}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCode(offer.coupon, offer.id)}
                      className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold text-white transition-all active:scale-90 ${isCopied ? "bg-emerald-500" : `${c.btn} hover:brightness-110`}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Till {offer.validTill}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Claim <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

async function offersLoader() {
  return fallbackOffers;
}

export { OffersPage, offersLoader };
