import { createSlice } from "@reduxjs/toolkit";

function readStoredAuth() {
  if (typeof window === "undefined") return { user: null, token: null };
  const token = window.localStorage.getItem("movix-auth-token");
  const user = window.localStorage.getItem("movix-auth-user");
  try {
    if (!token || !user) {
      window.localStorage.removeItem("movix-auth-token");
      window.localStorage.removeItem("movix-auth-user");
      return { user: null, token: null };
    }

    return {
      token,
      user: JSON.parse(user),
    };
  } catch {
    window.localStorage.removeItem("movix-auth-token");
    window.localStorage.removeItem("movix-auth-user");
    return { user: null, token: null };
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: null,
    hydrated: false,
  },
  reducers: {
    hydrateAuth(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.hydrated = true;
    },
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.hydrated = true;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("movix-auth-token", action.payload.token);
        window.localStorage.setItem("movix-auth-user", JSON.stringify(action.payload.user));
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.hydrated = true;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("movix-auth-token");
        window.localStorage.removeItem("movix-auth-user");
      }
    },
  },
});

export { readStoredAuth };
export const { hydrateAuth, logout, setCredentials } = authSlice.actions;
export const authReducer = authSlice.reducer;
