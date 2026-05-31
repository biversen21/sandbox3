import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { PRACTICE_AREA_LABELS, MATTER_STATUS_LABELS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Matters — Filing Readiness' };

export default async function MattersPage() {
  const matters = await prisma.matter.findMany({ orderBy: { created_at: 'desc' } });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Matters</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {matters.length} matter{matters.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/matters/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          New Matter
        </Link>
      </div>

      {matters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No matters yet.</p>
          <Link
            href="/matters/new"
            className="mt-3 inline-block text-sm font-medium text-gray-900 underline"
          >
            Create your first matter
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-200 bg-white">
          {matters.map((matter) => (
            <Link
              key={matter.id}
              href={`/matters/${matter.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{matter.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {PRACTICE_AREA_LABELS[matter.practice_area as keyof typeof PRACTICE_AREA_LABELS] ??
                    matter.practice_area}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-4 shrink-0">
                <span className="text-xs text-gray-600">
                  {MATTER_STATUS_LABELS[matter.status as keyof typeof MATTER_STATUS_LABELS] ??
                    matter.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(matter.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
