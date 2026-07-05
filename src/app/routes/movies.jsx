import { Outlet, useLoaderData, useLocation, useSearchParams } from "react-router-dom";
import { MoviesListingView, validateMoviesSearch } from "./movies.index";

function MoviesLayout() {
  const pathname = useLocation().pathname;
  const loadedMovies = useLoaderData();
  const [searchParams] = useSearchParams();
  const initialSearch = validateMoviesSearch(Object.fromEntries(searchParams));
  const isMovieDetail = /^\/movies\/[^/]+/.test(pathname);
  if (isMovieDetail) return <Outlet />;

  return <MoviesListingView loadedMovies={loadedMovies} initialSearch={initialSearch} />;
}

export { MoviesLayout };
