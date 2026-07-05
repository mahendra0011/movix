import { createSlice } from "@reduxjs/toolkit";

const CITY_KEY = "movix-selected-city";

function readPreferredCity() {
  if (typeof window === "undefined") return "Jabalpur";
  return window.localStorage.getItem(CITY_KEY) || "Jabalpur";
}

const citySlice = createSlice({
  name: "city",
  initialState: {
    selectedCity: readPreferredCity(),
  },
  reducers: {
    setCity(state, action) {
      state.selectedCity = action.payload;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CITY_KEY, action.payload);
        window.dispatchEvent(new CustomEvent("movix-city-change", { detail: action.payload }));
      }
    },
  },
});

export const { setCity } = citySlice.actions;
export const cityReducer = citySlice.reducer;
