import { createFileRoute } from "@tanstack/react-router";
import { DiscoveryPage } from "@/features/discovery/components/DiscoveryPage";

const Route = createFileRoute("/plays")({
  component: PlaysPage,
});

function PlaysPage() {
  return <DiscoveryPage sectionKey="plays" />;
}

export { Route };
