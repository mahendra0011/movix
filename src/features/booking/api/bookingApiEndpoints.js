import { baseApi } from "@/features/api/baseApi";

const bookingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createBooking: build.mutation({
      query: (input) => ({
        url: "/api/bookings",
        method: "POST",
        body: input,
      }),
      invalidatesTags: ["Bookings", "Seats"],
    }),

    getSeatState: build.query({
      query: (showId) => ({ url: `/api/seat-state/${encodeURIComponent(showId)}` }),
      providesTags: (result, error, showId) => [{ type: "Seats", id: showId }],
    }),

    getMyBookings: build.query({
      query: () => "/api/me/bookings",
      providesTags: ["Bookings"],
    }),

    sendTicketOtp: build.mutation({
      query: (email) => ({
        url: "/api/ticket-otp",
        method: "POST",
        body: { email },
      }),
    }),

    verifyTicketOtp: build.mutation({
      query: (input) => ({
        url: "/api/ticket-otp/verify",
        method: "POST",
        body: input,
      }),
    }),

    createPaymentIntent: build.mutation({
      query: (amount) => ({
        url: "/api/payments/intent",
        method: "POST",
        body: { amount },
      }),
    }),

    confirmPayment: build.mutation({
      query: (payment) => ({
        url: "/api/payments/confirm",
        method: "POST",
        body: payment,
      }),
    }),
  }),
  overrideExisting: false,
});

const {
  useCreateBookingMutation,
  useGetSeatStateQuery,
  useGetMyBookingsQuery,
  useSendTicketOtpMutation,
  useVerifyTicketOtpMutation,
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
} = bookingApi;

export {
  useCreateBookingMutation,
  useGetSeatStateQuery,
  useGetMyBookingsQuery,
  useSendTicketOtpMutation,
  useVerifyTicketOtpMutation,
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
};
