import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/features/auth/authSlice";
import { uiReducer } from "@/features/ui/uiSlice";
import { cityReducer } from "@/features/city/citySlice";
import { baseApi } from "@/features/api/baseApi";

const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    city: cityReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export { store };
