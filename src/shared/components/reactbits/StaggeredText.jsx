import { cn } from "@/shared/lib/utils";
function StaggeredText({ text, className }) {
  return (
    <span className={cn("staggered-text", className)} aria-label={text}>
      {text.split(" ").map((word, index) => (
        <span
          aria-hidden="true"
          className="staggered-word"
          key={`${word}-${index}`}
          style={{ animationDelay: `${index * 70}ms` }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
export { StaggeredText };
