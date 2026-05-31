import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
        Plaintiff Filing Readiness Analyzer
      </h1>
      <p className="text-sm text-gray-500 max-w-sm">
        Identify, organize, and validate filing-critical facts before your matter is ready to file.
      </p>
      <Link
        href="/matters"
        className="mt-2 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        View Matters
      </Link>
    </div>
  );
}
