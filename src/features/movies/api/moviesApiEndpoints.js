import { baseApi } from "@/features/api/baseApi";

const moviesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMovies: build.query({
      query: () => ({ url: "/api/movies", timeoutMs: 8000 }),
      providesTags: ["Movies"],
      keepUnusedDataFor: 300,
    }),

    getMovie: build.query({
      query: (id) => ({ url: `/api/movies/${encodeURIComponent(id)}`, timeoutMs: 8000 }),
      providesTags: (result, error, id) => [{ type: "Movie", id }],
    }),

    getMovieReviews: build.query({
      query: (id) => ({ url: `/api/movies/${encodeURIComponent(id)}/reviews`, timeoutMs: 8000 }),
      providesTags: (result, error, id) => [{ type: "Reviews", id }],
    }),

    createMovie: build.mutation({
      query: (input) => ({
        url: "/api/movies",
        method: "POST",
        body: input,
      }),
      invalidatesTags: ["Movies"],
    }),

    deleteMovie: build.mutation({
      query: (id) => ({
        url: `/api/movies/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Movies"],
    }),

    createMovieReview: build.mutation({
      query: ({ id, ...input }) => ({
        url: `/api/movies/${encodeURIComponent(id)}/reviews`,
        method: "POST",
        body: input,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Reviews", id }],
    }),
  }),
  overrideExisting: false,
});

const {
  useGetMoviesQuery,
  useGetMovieQuery,
  useGetMovieReviewsQuery,
  useCreateMovieMutation,
  useDeleteMovieMutation,
  useCreateMovieReviewMutation,
} = moviesApi;

export {
  useGetMoviesQuery,
  useGetMovieQuery,
  useGetMovieReviewsQuery,
  useCreateMovieMutation,
  useDeleteMovieMutation,
  useCreateMovieReviewMutation,
};
