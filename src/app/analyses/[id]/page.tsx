import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { SavedReport } from "@/components/SavedReport";

export const metadata: Metadata = { title: "Analysis · Resume Screening Assistant" };

// The report page for a saved analysis. The ID is only known at request time, so it is read inside Suspense.
export default function AnalysisPage({ params }: PageProps<"/analyses/[id]">) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <h1 className="sr-only">Candidate analysis</h1>
        <Suspense fallback={<p className="text-sm text-zinc-700">Loading the analysis…</p>}>
          <SavedReport params={params} />
        </Suspense>
      </main>
    </>
  );
}
