import { createFileRoute } from "@tanstack/react-router";
import { DiscoveryPage } from "@/features/discovery/components/DiscoveryPage";

const Route = createFileRoute("/sports")({
  component: SportsPage,
});

function SportsPage() {
  return <DiscoveryPage sectionKey="sports" />;
}

export { Route };
