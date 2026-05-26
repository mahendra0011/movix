import { createFileRoute } from "@tanstack/react-router";
import { DiscoveryPage } from "@/features/discovery/components/DiscoveryPage";

const Route = createFileRoute("/events")({
  component: EventsPage,
});

function EventsPage() {
  return <DiscoveryPage sectionKey="events" />;
}

export { Route };
