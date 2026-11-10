import type { Report } from "@/lib/types";

interface Props {
  matchScore: number;
  report: Report;
  jobTitle: string | null;
  createdAt?: string;
}

/** The analysis report. All AI output is shown as plain text. */
export function ReportView({ matchScore, report, jobTitle, createdAt }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {(jobTitle || createdAt) && (
        <p className="text-sm text-zinc-600">
          {jobTitle && (
            <>
              Role: <span className="font-medium text-zinc-900">{jobTitle}</span>
            </>
          )}
          {jobTitle && createdAt && " · "}
          {createdAt && `Analysed ${formatDate(createdAt)}`}
        </p>
      )}

      <section aria-labelledby="score-heading" className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
        <h2 id="score-heading" className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Match score
        </h2>
        <p className="mt-2 text-5xl font-semibold text-zinc-900">
          {matchScore}
          <span className="text-xl font-normal text-zinc-500"> / 100</span>
        </p>
        <div className="mt-4 h-2 w-full rounded-full bg-zinc-200" aria-hidden="true">
          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${matchScore}%` }} />
        </div>
      </section>

      <ReportList id="skills" title="Top matching skills" items={report.matchingSkills} empty="No matching skills were found." />
      <ReportList id="gaps" title="Top gaps" items={report.gaps} empty="No significant gaps were found." />
      <ReportList id="questions" title="Suggested interview questions" items={report.interviewQuestions} ordered />
    </div>
  );
}

function ReportList({
  id,
  title,
  items,
  empty,
  ordered = false,
}: {
  id: string;
  title: string;
  items: string[];
  empty?: string;
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
      <h2 id={`${id}-heading`} className="text-base font-semibold text-zinc-900">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">{empty}</p>
      ) : (
        <List className={`mt-3 flex flex-col gap-2 pl-5 text-sm leading-6 text-zinc-800 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </List>
      )}
    </section>
  );
}

export function ReportLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p role="status" className="text-sm font-medium text-zinc-700">
        <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent align-middle" />
        Analysing the resume against the job description…
      </p>
      <div className="flex animate-pulse flex-col gap-6" aria-hidden="true">
        <div className="h-36 rounded-2xl bg-zinc-200" />
        <div className="h-32 rounded-2xl bg-zinc-200" />
        <div className="h-24 rounded-2xl bg-zinc-200" />
        <div className="h-32 rounded-2xl bg-zinc-200" />
      </div>
    </div>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
