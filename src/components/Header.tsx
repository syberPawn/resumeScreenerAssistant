import Link from "next/link";
import { button } from "@/lib/client/ui";

/** Page header. The History button is shown on the Home and report pages. */
export function Header({ showHistory = true }: { showHistory?: boolean }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="rounded text-lg font-semibold text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Resume Screening Assistant
        </Link>
        {showHistory && (
          <Link href="/history" className={button.secondary}>
            History
          </Link>
        )}
      </div>
    </header>
  );
}
