import { cn } from "@/shared/lib/utils";

function SearchBox({ placeholder, className, value, onChange }) {
  return (
    <input
      type="search"
      data-search-box
      value={value}
      onChange={onChange}
      placeholder={placeholder}
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
