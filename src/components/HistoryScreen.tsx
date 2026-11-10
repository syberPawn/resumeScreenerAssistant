"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CandidateSearch } from "@/components/CandidateSearch";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatDate } from "@/components/ReportView";
import { apiRequest } from "@/lib/client/api";
import { button, errorText } from "@/lib/client/ui";
import { LIMITS } from "@/lib/limits";
import { messages } from "@/lib/messages";
import type { HistoryItem, HistoryPage, ScoreRange } from "@/lib/types";

const RANGES: { value: ScoreRange; label: string }[] = [
  { value: "all", label: "All" },
  { value: "below-70", label: "Below 70" },
  { value: "70-89", label: "70–89" },
  { value: "90-100", label: "90–100" },
];

type Deletion = { kind: "one"; item: HistoryItem } | { kind: "all"; count: number };

/** The History page: score ranges, name search, paging and deletion. */
export function HistoryScreen() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<ScoreRange>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryPage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // The list follows the search box after typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, LIMITS.suggestDebounceMs);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ range, page: String(page) });
    if (query) params.set("q", query);
    apiRequest<HistoryPage>(`/api/analyses?${params}`, { signal: controller.signal }, messages.historyLoadFailed())
      .then((result) => {
        if (!result.ok) {
          setLoadError(result.error.message);
          return;
        }
        setLoadError(null);
        const lastPage = Math.max(1, Math.ceil(result.data.total / result.data.pageSize));
        // After deleting the last entry on a page, move back to the last page that still has entries.
        if (page > lastPage) setPage(lastPage);
        else setData(result.data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [query, range, page, reload]);

  async function confirmDeletion() {
    if (!deletion) return;
    setDeleting(true);
    setDeleteError(null);
    const result =
      deletion.kind === "one"
        ? await apiRequest(`/api/analyses/${deletion.item.id}`, { method: "DELETE" }, messages.deleteOneFailed())
        : await apiRequest(
            "/api/analyses",
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirm: "delete-all" }),
            },
            messages.deleteAllFailed(),
          );
    setDeleting(false);

    // An entry that is already gone counts as deleted.
    if (result.ok || (deletion.kind === "one" && result.error.status === 404)) {
      setNotice(deletion.kind === "one" ? messages.deletedOne() : messages.deletedAll());
      setDeletion(null);
      if (deletion.kind === "all") setPage(1);
      setReload((n) => n + 1);
    } else {
      setDeleteError(deletion.kind === "one" ? messages.deleteOneFailed() : messages.deleteAllFailed());
    }
  }

  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtered = query !== "" || range !== "all";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">History</h1>
        {data && data.overallTotal > 0 && (
          <button
            type="button"
            className={button.secondary}
            onClick={() => {
              setDeleteError(null);
              setDeletion({ kind: "all", count: data.overallTotal });
            }}
          >
            Delete all history
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <CandidateSearch value={search} onChange={setSearch} />
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-zinc-700">Match score</legend>
          <div className="inline-flex overflow-hidden rounded-md border border-zinc-300">
            {RANGES.map((option) => (
              <label
                key={option.value}
                className={
                  "cursor-pointer border-zinc-300 px-4 py-2 text-sm not-first:border-l has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-indigo-600 " +
                  (range === option.value ? "bg-indigo-600 text-white" : "bg-white text-zinc-800 hover:bg-zinc-50")
                }
              >
                <input
                  type="radio"
                  name="score-range"
                  value={option.value}
                  checked={range === option.value}
                  onChange={() => {
                    setRange(option.value);
                    setPage(1);
                  }}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <p role="status" className="text-sm text-green-700">
        {notice}
      </p>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-white shadow-sm p-6">
          <p role="alert" className={errorText}>
            {loadError}
          </p>
          <button type="button" className={`${button.primary} mt-4`} onClick={() => setReload((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <p role="status" className="text-sm text-zinc-600">
          Loading History…
        </p>
      ) : data.items.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 text-sm text-zinc-600">
          {filtered ? "No analyses match this search or filter." : "No analyses saved yet."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Saved analyses, newest first</caption>
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Candidate</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 font-medium">Score</th>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <Link href={`/analyses/${item.id}`} className={button.link}>
                        {item.candidateName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{item.jobTitle ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{item.matchScore}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className={button.secondary}
                        aria-label={`Delete the analysis for ${item.candidateName}`}
                        onClick={() => {
                          setDeleteError(null);
                          setDeletion({ kind: "one", item });
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 1 && (
            <nav aria-label="History pages" className="flex items-center justify-between">
              <button
                type="button"
                className={button.secondary}
                aria-disabled={page <= 1 || undefined}
                onClick={() => page > 1 && setPage(page - 1)}
              >
                Previous
              </button>
              <p className="text-sm text-zinc-600">
                Page {page} of {lastPage}
              </p>
              <button
                type="button"
                className={button.secondary}
                aria-disabled={page >= lastPage || undefined}
                onClick={() => page < lastPage && setPage(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      <ConfirmDialog
        open={deletion !== null}
        title={deletion?.kind === "all" ? "Delete all history?" : "Delete this analysis?"}
        confirmLabel={
          deletion?.kind === "all"
            ? `Delete all ${deletion.count} ${deletion.count === 1 ? "analysis" : "analyses"}`
            : "Delete analysis"
        }
        busy={deleting}
        error={deleteError}
        onConfirm={() => void confirmDeletion()}
        onCancel={() => setDeletion(null)}
      >
        {deletion?.kind === "one" && (
          <p>
            The analysis for <strong>{deletion.item.candidateName}</strong> (score {deletion.item.matchScore},{" "}
            {formatDate(deletion.item.createdAt)}) will be permanently deleted. This can&apos;t be undone.
          </p>
        )}
        {deletion?.kind === "all" && (
          <p>
            All {deletion.count} saved {deletion.count === 1 ? "analysis" : "analyses"} will be permanently deleted,
            including any hidden by the current search or filter. This can&apos;t be undone.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
