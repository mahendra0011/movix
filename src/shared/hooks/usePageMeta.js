import { useEffect } from "react";

const BASE_TITLE = "movix";
const BASE_DESCRIPTION = "Book movie tickets, pick seats, and confirm e-tickets.";

function setMeta(name, value) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function removeMeta(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  if (el) el.remove();
}

function setOpenGraph(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeOpenGraph(property) {
  const el = document.querySelector(`meta[property="${property}"]`);
  if (el) el.remove();
}

function usePageMeta({ title, description, image } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    const desc = description || BASE_DESCRIPTION;

    document.title = fullTitle;
    setMeta("description", desc);
    setOpenGraph("og:title", fullTitle);
    setOpenGraph("og:description", desc);
    setOpenGraph("og:image", image || "/icons/icon-512.svg");
    setOpenGraph("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);

    return () => {
      document.title = BASE_TITLE;
      setMeta("description", BASE_DESCRIPTION);
      setOpenGraph("og:title", BASE_TITLE);
      setOpenGraph("og:description", BASE_DESCRIPTION);
      setOpenGraph("og:image", "/icons/icon-512.svg");
    };
  }, [title, description, image]);
}

export { usePageMeta };
