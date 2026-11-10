import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
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
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900">{children}</body>
    </html>
  );
}
