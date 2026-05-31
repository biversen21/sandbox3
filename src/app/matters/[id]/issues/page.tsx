import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { analyzeReadiness } from '@/lib/readiness';
import type { DerivedIssue } from '@/lib/rules';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  return { title: matter ? `Issues — ${matter.name}` : 'Matter Not Found' };
}

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  critical: { badge: 'bg-red-100 text-red-800', border: 'border-l-red-500' },
  high: { badge: 'bg-orange-100 text-orange-800', border: 'border-l-orange-400' },
  medium: { badge: 'bg-amber-100 text-amber-800', border: 'border-l-amber-400' },
  low: { badge: 'bg-gray-100 text-gray-700', border: 'border-l-gray-300' },
};

function IssueCard({ issue }: { issue: DerivedIssue }) {
  const styles = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.low;
  return (
    <div className={`border border-gray-200 border-l-4 ${styles.border} rounded-r-lg bg-white px-4 py-3`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-900">{issue.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
          {issue.severity}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500 leading-relaxed">{issue.why_it_matters}</p>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {count}
      </span>
    </div>
  );
}

export default async function IssuesPage({ params }: Props) {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  if (!matter) notFound();

  const [facts, rules] = await Promise.all([
    prisma.fact.findMany({ where: { matter_id: id } }),
    prisma.rule.findMany({ where: { practice_area: matter.practice_area } }),
  ]);

  const { missing_issues, low_confidence_issues, needs_review_issues } = analyzeReadiness(
    facts,
    rules,
  );

  const totalIssues =
    missing_issues.length + low_confidence_issues.length + needs_review_issues.length;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/matters/${matter.id}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {matter.name}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-xl font-semibold text-gray-900">Issues</h1>
          {totalIssues > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              {totalIssues}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Derived from structured matter data and the PI rule pack. Attorney review required.
        </p>
      </div>

      {totalIssues === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm font-medium text-gray-700">No issues detected.</p>
          <p className="text-xs text-gray-400 mt-1">
            All required facts are present, verified, and high-confidence.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {missing_issues.length > 0 && (
            <section>
              <SectionHeader title="Missing Required Facts" count={missing_issues.length} />
              <div className="space-y-2">
                {missing_issues.map((issue) => (
                  <IssueCard key={`missing-${issue.fact_type}`} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {low_confidence_issues.length > 0 && (
            <section>
              <SectionHeader title="Low Confidence Facts" count={low_confidence_issues.length} />
              <div className="space-y-2">
                {low_confidence_issues.map((issue) => (
                  <IssueCard key={`confidence-${issue.fact_type}`} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {needs_review_issues.length > 0 && (
            <section>
              <SectionHeader title="Facts Needing Review" count={needs_review_issues.length} />
              <div className="space-y-2">
                {needs_review_issues.map((issue) => (
                  <IssueCard key={`review-${issue.fact_type}`} issue={issue} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>Attorney Review Required.</strong> This page identifies missing information,
          low-confidence facts, and unverified data based on structured matter data and the current
          rule pack. It does not provide legal advice, assess the merits of any claim, or replace
          attorney judgment. All findings require attorney review before action is taken.
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          href={`/matters/${matter.id}/readiness`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Readiness Score →
        </Link>
        <Link
          href={`/matters/${matter.id}/facts`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Facts
        </Link>
      </div>
    </div>
  );
}
