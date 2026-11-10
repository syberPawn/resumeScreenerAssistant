import type { ReactNode } from "react";

/**
 * Report on the left, profile card on the right at about 25% of the width.
 * The card is sticky, so it stays in view while a long report scrolls.
 */
export function ReportLayout({ report, card }: { report: ReactNode; card: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <div className="order-2 md:order-1">{report}</div>
      <aside aria-label="Candidate profile" className="order-1 md:sticky md:top-6 md:order-2">
        {card}
      </aside>
    </div>
  );
}
