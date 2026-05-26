import { createFileRoute } from "@tanstack/react-router";
import { DiscoveryPage } from "@/features/discovery/components/DiscoveryPage";

const Route = createFileRoute("/stream")({
  component: StreamPage,
});

function StreamPage() {
  return <DiscoveryPage sectionKey="stream" />;
}

export { Route };
