import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { PRACTICE_AREA_LABELS, MATTER_STATUS_LABELS } from '@/lib/constants';
import { DeleteMatterButton } from '../_components/delete-button';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  return { title: matter ? `${matter.name} — Filing Readiness` : 'Matter Not Found' };
}

const LINKED_SECTIONS = [
  { key: 'intake', label: 'Intake', href: (id: string) => `/matters/${id}/intake` },
  { key: 'facts', label: 'Facts', href: (id: string) => `/matters/${id}/facts` },
  { key: 'issues', label: 'Issues', href: (id: string) => `/matters/${id}/issues` },
  { key: 'readiness', label: 'Filing Readiness', href: (id: string) => `/matters/${id}/readiness` },
  { key: 'report', label: 'Filing Readiness Report', href: (id: string) => `/matters/${id}/report` },
  { key: 'documents', label: 'Documents', href: (id: string) => `/matters/${id}/documents` },
] as const;

const PLACEHOLDER_SECTIONS: { key: string; label: string }[] = [];

export default async function MatterDetailPage({ params }: Props) {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });

  if (!matter) notFound();

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/matters" className="text-sm text-gray-500 hover:text-gray-900">
            ← Matters
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-2">{matter.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/matters/${matter.id}/edit`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
          <DeleteMatterButton id={matter.id} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Matter Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Practice Area</dt>
            <dd className="text-gray-900 mt-0.5">
              {PRACTICE_AREA_LABELS[matter.practice_area as keyof typeof PRACTICE_AREA_LABELS] ??
                matter.practice_area}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="text-gray-900 mt-0.5">
              {MATTER_STATUS_LABELS[matter.status as keyof typeof MATTER_STATUS_LABELS] ??
                matter.status}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-900 mt-0.5">
              {new Date(matter.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Last Updated</dt>
            <dd className="text-gray-900 mt-0.5">
              {new Date(matter.updated_at).toLocaleDateString()}
            </dd>
          </div>
          {matter.notes && (
            <div className="col-span-2">
              <dt className="text-gray-500">Notes</dt>
              <dd className="text-gray-900 mt-0.5 whitespace-pre-wrap">{matter.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-2">
        {LINKED_SECTIONS.map(({ key, label, href }) => (
          <Link
            key={key}
            href={href(matter.id)}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
          >
            <h2 className="text-sm font-medium text-gray-900">{label}</h2>
            <span className="text-xs text-gray-400">→</span>
          </Link>
        ))}
        {PLACEHOLDER_SECTIONS.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3"
          >
            <h2 className="text-sm font-medium text-gray-500">{label}</h2>
            <span className="text-xs text-gray-400">Coming in next PR</span>
          </div>
        ))}
      </div>
    </div>
  );
}
