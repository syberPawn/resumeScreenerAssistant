"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { AnalyseControl } from "@/components/AnalyseControl";
import { FileInput } from "@/components/FileInput";
import { ProfileCard } from "@/components/ProfileCard";
import { ReportLayout } from "@/components/ReportLayout";
import { ReportLoading, ReportView } from "@/components/ReportView";
import { TextInput } from "@/components/TextInput";
import { apiRequest, postJson } from "@/lib/client/api";
import {
  checkFileBeforeUpload,
  EMPTY_PANEL,
  isPanelReady,
  panelReducer,
  panelText,
  type PanelAction,
  type PanelState,
} from "@/lib/client/panel-state";
import { button, errorText } from "@/lib/client/ui";
import { LIMITS } from "@/lib/limits";
import { kindTitle, messages } from "@/lib/messages";
import type { ExtractResult, InputKind, Profile, ProfileResult, SavedAnalysis } from "@/lib/types";

type Panels = Record<InputKind, PanelState>;
type PanelsAction = { kind: InputKind; action: PanelAction } | { kind: "both"; action: { type: "reset" } };

function panelsReducer(state: Panels, { kind, action }: PanelsAction): Panels {
  if (kind === "both") return { jobDescription: EMPTY_PANEL, resume: EMPTY_PANEL };
  return { ...state, [kind]: panelReducer(kind, state[kind], action) };
}

type Phase =
  | { name: "input" }
  | { name: "profileLoading" }
  | { name: "reportLoading"; profile: Profile }
  | { name: "done"; analysis: SavedAnalysis }
  | { name: "failed"; message: string; profile: ProfileResult | null; retry: "profile" | "report" | null };

// Errors that retrying cannot fix; HR starts again instead.
const NOT_RETRYABLE = new Set(["SIGNATURE_INVALID", "REQUEST_INVALID"]);

/** The Home page: the two input panels, then the report with the profile card shown first. */
export function Workspace() {
  const [panels, dispatchPanels] = useReducer(panelsReducer, { jobDescription: EMPTY_PANEL, resume: EMPTY_PANEL });
  const [phase, setPhase] = useState<Phase>({ name: "input" });
  const running = useRef(false);
  const uploads = useRef<Partial<Record<InputKind, AbortController>>>({});
  const headings = { jobDescription: useRef<HTMLHeadingElement>(null), resume: useRef<HTMLHeadingElement>(null) };

  const dispatch = useCallback((kind: InputKind, action: PanelAction) => dispatchPanels({ kind, action }), []);

  // A file dropped outside a panel must not make the browser open it and leave the page.
  useEffect(() => {
    const stop = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  async function handleFile(kind: InputKind, file: File) {
    if (panels[kind].status !== "empty") return;
    const problem = checkFileBeforeUpload(file, LIMITS.fileBytes);
    if (problem) {
      dispatch(kind, { type: "fileRejected", error: problem });
      return;
    }

    dispatch(kind, { type: "fileStarted", fileName: file.name });
    const controller = new AbortController();
    uploads.current[kind] = controller;
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);

    try {
      const result = await apiRequest<ExtractResult>(
        "/api/extract",
        { method: "POST", body: form, signal: controller.signal },
        messages.fileTooLarge(file.size),
      );
      if (result.ok) dispatch(kind, { type: "fileExtracted", result: result.data });
      else dispatch(kind, { type: "fileRejected", error: result.error.message });
    } catch {
      // The upload was removed while it was being read.
    } finally {
      if (uploads.current[kind] === controller) delete uploads.current[kind];
    }
  }

  function removeFile(kind: InputKind) {
    uploads.current[kind]?.abort();
    dispatch(kind, { type: "removeFile" });
  }

  function focusFirstNotReady() {
    const kind: InputKind = !isPanelReady(panels.jobDescription) ? "jobDescription" : "resume";
    headings[kind].current?.focus();
    headings[kind].current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const texts = () => ({ resumeText: panelText(panels.resume), jobDescriptionText: panelText(panels.jobDescription) });

  function backToPanel(kind: InputKind, error: string) {
    dispatch(kind, { type: "serverRejected", error });
    setPhase({ name: "input" });
  }

  async function runReport(profileResult: ProfileResult) {
    setPhase({ name: "reportLoading", profile: profileResult.profile });
    const result = await apiRequest<SavedAnalysis>(
      "/api/analyses",
      postJson({ ...texts(), ...profileResult }),
      messages.analysisFailed(),
    );
    if (result.ok) {
      setPhase({ name: "done", analysis: result.data });
      // The address now includes the analysis ID, so a reload restores the report from the database.
      window.history.replaceState(null, "", `/analyses/${result.data.id}`);
    } else if (result.error.field) {
      backToPanel(result.error.field, result.error.message);
    } else {
      setPhase({
        name: "failed",
        message: result.error.message,
        profile: profileResult,
        retry: NOT_RETRYABLE.has(result.error.code) ? null : "report",
      });
    }
  }

  async function runAnalysis() {
    setPhase({ name: "profileLoading" });
    const result = await apiRequest<ProfileResult>("/api/profile", postJson(texts()), messages.analysisFailed());
    if (result.ok) {
      await runReport(result.data);
    } else if (result.error.field) {
      backToPanel(result.error.field, result.error.message);
    } else {
      setPhase({
        name: "failed",
        message: result.error.message,
        profile: null,
        retry: NOT_RETRYABLE.has(result.error.code) ? null : "profile",
      });
    }
  }

  /** Runs one analysis at a time, so a double-click cannot save two rows. */
  async function guarded(work: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    try {
      await work();
    } finally {
      running.current = false;
    }
  }

  function startAnalysis() {
    if (!isPanelReady(panels.jobDescription) || !isPanelReady(panels.resume)) return;
    void guarded(runAnalysis);
  }

  function retry(failed: Extract<Phase, { name: "failed" }>) {
    if (failed.retry === "report" && failed.profile) void guarded(() => runReport(failed.profile!));
    else void guarded(runAnalysis);
  }

  /** Reviewed: clear everything and return to an empty Home page. */
  function reviewed() {
    Object.values(uploads.current).forEach((controller) => controller?.abort());
    dispatchPanels({ kind: "both", action: { type: "reset" } });
    setPhase({ name: "input" });
    window.history.replaceState(null, "", "/");
    window.scrollTo({ top: 0 });
  }

  if (phase.name !== "input") {
    const profile =
      phase.name === "reportLoading"
        ? phase.profile
        : phase.name === "done"
          ? phase.analysis.profile
          : phase.name === "failed"
            ? (phase.profile?.profile ?? null)
            : null;

    return (
      <ReportLayout
        card={phase.name === "failed" && !profile ? null : <ProfileCard profile={profile} />}
        report={
          phase.name === "done" ? (
            <div className="flex flex-col gap-6">
              <ReportView
                matchScore={phase.analysis.matchScore}
                report={phase.analysis.report}
                jobTitle={phase.analysis.jobTitle}
              />
              <div>
                <button type="button" className={button.primary} onClick={reviewed}>
                  Reviewed
                </button>
              </div>
            </div>
          ) : phase.name === "failed" ? (
            <div className="rounded-lg border border-red-200 bg-white p-6">
              <p role="alert" className={`${errorText} text-base`}>
                {phase.message}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {phase.retry ? (
                  <>
                    <button type="button" className={button.primary} onClick={() => retry(phase)}>
                      Try again
                    </button>
                    <button type="button" className={button.secondary} onClick={() => setPhase({ name: "input" })}>
                      Back to inputs
                    </button>
                  </>
                ) : (
                  <button type="button" className={button.primary} onClick={reviewed}>
                    Return to Home
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ReportLoading />
          )
        }
      />
    );
  }

  const panelHeading = (kind: InputKind) => (
    <h2
      ref={headings[kind]}
      id={`${kind}-heading`}
      tabIndex={-1}
      className="mb-3 rounded text-base font-semibold text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {kind === "resume" ? "Candidate resume" : kindTitle(kind)}
    </h2>
  );

  const textInput = (kind: InputKind) => (
    <TextInput
      kind={kind}
      state={panels[kind]}
      labelledBy={`${kind}-heading`}
      onChange={(text) => dispatch(kind, { type: "typed", text })}
      onDone={() => dispatch(kind, { type: "confirmText" })}
    />
  );

  const fileInput = (kind: InputKind) => (
    <FileInput
      kind={kind}
      state={panels[kind]}
      onFile={(file) => void handleFile(kind, file)}
      onRemove={() => removeFile(kind)}
      onClearText={() => dispatch(kind, { type: "clearText" })}
    />
  );

  // Two panels split by a partition line, with Analyse at its centre.
  // On small screens the panels stack, and Analyse comes last.
  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <section aria-labelledby="jobDescription-heading" className="order-1 md:pr-8">
        {panelHeading("jobDescription")}
        {textInput("jobDescription")}
      </section>
      <section
        aria-labelledby="resume-heading"
        className="order-3 mt-8 border-zinc-300 md:order-2 md:mt-0 md:border-l md:pl-8"
      >
        {panelHeading("resume")}
        {textInput("resume")}
      </section>

      <div className="relative order-5 mt-8 flex justify-center md:order-3 md:col-span-2 md:mt-0 md:py-6">
        <div className="absolute inset-y-0 left-1/2 hidden w-px bg-zinc-300 md:block" aria-hidden="true" />
        <AnalyseControl
          jobDescription={panels.jobDescription}
          resume={panels.resume}
          onAnalyse={startAnalysis}
          onNotReady={focusFirstNotReady}
        />
      </div>

      <div className="order-2 mt-4 md:order-4 md:mt-0 md:pr-8">{fileInput("jobDescription")}</div>
      <div className="order-4 mt-4 border-zinc-300 md:order-5 md:mt-0 md:border-l md:pl-8">{fileInput("resume")}</div>
    </div>
  );
}
