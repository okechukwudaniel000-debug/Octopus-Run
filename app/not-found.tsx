import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#f4f4f4] text-slate-900 font-mono">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-slate-600 mb-4 text-sm">Could not find requested resource</p>
      <Link
        href="/"
        className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors shadow-xs"
      >
        Return to Game
      </Link>
    </div>
  );
}
