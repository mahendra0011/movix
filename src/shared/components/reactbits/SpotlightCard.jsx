import { cn } from "@/shared/lib/utils";
function SpotlightCard({ children, className }) {
  return <div className={cn("spotlight-card", className)}>{children}</div>;
}
export { SpotlightCard };
