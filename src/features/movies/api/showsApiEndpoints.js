import { baseApi } from "@/features/api/baseApi";

const showsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTheaters: build.query({
      query: () => ({ url: "/api/theaters", timeoutMs: 8000 }),
      providesTags: ["Theaters"],
    }),

    getShowsByTheater: build.query({
      query: ({ theaterId, date }) => ({
        url: `/api/shows?theaterId=${encodeURIComponent(theaterId)}&date=${encodeURIComponent(date)}`,
        timeoutMs: 8000,
      }),
      providesTags: (result, error, { theaterId }) => [{ type: "Shows", id: theaterId }],
    }),

    getComingSoon: build.query({
      query: (city) => ({
        url: city
          ? `/api/shows/coming-soon?city=${encodeURIComponent(city)}`
          : "/api/shows/coming-soon",
        timeoutMs: 8000,
      }),
      providesTags: ["ComingSoon"],
    }),

    getComingSoonDetail: build.query({
      query: (id) => ({
        url: `/api/shows/coming-soon/${encodeURIComponent(id)}`,
        timeoutMs: 8000,
      }),
      providesTags: (result, error, id) => [{ type: "ComingSoon", id }],
    }),

    subscribeNotifications: build.mutation({
      query: ({ email, source }) => ({
        url: "/api/notifications/subscribe",
        method: "POST",
        body: { email, source },
      }),
    }),

    uploadImage: build.mutation({
      query: ({ file, folder }) => ({
        url: "/api/uploads/image",
        method: "POST",
        body: { file, folder },
        timeoutMs: 30000,
      }),
    }),
  }),
  overrideExisting: false,
});

const {
  useGetTheatersQuery,
  useGetShowsByTheaterQuery,
  useGetComingSoonQuery,
  useGetComingSoonDetailQuery,
  useSubscribeNotificationsMutation,
  useUploadImageMutation,
} = showsApi;

export {
  useGetTheatersQuery,
  useGetShowsByTheaterQuery,
  useGetComingSoonQuery,
  useGetComingSoonDetailQuery,
  useSubscribeNotificationsMutation,
  useUploadImageMutation,
};
