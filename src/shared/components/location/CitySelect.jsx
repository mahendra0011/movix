import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCityOptions } from "@/shared/services/cityPreference";
import { cn } from "@/shared/lib/utils";

function CitySelect({ value, options = [], onChange, className, selectClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const cityOptions = useMemo(() => buildCityOptions(options, value), [options, value]);
  const filteredOptions = useMemo(() => {
    const needle = normalizeQuery(query);
    const matches = needle
      ? cityOptions.filter((option) => option.searchText.includes(needle))
      : cityOptions;

    return matches.slice(0, 80);
  }, [cityOptions, query]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const openPicker = () => {
    setIsOpen((current) => !current);
    setQuery("");
    if (searchRef.current) searchRef.current.textContent = "";
  };

  const selectCity = (city) => {
    onChange(city);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        onClick={openPicker}
        className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-2 text-left text-sm"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className={cn("min-w-0 truncate font-medium", selectClassName)}>{value}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border/70 bg-popover shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div
              ref={searchRef}
              role="textbox"
              tabIndex={0}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Search city or state"
              className="search-textbox min-h-9 flex-1 rounded-md px-1 py-2 text-sm outline-none"
              onInput={(event) => setQuery(event.currentTarget.textContent ?? "")}
              onKeyDown={(event) => {
                if (event.key === "Escape") setIsOpen(false);
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (filteredOptions[0]) selectCity(filteredOptions[0].city);
              }}
            />
          </div>

          <div className="max-h-80 overflow-y-auto py-1" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = normalizeQuery(option.city) === normalizeQuery(value);
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectCity(option.city)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.city}</span>
                      {option.state && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {option.state}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No city found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeQuery(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export { CitySelect };
