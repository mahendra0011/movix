import { baseApi } from "@/features/api/baseApi";

const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation({
      query: (input) => ({
        url: "/api/auth/register",
        method: "POST",
        body: input,
      }),
    }),

    login: build.mutation({
      query: (input) => ({
        url: "/api/auth/login",
        method: "POST",
        body: input,
      }),
    }),

    forgotPassword: build.mutation({
      query: (email) => ({
        url: "/api/auth/forgot-password",
        method: "POST",
        body: { email },
      }),
    }),

    verifyOtp: build.mutation({
      query: (input) => ({
        url: "/api/auth/verify-otp",
        method: "POST",
        body: input,
      }),
    }),

    resetPassword: build.mutation({
      query: (input) => ({
        url: "/api/auth/reset-password",
        method: "POST",
        body: input,
      }),
    }),
  }),
  overrideExisting: false,
});

const {
  useRegisterMutation,
  useLoginMutation,
  useForgotPasswordMutation,
  useVerifyOtpMutation,
  useResetPasswordMutation,
} = authApi;

export {
  useRegisterMutation,
  useLoginMutation,
  useForgotPasswordMutation,
  useVerifyOtpMutation,
  useResetPasswordMutation,
};
