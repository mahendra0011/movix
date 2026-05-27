import { cn } from "@/shared/lib/utils";

function SearchBox({ placeholder, className }) {
  return (
    <div
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      data-search-box
      data-placeholder={placeholder}
      className={cn(
        "search-textbox min-w-0 flex-1 rounded-md px-3 py-2 text-sm outline-none",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.currentTarget.closest("form")?.requestSubmit();
      }}
    />
  );
}

export { SearchBox };
