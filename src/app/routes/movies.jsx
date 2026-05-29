import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { fetchMovies } from "@/features/movies/api/moviesApi";
import { MoviesListingView, validateMoviesSearch } from "./movies.index";

const Route = createFileRoute("/movies")({
  loader: () => fetchMovies(),
  validateSearch: validateMoviesSearch,
  component: MoviesLayout,
});

function MoviesLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const loadedMovies = Route.useLoaderData();
  const initialSearch = Route.useSearch();
  const isMovieDetail = /^\/movies\/[^/]+/.test(pathname);
  if (isMovieDetail) return <Outlet />;

  return <MoviesListingView loadedMovies={loadedMovies} initialSearch={initialSearch} />;
}

export { Route };
