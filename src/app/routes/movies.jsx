import { Outlet, createFileRoute } from "@tanstack/react-router";

const Route = createFileRoute("/movies")({
  component: MoviesLayout,
});

function MoviesLayout() {
  return <Outlet />;
}

export { Route };
