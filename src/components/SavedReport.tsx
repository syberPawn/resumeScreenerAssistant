"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ProfileCard } from "@/components/ProfileCard";
import { ReportLayout } from "@/components/ReportLayout";
import { ReportView } from "@/components/ReportView";
import { apiRequest } from "@/lib/client/api";
import { button, errorText } from "@/lib/client/ui";
import { messages } from "@/lib/messages";
import type { SavedAnalysis } from "@/lib/types";

type State = { name: "loading" } | { name: "loaded"; analysis: SavedAnalysis } | { name: "error"; message: string; notFound: boolean };

/** A saved analysis, opened from History or by reloading the report page. */
export function SavedReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State>({ name: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<SavedAnalysis>(`/api/analyses/${encodeURIComponent(id)}`, { signal: controller.signal }, messages.historyLoadFailed())
      .then((result) => {
        if (result.ok) setState({ name: "loaded", analysis: result.data });
        else setState({ name: "error", message: result.error.message, notFound: result.error.status === 404 });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [id, attempt]);

  if (state.name === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-white shadow-sm p-6">
        <p role="alert" className={`${errorText} text-base`}>
          {state.message}
        </p>
        <div className="mt-5 flex gap-3">
          {!state.notFound && (
            <button
              type="button"
              className={button.primary}
              onClick={() => {
                setState({ name: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          )}
          <button type="button" className={button.secondary} onClick={() => router.push("/history")}>
            Open History
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReportLayout
      card={
        <div className="flex flex-col gap-3">
          <ProfileCard profile={state.name === "loaded" ? state.analysis.profile : null} />
          {state.name === "loaded" && (
            <button type="button" className={`${button.primary} w-full py-2.5`} onClick={() => router.push("/")}>
              Reviewed
            </button>
          )}
        </div>
      }
      report={
        state.name === "loaded" ? (
          <ReportView
            matchScore={state.analysis.matchScore}
            report={state.analysis.report}
            jobTitle={state.analysis.jobTitle}
            createdAt={state.analysis.createdAt}
          />
        ) : (
          <p role="status" className="text-sm text-zinc-700">
            Loading the analysis…
          </p>
        )
      }
    />
  );
}
