const SEARCH_BOX_SELECTOR = "[data-search-box]";

function readSearchBoxValue(form) {
  const searchBox = form.querySelector(SEARCH_BOX_SELECTOR);
  if (!searchBox) return "";
  return ("value" in searchBox ? searchBox.value : searchBox.textContent)?.trim() ?? "";
}

function clearSearchBox(form) {
  const searchBox = form.querySelector(SEARCH_BOX_SELECTOR);
  if (!searchBox) return;
  if ("value" in searchBox) searchBox.value = "";
  else searchBox.textContent = "";
}

export { clearSearchBox, readSearchBoxValue };
