import { baseApi } from "@/features/api/baseApi";

const ownerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOwnerWorkspace: build.query({
      query: () => "/api/owner/workspace",
      providesTags: ["Owner"],
    }),

    saveOwnerWorkspace: build.mutation({
      query: (workspace) => ({
        url: "/api/owner/workspace",
        method: "PUT",
        body: workspace,
      }),
      invalidatesTags: ["Owner"],
    }),
  }),
  overrideExisting: false,
});

const { useGetOwnerWorkspaceQuery, useSaveOwnerWorkspaceMutation } = ownerApi;

export { useGetOwnerWorkspaceQuery, useSaveOwnerWorkspaceMutation };
