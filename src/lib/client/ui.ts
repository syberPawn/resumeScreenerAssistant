// Shared Tailwind class names, so buttons look and behave the same everywhere.
// Unavailable buttons use aria-disabled (not the disabled attribute), so they stay focusable and
// screen readers can announce the reason.

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

export const button = {
  primary: `${base} bg-indigo-600 text-white hover:bg-indigo-700 aria-disabled:hover:bg-indigo-600`,
  secondary: `${base} border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 aria-disabled:hover:bg-white`,
  danger: `${base} bg-red-600 text-white hover:bg-red-700 aria-disabled:hover:bg-red-600`,
  link:
    "rounded text-sm font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
};

export const errorText = "text-sm text-red-700";
