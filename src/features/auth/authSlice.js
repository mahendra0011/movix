import { createSlice } from "@reduxjs/toolkit";

function loadInitialAuth() {
  if (typeof window === "undefined") return { user: null, token: null };
  const token = window.localStorage.getItem("bms-auth-token");
  const user = window.localStorage.getItem("bms-auth-user");
  return {
    token,
    user: user ? JSON.parse(user) : null,
  };
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadInitialAuth,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("bms-auth-token", action.payload.token);
        window.localStorage.setItem("bms-auth-user", JSON.stringify(action.payload.user));
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("bms-auth-token");
        window.localStorage.removeItem("bms-auth-user");
      }
    },
  },
});

export const { logout, setCredentials } = authSlice.actions;
export const authReducer = authSlice.reducer;
