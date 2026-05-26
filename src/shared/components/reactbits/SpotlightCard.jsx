import { cn } from "@/shared/lib/utils";
function SpotlightCard({ children, className, spotlightColor = "rgba(236, 82, 74, 0.24)" }) {
  return (
    <div
      className={cn("spotlight-card", className)}
      style={{ "--spotlight-color": spotlightColor }}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mouse-x", `${event.clientX - bounds.left}px`);
        event.currentTarget.style.setProperty("--mouse-y", `${event.clientY - bounds.top}px`);
      }}
    >
      {children}
    </div>
  );
}
export { SpotlightCard };
