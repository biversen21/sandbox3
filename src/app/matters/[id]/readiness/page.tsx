import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { analyzeReadiness, type CategoryScore } from '@/lib/readiness';
import { FACT_TYPE_LABELS } from '@/lib/constants';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  return { title: matter ? `Readiness — ${matter.name}` : 'Matter Not Found' };
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

function scoreTextColor(score: number): string {
  if (score >= 90) return 'text-green-700';
  if (score >= 70) return 'text-blue-700';
  if (score >= 40) return 'text-amber-700';
  return 'text-red-700';
}

function scoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function CategoryRow({ cat }: { cat: CategoryScore }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-sm font-medium text-gray-900">{cat.label}</span>
          <span className="ml-2 text-xs text-gray-400">
            {cat.key !== 'provenance'
              ? `${cat.present_count} / ${cat.required_count} required`
              : `${cat.present_count} / ${cat.required_count} verified`}
          </span>
        </div>
        <span className={`text-sm font-semibold ${scoreTextColor(cat.score)}`}>
          {cat.score}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${scoreBarColor(cat.score)} rounded-full transition-all`}
          style={{ width: `${cat.score}%` }}
        />
      </div>
    </div>
  );
}

export default async function ReadinessPage({ params }: Props) {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  if (!matter) notFound();

  const [facts, rules] = await Promise.all([
    prisma.fact.findMany({ where: { matter_id: id } }),
    prisma.rule.findMany({ where: { practice_area: matter.practice_area } }),
  ]);

  const result = analyzeReadiness(facts, rules);

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/matters/${matter.id}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {matter.name}
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Filing Readiness</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Deterministic score based on present, verified, and high-confidence facts.
          Attorney review required.
        </p>
      </div>

      {/* Overall score */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 mb-5 flex items-center gap-6">
        <div className="text-center shrink-0">
          <div className={`text-5xl font-bold tracking-tight ${scoreTextColor(result.overall)}`}>
            {result.overall}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Overall Readiness</div>
        </div>
        <div className="flex-1">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${scoreBarColor(result.overall)} rounded-full`}
              style={{ width: `${result.overall}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Based on {facts.length} fact{facts.length !== 1 ? 's' : ''} across{' '}
            {result.missing_issues.length} missing,{' '}
            {result.low_confidence_issues.length} low-confidence, and{' '}
            {result.needs_review_issues.length} unverified item
            {result.needs_review_issues.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      {/* Category scores */}
      <div className="rounded-lg border border-gray-200 bg-white px-4 pb-1 mb-5">
        <h2 className="text-sm font-semibold text-gray-900 pt-4 pb-2">Category Scores</h2>
        {result.categories.map((cat) => (
          <CategoryRow key={cat.key} cat={cat} />
        ))}
        <p className="text-xs text-gray-400 py-2">
          Weights: Plaintiff 20% · Defendant 25% · Incident 25% · Damages 20% · Provenance 10%
        </p>
      </div>

      {/* Primary blockers */}
      {result.primary_blockers.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Primary Blockers</h2>
          <ul className="space-y-2">
            {result.primary_blockers.map((blocker) => (
              <li
                key={blocker.fact_type}
                className="flex items-start gap-2 text-sm"
              >
                <span className="mt-0.5 shrink-0 text-red-500">•</span>
                <div>
                  <span className="font-medium text-gray-900">
                    {labelFactType(blocker.fact_type)}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    — currently missing from structured matter data
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {blocker.why_it_matters}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.primary_blockers.length === 0 && result.overall < 100 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Primary Blockers</h2>
          <p className="text-sm text-gray-500">
            No critical or high-severity facts are missing. Review issues page for remaining
            items.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mb-6">
        <Link
          href={`/matters/${matter.id}/issues`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View All Issues →
        </Link>
        <Link
          href={`/matters/${matter.id}/intake`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Intake
        </Link>
      </div>

      {/* Compliance disclaimer */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>Attorney Review Required.</strong> This report is for attorney review only. It
          identifies known facts, missing information, and procedural considerations based on
          available matter data. It does not provide legal advice, determine where a case should
          be filed, or replace attorney judgment. All scoring is deterministic and based solely on
          the presence, confidence, and verification status of structured facts. The absence of a
          blocker does not indicate filing readiness. All considerations noted here may be
          relevant — attorney review is required before any filing decision is made.
        </p>
      </div>
    </div>
  );
}
