import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { RootLayout } from "./root-layout";
import { RouteErrorPage } from "@/shared/components/error/RouteErrorPage";
import { NotFoundPage } from "@/shared/components/error/NotFoundPage";

const Home = lazy(() => import("./routes/index").then((m) => ({ default: m.Home })));
const AuthPage = lazy(() => import("./routes/auth").then((m) => ({ default: m.AuthPage })));
const AdminDashboard = lazy(() =>
  import("./routes/admin").then((m) => ({ default: m.AdminDashboard })),
);
const OwnerDashboard = lazy(() =>
  import("./routes/owner").then((m) => ({ default: m.OwnerDashboard })),
);
const UserDashboard = lazy(() =>
  import("./routes/dashboard").then((m) => ({ default: m.UserDashboard })),
);
const MoviesLayout = lazy(() =>
  import("./routes/movies").then((m) => ({ default: m.MoviesLayout })),
);
const MoviesListing = lazy(() =>
  import("./routes/movies.index").then((m) => ({ default: m.MoviesListing })),
);
const MoviePage = lazy(() => import("./routes/movies.$id").then((m) => ({ default: m.MoviePage })));
const BookingPage = lazy(() =>
  import("./routes/book.$showId").then((m) => ({ default: m.BookingPage })),
);
const CinemaDetailPage = lazy(() =>
  import("./routes/cinemas.$id").then((m) => ({ default: m.CinemaDetailPage })),
);
const Confirmation = lazy(() =>
  import("./routes/confirmation").then((m) => ({ default: m.Confirmation })),
);
const ComingSoonPage = lazy(() =>
  import("./routes/coming-soon").then((m) => ({ default: m.ComingSoonPage })),
);
const ComingSoonDetailPage = lazy(() =>
  import("./routes/coming-soon_.$id").then((m) => ({ default: m.ComingSoonDetailPage })),
);
const OffersPage = lazy(() => import("./routes/offers").then((m) => ({ default: m.OffersPage })));
const WishlistPage = lazy(() =>
  import("./routes/wishlist").then((m) => ({ default: m.WishlistPage })),
);

function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "auth", element: <AuthPage /> },
      { path: "admin", element: <AdminDashboard /> },
      { path: "owner", element: <OwnerDashboard /> },
      { path: "dashboard", element: <UserDashboard /> },
      {
        path: "movies",
        element: <MoviesLayout />,
        loader: () => import("./routes/movies.index").then((m) => m.moviesLoader()),
        children: [
          {
            index: true,
            element: <MoviesListing />,
            loader: () => import("./routes/movies.index").then((m) => m.moviesLoader()),
          },
          {
            path: ":id",
            element: <MoviePage />,
            loader: (loaderArgs) => import("./routes/movies.$id").then((m) => m.movieLoader(loaderArgs)),
          },
        ],
      },
      { path: "book/:showId", element: <BookingPage /> },
      {
        path: "cinemas/:id",
        element: <CinemaDetailPage />,
        loader: (loaderArgs) => import("./routes/cinemas.$id").then((m) => m.cinemaLoader(loaderArgs)),
      },
      { path: "confirmation", element: <Confirmation /> },
      {
        path: "coming-soon",
        element: <ComingSoonPage />,
        loader: (loaderArgs) => import("./routes/coming-soon").then((m) => m.comingSoonLoader(loaderArgs)),
      },
      {
        path: "coming-soon/:id",
        element: <ComingSoonDetailPage />,
        loader: (loaderArgs) => import("./routes/coming-soon_.$id").then((m) => m.comingSoonDetailLoader(loaderArgs)),
      },
      {
        path: "offers",
        element: <OffersPage />,
        loader: (loaderArgs) => import("./routes/offers").then((m) => m.offersLoader(loaderArgs)),
      },
      { path: "wishlist", element: <WishlistPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export { router, HydrateFallback };
