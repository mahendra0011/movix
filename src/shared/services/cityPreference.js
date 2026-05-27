const CITY_STORAGE_KEY = "bms-selected-city";
const CITY_CHANGE_EVENT = "bms-city-change";
const DEFAULT_CITY = "Bengaluru";

function readPreferredCity() {
  if (typeof window === "undefined") return DEFAULT_CITY;
  return window.localStorage.getItem(CITY_STORAGE_KEY) || DEFAULT_CITY;
}

function writePreferredCity(city) {
  if (typeof window === "undefined" || !city) return;
  window.localStorage.setItem(CITY_STORAGE_KEY, city);
  window.dispatchEvent(new CustomEvent(CITY_CHANGE_EVENT, { detail: { city } }));
}

function subscribePreferredCity(listener) {
  if (typeof window === "undefined") return () => {};

  const handleCityChange = (event) => {
    listener(event.detail?.city || readPreferredCity());
  };
  const handleStorage = (event) => {
    if (event.key === CITY_STORAGE_KEY) listener(event.newValue || DEFAULT_CITY);
  };

  window.addEventListener(CITY_CHANGE_EVENT, handleCityChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CITY_CHANGE_EVENT, handleCityChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function sortCities(cities) {
  return [...new Set(cities.filter(Boolean))].sort((a, b) => {
    if (a === DEFAULT_CITY) return -1;
    if (b === DEFAULT_CITY) return 1;
    return a.localeCompare(b);
  });
}

export { DEFAULT_CITY, readPreferredCity, sortCities, subscribePreferredCity, writePreferredCity };
