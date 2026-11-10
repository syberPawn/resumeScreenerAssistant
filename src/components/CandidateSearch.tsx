"use client";

import { useEffect, useId, useState } from "react";
import { apiRequest } from "@/lib/client/api";
import { LIMITS } from "@/lib/limits";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Candidate name search with suggestions, following the ARIA combobox pattern.
 * Suggestions start at 2 characters, wait 250 ms after typing stops, and an older request is cancelled
 * when a newer one starts, so an old response can never replace a newer one.
 */
export function CandidateSearch({ value, onChange }: Props) {
  const id = useId();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = value.trim();

  useEffect(() => {
    if (query.length < LIMITS.suggestMinChars) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiRequest<{ names: string[] }>(
        `/api/candidates/suggest?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
        "",
      )
        .then((result) => {
          setSuggestions(result.ok ? result.data.names : []);
          setActive(-1);
        })
        .catch(() => undefined);
    }, LIMITS.suggestDebounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visible = open && query.length >= LIMITS.suggestMinChars && suggestions.length > 0;

  function choose(name: string) {
    onChange(name);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative w-full max-w-md">
      <label htmlFor={`${id}-input`} className="mb-1 block text-sm font-medium text-zinc-700">
        Search by candidate name
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={visible}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 ? `${id}-option-${active}` : undefined}
        autoComplete="off"
        maxLength={100}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (!visible) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(suggestions[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Type at least 2 letters"
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
      />
      <ul
        id={`${id}-list`}
        role="listbox"
        aria-label="Matching candidate names"
        hidden={!visible}
        className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
      >
        {suggestions.map((name, index) => (
          <li
            key={name}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={index === active}
            // mousedown keeps focus in the input, so blur does not close the list before the click lands
            onMouseDown={(event) => {
              event.preventDefault();
              choose(name);
            }}
            className={`cursor-pointer px-3 py-2 text-sm ${index === active ? "bg-indigo-50 text-indigo-900" : "text-zinc-800 hover:bg-zinc-50"}`}
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
