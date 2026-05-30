import { Index } from "flexsearch";

function createSearchIndex(entries = []) {
  const index = new Index({
    cache: true,
    resolution: 9,
    tokenize: "forward",
  });
  const entriesById = new Map();
  const normalizedEntries = [];

  entries.forEach((entry) => {
    const id = String(entry?.id ?? "").trim();
    if (!id || entriesById.has(id)) return;

    const searchableText = normalizeSearchText(
      joinSearchFields(entry.title, entry.subtitle, entry.description, entry.searchText),
    );
    if (!searchableText) return;

    const normalizedEntry = {
      ...entry,
      id,
      searchText: searchableText,
    };
    entriesById.set(id, normalizedEntry);
    normalizedEntries.push(normalizedEntry);
    index.add(id, searchableText);
  });

  return { entries: normalizedEntries, entriesById, index };
}

function searchEntries(indexData, query, options = {}) {
  const needle = normalizeSearchText(query);
  const limit = Math.max(1, options.limit ?? 60);
  if (!needle || !indexData?.index) return [];

  const resultIds = new Set(indexData.index.search(needle, { limit: limit * 2 }));
  const terms = needle.split(" ").filter(Boolean);

  if (terms.length > 1 && resultIds.size < limit) {
    terms.forEach((term) => {
      indexData.index.search(term, { limit }).forEach((id) => resultIds.add(id));
    });
  }

  if (resultIds.size < limit) {
    indexData.entries.forEach((entry) => {
      if (resultIds.size >= limit) return;
      if (
        entry.searchText.includes(needle) ||
        terms.every((term) => entry.searchText.includes(term))
      ) {
        resultIds.add(entry.id);
      }
    });
  }

  return [...resultIds]
    .map((id) => indexData.entriesById.get(id))
    .filter(Boolean)
    .slice(0, limit);
}

function joinSearchFields(...fields) {
  return fields.flatMap(flattenSearchField).filter(Boolean).join(" ");
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function flattenSearchField(value) {
  if (Array.isArray(value)) return value.flatMap(flattenSearchField);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenSearchField);
  return String(value ?? "").trim();
}

export { createSearchIndex, joinSearchFields, normalizeSearchText, searchEntries };
