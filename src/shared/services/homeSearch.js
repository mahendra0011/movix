const HOME_SEARCH_STORAGE_KEY = "bms-home-search";
const HOME_SEARCH_CHANGE_EVENT = "bms-home-search-change";

function readHomeSearchQuery() {
  if (typeof window === "undefined") return "";
  const urlQuery = new URLSearchParams(window.location.search).get("q");
  return urlQuery || window.sessionStorage.getItem(HOME_SEARCH_STORAGE_KEY) || "";
}

function writeHomeSearchQuery(query) {
  if (typeof window === "undefined") return;
  const nextQuery = String(query ?? "").trim();
  if (nextQuery) {
    window.sessionStorage.setItem(HOME_SEARCH_STORAGE_KEY, nextQuery);
  } else {
    window.sessionStorage.removeItem(HOME_SEARCH_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent(HOME_SEARCH_CHANGE_EVENT, { detail: nextQuery }));
}

function subscribeHomeSearchQuery(listener) {
  if (typeof window === "undefined") return () => {};
  const onSearchChange = (event) => listener(event.detail ?? "");
  window.addEventListener(HOME_SEARCH_CHANGE_EVENT, onSearchChange);
  return () => window.removeEventListener(HOME_SEARCH_CHANGE_EVENT, onSearchChange);
}

export { readHomeSearchQuery, subscribeHomeSearchQuery, writeHomeSearchQuery };
