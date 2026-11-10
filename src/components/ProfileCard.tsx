import type { ReactNode } from "react";
import { isValidEmail, isValidPhone } from "@/lib/contact-check";
import type { Profile } from "@/lib/types";

/**
 * The candidate's profile card. A detail missing from the resume is left off.
 * All values are shown as plain text; mailto: and tel: links are built only from validated values.
 */
export function ProfileCard({ profile }: { profile: Profile | null }) {
  if (!profile) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5" aria-busy="true">
        <p className="sr-only" role="status">
          Loading the candidate&apos;s profile…
        </p>
        <div className="flex animate-pulse flex-col gap-3" aria-hidden="true">
          <div className="h-5 w-3/4 rounded bg-zinc-200" />
          <div className="h-4 w-1/2 rounded bg-zinc-200" />
          <div className="h-4 w-2/3 rounded bg-zinc-200" />
          <div className="h-4 w-1/2 rounded bg-zinc-200" />
        </div>
      </div>
    );
  }

  const years = profile.yearsOfExperience;
  const details: { label: string; value: ReactNode }[] = [];
  if (profile.currentRole) details.push({ label: "Current role", value: profile.currentRole });
  if (years !== null) {
    details.push({ label: "Experience", value: `${years} ${years === 1 ? "year" : "years"}` });
  }
  if (profile.location) details.push({ label: "Location", value: profile.location });
  if (profile.email && isValidEmail(profile.email)) {
    details.push({
      label: "Email",
      value: (
        <a className="break-all text-indigo-700 underline underline-offset-2" href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
      ),
    });
  }
  if (profile.phone && isValidPhone(profile.phone)) {
    details.push({
      label: "Phone",
      value: (
        <a className="text-indigo-700 underline underline-offset-2" href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`}>
          {profile.phone}
        </a>
      ),
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Candidate</p>
      <h2 className="mt-1 break-words text-lg font-semibold text-zinc-900">{profile.name}</h2>
      {details.length > 0 && (
        <dl className="mt-4 flex flex-col gap-3">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-xs font-medium text-zinc-500">{detail.label}</dt>
              <dd className="break-words text-sm text-zinc-900">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
