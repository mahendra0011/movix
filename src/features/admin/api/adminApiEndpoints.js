import { baseApi } from "@/features/api/baseApi";

const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminSummary: build.query({
      query: () => "/api/admin/summary",
      providesTags: ["Admin"],
    }),

    getTheaterApplications: build.query({
      query: () => "/api/admin/theater-applications",
      providesTags: ["Admin"],
    }),

    getAdminTheaters: build.query({
      query: () => "/api/theaters",
      providesTags: ["Admin"],
    }),

    getAdminUsers: build.query({
      query: () => "/api/admin/users",
      providesTags: ["Admin"],
    }),

    updateTheaterApplicationStatus: build.mutation({
      query: ({ id, status }) => ({
        url: `/api/admin/theater-applications/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Admin"],
    }),

    deleteTheaterApplication: build.mutation({
      query: (id) => ({
        url: `/api/admin/theater-applications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Admin"],
    }),

    deleteAdminTheater: build.mutation({
      query: (id) => ({
        url: `/api/admin/theaters/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Admin"],
    }),

    updateAdminUser: build.mutation({
      query: ({ id, ...input }) => ({
        url: `/api/admin/users/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: input,
      }),
      invalidatesTags: ["Admin"],
    }),

    deleteAdminUser: build.mutation({
      query: (id) => ({
        url: `/api/admin/users/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Admin"],
    }),
  }),
  overrideExisting: false,
});

const {
  useGetAdminSummaryQuery,
  useGetTheaterApplicationsQuery,
  useGetAdminTheatersQuery,
  useGetAdminUsersQuery,
  useUpdateTheaterApplicationStatusMutation,
  useDeleteTheaterApplicationMutation,
  useDeleteAdminTheaterMutation,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
} = adminApi;

export {
  useGetAdminSummaryQuery,
  useGetTheaterApplicationsQuery,
  useGetAdminTheatersQuery,
  useGetAdminUsersQuery,
  useUpdateTheaterApplicationStatusMutation,
  useDeleteTheaterApplicationMutation,
  useDeleteAdminTheaterMutation,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
};
