import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Privacy policy · Resume Screening Assistant" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <article className="flex flex-col gap-8 text-sm leading-6 text-zinc-700">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900">Privacy policy</h1>
            <p className="text-zinc-500">Last updated: 10 November 2026</p>
            <p>
              Resume Screening Assistant is a demo application. HR uses it to compare a candidate&apos;s resume with a job
              description. Resumes contain personal data, so this page explains what the app does with it.
            </p>
          </header>

          <Section title="What the app processes">
            <List
              items={[
                "The job descriptions and resumes that you type or upload (.pdf or .docx).",
                "From each resume, the candidate's name, current role, years of experience, location, email and phone number.",
              ]}
            />
          </Section>

          <Section title="How it is used">
            <p>
              The text is used only to produce the analysis: the candidate profile, the match score, the matching skills,
              the gaps and the suggested interview questions. It is not used for anything else.
            </p>
          </Section>

          <Section title="What is stored">
            <List
              items={[
                <>
                  <strong>Uploaded files are never stored.</strong> They are read in the server&apos;s memory, turned into
                  text and discarded.
                </>,
                <>
                  <strong>Resume text is never stored.</strong> It stays in your browser until you click Reviewed or close
                  the page.
                </>,
                <>
                  <strong>Saved for History:</strong> the candidate&apos;s profile details, the job description and the
                  analysis report.
                </>,
                "An email address or phone number is saved only if it appears in the resume itself.",
              ]}
            />
          </Section>

          <Section title="Who processes the data">
            <List
              items={[
                <>
                  <strong>Google (Gemini API)</strong> analyses the job description and resume text. This demo uses
                  Google&apos;s free tier, where Google may use submitted content to improve its products. Use sample
                  resumes, or resumes whose owners have agreed to this.
                </>,
                <>
                  <strong>Supabase</strong> hosts the database that stores the History.
                </>,
                <>
                  <strong>Vercel</strong> hosts the app and runs its server code.
                </>,
              ]}
            />
          </Section>

          <Section title="How long data is kept, and how to remove it">
            <p>
              Saved analyses are kept until they are deleted. On the History page, any analysis can be deleted, or the
              whole History at once. Deletion is permanent and cannot be undone. If a candidate asks for their data to
              be removed, HR deletes their analyses from History.
            </p>
          </Section>

          <Section title="Security">
            <List
              items={[
                "The database can be reached only by the app's server, never directly from a browser.",
                "API keys are kept on the server only. They are never sent to the browser and never written to logs.",
                "Server logs never contain resume text, job descriptions or analysis results.",
              ]}
            />
          </Section>

          <Section title="Cookies and tracking">
            <p>The app sets no cookies and uses no analytics or tracking.</p>
          </Section>

          <Section title="Access">
            <p>
              This demo has no sign-in, so anyone with the link can use it and view the History. Do not enter real
              candidates&apos; data without their agreement.
            </p>
          </Section>
        </article>
      </main>
    </>
  );
}
