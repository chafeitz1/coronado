import { input as inputClass } from "@/lib/ui";

// Free-text single-value field with a native datalist of existing values
// (e.g. every category already used across other assets) — same "reuse
// what's already there instead of fragmenting" idea as TagInput, but for
// a single string field rather than a multi-value one.
export function SuggestInput({
  name,
  defaultValue,
  suggestions = [],
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  suggestions?: string[];
  placeholder?: string;
}) {
  const listId = `${name}-suggestions`;
  return (
    <>
      <input
        name={name}
        list={listId}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputClass}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </>
  );
}
