import { cn } from "@/shared/lib/utils";

function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/50 p-8 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      )}
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export { EmptyState };
