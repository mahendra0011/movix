import { ChevronDown, MapPin } from "lucide-react";
import { buildCityOptions } from "@/shared/services/cityPreference";
import { cn } from "@/shared/lib/utils";

const CUSTOM_CITY_VALUE = "__custom_city__";

function CitySelect({ value, options = [], onChange, className, selectClassName }) {
  const cityOptions = buildCityOptions(options, value);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (nextValue !== CUSTOM_CITY_VALUE) {
      onChange(nextValue);
      return;
    }

    const customCity = window.prompt("Enter your city name");
    if (customCity?.trim()) onChange(customCity);
  };

  return (
    <label
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-2 text-sm",
        className,
      )}
    >
      <MapPin className="h-4 w-4 shrink-0 text-primary" />
      <select
        value={value}
        onChange={handleChange}
        className={cn("min-w-0 bg-transparent text-sm font-medium outline-none", selectClassName)}
        aria-label="Select city"
      >
        {cityOptions.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
        <option value={CUSTOM_CITY_VALUE}>Other city...</option>
      </select>
      <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground" />
    </label>
  );
}

export { CitySelect };
