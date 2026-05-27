const SEARCH_BOX_SELECTOR = "[data-search-box]";

function readSearchBoxValue(form) {
  return form.querySelector(SEARCH_BOX_SELECTOR)?.textContent?.trim() ?? "";
}

function clearSearchBox(form) {
  const searchBox = form.querySelector(SEARCH_BOX_SELECTOR);
  if (searchBox) searchBox.textContent = "";
}

export { clearSearchBox, readSearchBoxValue };
