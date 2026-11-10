import Link from "next/link";
import { HistoryIcon, ScanSearchIcon } from "@/components/icons";

/** Page header. The History button is shown on the Home and report pages. */
export function Header({ showHistory = true }: { showHistory?: boolean }) {
  return (
    <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
            <ScanSearchIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-semibold leading-tight text-zinc-900">Resume Screening Assistant</span>
            <span className="hidden text-sm text-zinc-500 sm:block">Compare a job description with a resume using AI</span>
          </span>
        </Link>
        {showHistory && (
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <HistoryIcon className="h-4 w-4" />
            History
          </Link>
        )}
      </div>
    </header>
  );
}
