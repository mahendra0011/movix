import { createSlice } from "@reduxjs/toolkit";

const THEME_KEY = "movix-theme";

function readTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    theme: readTheme(),
    sidebarOpen: false,
    mobileNavOpen: false,
  },
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_KEY, action.payload);
      }
      applyTheme(action.payload);
    },
    toggleTheme(state) {
      const next = state.theme === "light" ? "dark" : "light";
      state.theme = next;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_KEY, next);
      }
      applyTheme(next);
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setMobileNavOpen(state, action) {
      state.mobileNavOpen = action.payload;
    },
    toggleMobileNav(state) {
      state.mobileNavOpen = !state.mobileNavOpen;
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setSidebarOpen,
  toggleSidebar,
  setMobileNavOpen,
  toggleMobileNav,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
