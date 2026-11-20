import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UM-1 Unified Methodology Workbench',
  description:
    'Operational research workbench for Unified Methodology UM-1 Skill v3.1, merging HLRE v5.1 (v2.1 rules; [MV] scope DECIDED: keep — both kernel-backed 4K and Computational-F1 closed-ledger re-derivation 4D earn [MV]/F1, never narrowed to kernel-only) and the CAOS Operating System for claim registration, Hypothesis Arena tournaments, frozen EXP-NNN hypotheses, preflight gates, computable grading, withdrawal ledgers, and RESUME.md handoffs.',
  openGraph: {
    title: 'UM-1 Unified Methodology Workbench',
    description:
      'Operational research workbench for Unified Methodology UM-1 Skill v3.1, Hypothesis Arena, and the CAOS Operating System.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UM-1 Unified Methodology Workbench',
    description:
      'Operational research workbench for Unified Methodology UM-1 Skill v3.1, Hypothesis Arena, and the CAOS Operating System.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
