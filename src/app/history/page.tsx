import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { HistoryScreen } from "@/components/HistoryScreen";

export const metadata: Metadata = { title: "History · Resume Screening Assistant" };

export default function HistoryPage() {
  return (
    <>
      <Header showHistory={false} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <HistoryScreen />
      </main>
    </>
  );
}
