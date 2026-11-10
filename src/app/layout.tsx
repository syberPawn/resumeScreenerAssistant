import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import "./globals.css";

// The Geist font ships inside the "geist" package, so building and testing need no download.

export const metadata: Metadata = {
  title: "Resume Screening Assistant",
  description: "Compare a resume with a job description and get a structured match report.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900">
        {children}
        <footer className="border-t border-zinc-200 bg-white">
          <div className="mx-auto w-full max-w-7xl px-6 py-4 text-sm">
            <Link
              href="/privacy"
              className="rounded text-zinc-600 underline underline-offset-2 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Privacy policy
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
