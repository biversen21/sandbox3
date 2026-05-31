import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { FACT_TYPE_LABELS, EXTRACTION_METHOD_LABELS } from '@/lib/constants';
import { AddFactForm } from './_components/add-fact-form';
import { FactActions } from './_components/fact-actions';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  return { title: matter ? `Facts — ${matter.name}` : 'Matter Not Found' };
}

function formatConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

function labelFactType(factType: string): string {
  return (
    FACT_TYPE_LABELS[factType] ??
    factType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

function labelMethod(method: string): string {
  return EXTRACTION_METHOD_LABELS[method] ?? method;
}

export default async function FactsPage({ params }: Props) {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  if (!matter) notFound();

  const facts = await prisma.fact.findMany({
    where: { matter_id: id },
    orderBy: { created_at: 'desc' },
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href={`/matters/${matter.id}`}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← {matter.name}
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-2">Facts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {facts.length} fact{facts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href={`/matters/${matter.id}/intake`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Intake
        </Link>
      </div>

      <AddFactForm matterId={matter.id} />

      {facts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center mt-4">
          <p className="text-sm text-gray-500">No facts yet.</p>
          <Link
            href={`/matters/${matter.id}/intake`}
            className="mt-2 inline-block text-sm font-medium text-gray-900 underline"
          >
            Fill out intake to create facts
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Value</th>
                <th className="px-3 py-2.5">Confidence</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Source</th>
                <th className="px-3 py-2.5">Verified</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {facts.map((fact) => (
                <tr key={fact.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {labelFactType(fact.fact_type)}
                  </td>
                  <td className="px-3 py-2.5 text-gray-700 max-w-xs truncate">{fact.value}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                    {formatConfidence(fact.confidence)}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                    {labelMethod(fact.extraction_method)}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                    {fact.source_document
                      ? `${fact.source_document}${fact.page_number ? ` p.${fact.page_number}` : ''}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {fact.human_verified ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <FactActions factId={fact.id} verified={fact.human_verified} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
