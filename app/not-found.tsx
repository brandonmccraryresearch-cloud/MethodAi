import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-center">
        <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">404 · Not Found</div>
        <h1 className="text-xl font-bold text-slate-900">Workspace Route Not Found</h1>
        <p className="text-sm text-slate-600">
          The requested page does not exist in this UM-1 Workbench session.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          Return to Workbench
        </Link>
      </div>
    </div>
  );
}
