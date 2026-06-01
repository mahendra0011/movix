import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clapperboard, Sparkles, Users } from "lucide-react";
import { castAvatarFallback, normalizeCastImageUrl } from "@/features/movies/services/movieMedia";

function CastShowcase({
  castMembers = [],
  title = "Cast",
  subtitle = "Meet the talented stars of this movie",
  emptyTitle = "Cast announcement pending",
  emptyText = "Verified cast photos will appear here after the distributor confirms them.",
  variant = "portrait",
}) {
  const [showAll, setShowAll] = useState(false);
  const sliderRef = useRef(null);
  const hasMore = castMembers.length > 6;
  const visibleCast = showAll ? castMembers : castMembers.slice(0, 6);
  const canSlide = visibleCast.length > 3;
  const showViewAction = hasMore;

  const slideCast = (direction) => {
    sliderRef.current?.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  };

  if (variant === "compact") {
    return (
      <section aria-label={title} data-cast className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          </div>
          {showViewAction && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {showAll ? "Show less" : "View all"}
            </button>
          )}
        </div>

        {visibleCast.length ? (
          <div className="relative mt-4">
            {canSlide && (
              <>
                <button
                  type="button"
                  onClick={() => slideCast(-1)}
                  className="absolute left-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-background text-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-primary md:grid"
                  aria-label="Slide cast left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => slideCast(1)}
                  className="absolute right-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-background text-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-primary md:grid"
                  aria-label="Slide cast right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <div
              ref={sliderRef}
              className="flex snap-x gap-4 overflow-x-auto scroll-smooth px-1 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {visibleCast.map((member, index) => (
                <CompactCastCard
                  key={`${member.name}-${member.role}-${index}`}
                  member={member}
                  isLead={isLeadRole(member.role, index)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-card p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-sm font-semibold">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      data-cast
      className="relative overflow-hidden rounded-lg border border-border/70 bg-card p-4 shadow-xl shadow-foreground/5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
            <Users className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
          </div>
        </div>

        {showViewAction && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border/70 bg-background px-4 text-sm font-bold text-primary shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            {showAll ? "Show less" : "View all"}
            <ChevronRight
              className={`h-4 w-4 transition-transform ${showAll ? "-rotate-90" : ""}`}
            />
          </button>
        )}
      </div>

      {visibleCast.length ? (
        <>
          <div className="relative mt-7">
            {canSlide && (
              <>
                <button
                  type="button"
                  onClick={() => slideCast(-1)}
                  className="absolute left-2 top-[42%] z-10 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-background text-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-primary md:grid"
                  aria-label="Slide cast left"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => slideCast(1)}
                  className="absolute right-2 top-[42%] z-10 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-background text-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-primary md:grid"
                  aria-label="Slide cast right"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div
              ref={sliderRef}
              className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {visibleCast.map((member, index) => (
                <CastShowcaseCard
                  key={`${member.name}-${member.role}-${index}`}
                  member={member}
                  isLead={isLeadRole(member.role, index)}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-lg bg-gradient-to-r from-primary/8 via-sky-500/5 to-amber-300/12 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-sky-400/14 text-sky-600">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base font-bold">Amazing performances by an incredible cast</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Each actor brings their magic to make this movie a must-watch.
                </p>
              </div>
            </div>
            <Clapperboard className="hidden h-12 w-12 shrink-0 text-slate-600 sm:block" />
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-border/70 bg-background p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 text-sm font-semibold">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

function CompactCastCard({ member, isLead }) {
  const name = member.name || "Cast member";
  const role = member.role || (isLead ? "Lead" : "Cast");
  const fallbackSrc = castAvatarFallback(name);
  const imageSrc = normalizeCastImageUrl(member.avatar, name);

  return (
    <article className="w-[164px] shrink-0 snap-start rounded-lg border border-border/70 bg-card p-3 text-center shadow-md shadow-foreground/5 transition-transform hover:-translate-y-1 sm:w-[176px]">
      <div
        data-initials={initials(name)}
        className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-primary/12 ring-4 ring-primary/15 before:absolute before:inset-0 before:grid before:place-items-center before:text-sm before:font-semibold before:text-muted-foreground before:content-[attr(data-initials)]"
      >
        <img
          src={imageSrc}
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            if (event.currentTarget.src !== fallbackSrc) {
              event.currentTarget.src = fallbackSrc;
              return;
            }
            event.currentTarget.style.display = "none";
          }}
        />
      </div>
      <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5">{name}</h3>
      <p className="text-xs text-muted-foreground">{role}</p>
    </article>
  );
}

function CastShowcaseCard({ member, isLead }) {
  const name = member.name || "Cast member";
  const role = member.role || (isLead ? "Lead" : "Cast");
  const fallbackSrc = castAvatarFallback(name);
  const imageSrc = normalizeCastImageUrl(member.avatar, name);

  return (
    <article className="group w-[72vw] max-w-[220px] shrink-0 snap-start overflow-hidden rounded-lg border border-border/70 bg-card text-left shadow-sm transition-transform hover:-translate-y-1 sm:w-[190px] lg:w-[200px] xl:w-[210px]">
      <div
        data-initials={initials(name)}
        className="relative aspect-[3/4] overflow-hidden bg-muted before:absolute before:inset-0 before:grid before:place-items-center before:text-lg before:font-semibold before:text-muted-foreground before:content-[attr(data-initials)]"
      >
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            if (event.currentTarget.src !== fallbackSrc) {
              event.currentTarget.src = fallbackSrc;
              return;
            }
            event.currentTarget.style.display = "none";
          }}
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase text-white shadow-sm ${
            isLead ? "bg-primary" : "bg-slate-700/90"
          }`}
        >
          {isLead ? "Lead" : "Cast"}
        </span>
      </div>
      <div className="min-h-32 p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-6 text-foreground">{name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{role}</p>
        <span className="mt-5 block h-0.5 w-8 rounded-full bg-primary" />
      </div>
    </article>
  );
}

function isLeadRole(role, index) {
  if (index === 0) return true;
  return String(role || "")
    .toLowerCase()
    .includes("lead");
}

function initials(value) {
  return (
    String(value || "Cast")
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "C"
  );
}

export { CastShowcase };
