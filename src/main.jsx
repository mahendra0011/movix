import { RouterProvider } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { router, HydrateFallback } from "./app/router.jsx";
import "./styles.css";

const THEME_KEY = "movix-theme";

function readTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

const theme = readTheme();
document.documentElement.classList.toggle("light", theme === "light");
document.documentElement.classList.toggle("dark", theme === "dark");
document.documentElement.style.colorScheme = theme;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

const rootElement = document.getElementById("root");

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} HydrateFallback={HydrateFallback} />
  </StrictMode>,
);
