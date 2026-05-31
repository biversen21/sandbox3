import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Fact } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { analyzeReadiness } from '@/lib/readiness';
import { deriveMissingFactIssues } from '@/lib/rules';
import {
  groupFactsByCategory,
  deriveClaimSuggestions,
  buildPlainTextReport,
  getFactValue,
  isCorporateDefendant,
  type FactGroup,
} from '@/lib/report';
import {
  FACT_TYPE_LABELS,
  PRACTICE_AREA_LABELS,
  MATTER_STATUS_LABELS,
  EXTRACTION_METHOD_LABELS,
} from '@/lib/constants';
import { CopyReportButton, PrintButton } from './_components/report-actions';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  return { title: matter ? `Report — ${matter.name}` : 'Matter Not Found' };
}

// ─── Shared helpers ────────────────────────────────────────────────────────

function labelFactType(ft: string): string {
  return (
    FACT_TYPE_LABELS[ft] ??
    ft
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

function scoreColor(score: number): string {
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

function confidenceBadgeColor(confidence: number): string {
  const pct = confidence * 100;
  if (pct >= 90) return 'bg-green-100 text-green-800';
  if (pct >= 75) return 'bg-blue-100 text-blue-800';
  if (pct >= 50) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  critical: { badge: 'bg-red-100 text-red-800', border: 'border-l-red-500' },
  high: { badge: 'bg-orange-100 text-orange-800', border: 'border-l-orange-400' },
  medium: { badge: 'bg-amber-100 text-amber-800', border: 'border-l-amber-400' },
  low: { badge: 'bg-gray-100 text-gray-700', border: 'border-l-gray-300' },
};

// ─── Sub-components ────────────────────────────────────────────────────────

function ReportSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-4 print:mb-3 print:break-inside-avoid print:shadow-none">
      <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-gray-400 text-xs">{number}.</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function CautionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 leading-relaxed">
      {children}
    </p>
  );
}

function FactCard({ fact }: { fact: Fact }) {
  const methodLabel =
    EXTRACTION_METHOD_LABELS[fact.extraction_method] ?? fact.extraction_method;
  const pct = Math.round(fact.confidence * 100);
  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">{labelFactType(fact.fact_type)}</p>
          <p className="text-sm text-gray-900">{fact.value}</p>
          {fact.source_document && (
            <p className="text-xs text-gray-400 mt-0.5">
              Source: {fact.source_document}
              {fact.page_number ? `, p.${fact.page_number}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <span
            className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${confidenceBadgeColor(fact.confidence)}`}
          >
            {pct}%
          </span>
          {fact.human_verified ? (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
              verified
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
              unverified
            </span>
          )}
          <span className="text-xs text-gray-400">{methodLabel}</span>
        </div>
      </div>
    </div>
  );
}

function FactGroupBlock({ group }: { group: FactGroup }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {group.label}
      </h3>
      {group.facts.map((f) => (
        <FactCard key={f.id} fact={f} />
      ))}
    </div>
  );
}

type FactLineItem = { label: string; value: string | null };

function SimpleFactTable({ items }: { items: FactLineItem[] }) {
  return (
    <dl className="space-y-2">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-start gap-4">
          <dt className="text-xs text-gray-500 w-52 shrink-0">{label}</dt>
          <dd
            className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}
          >
            {value ?? 'Not recorded'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  if (!matter) notFound();

  const [facts, rules] = await Promise.all([
    prisma.fact.findMany({ where: { matter_id: id } }),
    prisma.rule.findMany({ where: { practice_area: matter.practice_area } }),
  ]);

  const readiness = analyzeReadiness(facts, rules);
  const missingIssues = deriveMissingFactIssues(rules, facts);
  const factGroups = groupFactsByCategory(facts);
  const claimSuggestions = deriveClaimSuggestions(facts, matter.practice_area);
  const generatedAt = new Date();

  const plainText = buildPlainTextReport(
    matter,
    facts,
    factGroups,
    claimSuggestions,
    readiness,
    missingIssues,
    generatedAt,
  );

  const practiceLabel =
    PRACTICE_AREA_LABELS[matter.practice_area as keyof typeof PRACTICE_AREA_LABELS] ??
    matter.practice_area;
  const statusLabel =
    MATTER_STATUS_LABELS[matter.status as keyof typeof MATTER_STATUS_LABELS] ?? matter.status;

  const isCorporate = isCorporateDefendant(facts);
  const defType = getFactValue(facts, 'defendant_type')?.toLowerCase();
  const defFacts = facts.filter((f) => f.fact_type.startsWith('defendant_'));

  const corporateRequiredFacts = [
    'defendant_incorporation_state',
    'defendant_principal_place_of_business',
    'defendant_service_address',
  ];
  const presentCorporateFacts = corporateRequiredFacts.filter((ft) =>
    facts.some((f) => f.fact_type === ft && f.value.trim()),
  );
  const missingCorporateFacts = corporateRequiredFacts.filter(
    (ft) => !presentCorporateFacts.includes(ft),
  );

  const venueFacts: FactLineItem[] = [
    { label: 'Incident Address', value: getFactValue(facts, 'incident_address') },
    { label: 'Incident County', value: getFactValue(facts, 'incident_county') },
    { label: 'Incident State', value: getFactValue(facts, 'incident_state') },
    { label: 'Plaintiff Residence', value: getFactValue(facts, 'plaintiff_residence') },
  ];

  const jurisdictionFacts: FactLineItem[] = [
    { label: 'Plaintiff Citizenship', value: getFactValue(facts, 'plaintiff_citizenship') },
    {
      label: 'Defendant State of Incorporation',
      value: getFactValue(facts, 'defendant_incorporation_state'),
    },
    {
      label: 'Defendant Principal Place of Business',
      value: getFactValue(facts, 'defendant_principal_place_of_business'),
    },
    {
      label: 'Est. Amount in Controversy',
      value: getFactValue(facts, 'estimated_amount_in_controversy'),
    },
    { label: 'Medical Expenses', value: getFactValue(facts, 'medical_expenses') },
  ];

  const removalFacts: FactLineItem[] = [
    { label: 'Plaintiff Citizenship', value: getFactValue(facts, 'plaintiff_citizenship') },
    {
      label: 'Defendant State of Incorporation',
      value: getFactValue(facts, 'defendant_incorporation_state'),
    },
    {
      label: 'Defendant Principal Place of Business',
      value: getFactValue(facts, 'defendant_principal_place_of_business'),
    },
    {
      label: 'Est. Amount in Controversy',
      value: getFactValue(facts, 'estimated_amount_in_controversy'),
    },
  ];

  return (
    <div>
      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <p className="text-xs text-gray-500">FILING READINESS REPORT</p>
        <h1 className="text-lg font-bold text-gray-900">{matter.name}</h1>
        <p className="text-xs text-gray-400">Generated: {generatedAt.toLocaleString()}</p>
      </div>

      {/* Screen header */}
      <div className="mb-6 print:hidden">
        <Link href={`/matters/${matter.id}`} className="text-sm text-gray-500 hover:text-gray-900">
          ← {matter.name}
        </Link>
        <div className="flex items-start justify-between mt-2 gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Filing Readiness Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Generated from structured facts. Attorney review required before any filing decision.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <CopyReportButton text={plainText} />
            <PrintButton />
          </div>
        </div>
      </div>

      {/* ─── 1. Matter Summary ────────────────────────────────────────────── */}
      <ReportSection number={1} title="Matter Summary">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Practice Area</dt>
            <dd className="text-gray-900 mt-0.5">{practiceLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="text-gray-900 mt-0.5">{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Created</dt>
            <dd className="text-gray-900 mt-0.5">
              {new Date(matter.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Facts on Record</dt>
            <dd className="text-gray-900 mt-0.5">{facts.length}</dd>
          </div>
          {matter.notes && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-500">Notes</dt>
              <dd className="text-gray-900 mt-0.5 whitespace-pre-wrap">{matter.notes}</dd>
            </div>
          )}
        </dl>
      </ReportSection>

      {/* ─── 2. Known Facts ───────────────────────────────────────────────── */}
      <ReportSection number={2} title="Known Facts">
        {facts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No facts recorded for this matter.</p>
        ) : (
          factGroups.map((group) => <FactGroupBlock key={group.category} group={group} />)
        )}
      </ReportSection>

      {/* ─── 3. Defendant Analysis ────────────────────────────────────────── */}
      <ReportSection number={3} title="Defendant Analysis">
        {defFacts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No defendant facts recorded.</p>
        ) : (
          <>
            {defFacts.map((f) => (
              <FactCard key={f.id} fact={f} />
            ))}
            {isCorporate && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Defendant appears to be a corporate or business entity. Corporate citizenship
                  information — including state of incorporation and principal place of business —
                  may be relevant to diversity jurisdiction analysis and service planning. Attorney
                  review required.
                </p>
                {presentCorporateFacts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Corporate facts on record:
                    </p>
                    <ul className="space-y-0.5">
                      {presentCorporateFacts.map((ft) => (
                        <li key={ft} className="text-xs text-green-700 flex items-center gap-1.5">
                          <span>✓</span> {labelFactType(ft)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {missingCorporateFacts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Corporate facts not yet recorded:
                    </p>
                    <ul className="space-y-0.5">
                      {missingCorporateFacts.map((ft) => (
                        <li key={ft} className="text-xs text-gray-400 flex items-center gap-1.5">
                          <span>—</span> {labelFactType(ft)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {defType === 'government' && (
              <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                Defendant is identified as a government entity. Claims against government defendants
                may be subject to additional procedural requirements. Attorney review required.
              </p>
            )}
          </>
        )}
      </ReportSection>

      {/* ─── 4. Venue-Relevant Facts ──────────────────────────────────────── */}
      <ReportSection number={4} title="Venue-Relevant Facts">
        <SimpleFactTable items={venueFacts} />
        <CautionNote>
          These facts may be relevant to venue analysis. No venue determination is made here.
          Attorney review required.
        </CautionNote>
      </ReportSection>

      {/* ─── 5. Jurisdiction-Relevant Facts ──────────────────────────────── */}
      <ReportSection number={5} title="Jurisdiction-Relevant Facts">
        <SimpleFactTable items={jurisdictionFacts} />
        <CautionNote>
          These facts may be relevant to jurisdiction considerations. No jurisdictional conclusion
          is made here. Attorney review required.
        </CautionNote>
      </ReportSection>

      {/* ─── 6. Potential Removal Considerations ─────────────────────────── */}
      <ReportSection number={6} title="Potential Removal Considerations">
        <SimpleFactTable items={removalFacts} />
        {defType === 'government' && (
          <p className="mt-3 text-xs text-gray-600">
            Defendant type: Government entity noted. Federal involvement may raise additional
            jurisdictional considerations. Attorney review required.
          </p>
        )}
        <CautionNote>
          The facts above are commonly relevant to removal analysis. No conclusion about
          removability is made here. Whether removal is available, appropriate, or timely requires
          attorney judgment. Attorney review required.
        </CautionNote>
      </ReportSection>

      {/* ─── 7. Missing Facts ─────────────────────────────────────────────── */}
      <ReportSection number={7} title="Missing Facts">
        {missingIssues.length === 0 ? (
          <p className="text-sm text-gray-500">
            No missing required facts detected based on the current rule pack. Attorney review is
            still required before any filing decision.
          </p>
        ) : (
          <ul className="space-y-2">
            {missingIssues.map((issue) => {
              const styles = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.low;
              return (
                <li
                  key={`${issue.fact_type}-${issue.severity}`}
                  className={`border border-gray-200 border-l-4 ${styles.border} rounded-r-lg bg-white px-3 py-2.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    {issue.why_it_matters}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </ReportSection>

      {/* ─── 8. Potential Claim Categories ───────────────────────────────── */}
      <ReportSection number={8} title="Potential Claim Categories">
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          The following are potential claim categories based on current practice area and structured
          facts. These are suggestions only. They do not constitute legal advice, assess the merits
          of any claim, or identify all applicable theories. Attorney review required.
        </p>
        {claimSuggestions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No specific claim category suggestions based on current structured data. Attorney review
            required.
          </p>
        ) : (
          <ul className="space-y-3">
            {claimSuggestions.map((claim) => (
              <li key={claim.name} className="flex items-start gap-2">
                <span className="text-gray-300 mt-0.5 shrink-0">•</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {claim.name}{' '}
                    <span className="text-xs font-normal text-gray-400">(potential)</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{claim.basis}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ReportSection>

      {/* ─── 9. Filing Readiness Score ────────────────────────────────────── */}
      <ReportSection number={9} title="Filing Readiness Score">
        <div className="flex items-center gap-6 mb-5">
          <div className="text-center shrink-0">
            <div
              className={`text-4xl font-bold tracking-tight ${scoreColor(readiness.overall)}`}
            >
              {readiness.overall}%
            </div>
            <div className="text-xs text-gray-400 mt-1">Overall</div>
          </div>
          <div className="flex-1">
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${scoreBarColor(readiness.overall)} rounded-full`}
                style={{ width: `${readiness.overall}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Deterministic score — no AI involved. Based on {facts.length} structured fact
              {facts.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {readiness.categories.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-gray-600">{cat.label}</span>
                <span className={`text-xs font-semibold ${scoreColor(cat.score)}`}>
                  {cat.score}%
                </span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${scoreBarColor(cat.score)} rounded-full`}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {readiness.primary_blockers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Primary Blockers</p>
            <ul className="space-y-1.5">
              {readiness.primary_blockers.map((blocker) => (
                <li key={blocker.fact_type} className="flex items-start gap-2 text-sm">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  <div>
                    <span className="font-medium text-gray-900">{blocker.title}</span>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      {blocker.why_it_matters}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {readiness.primary_blockers.length === 0 && (
          <p className="text-xs text-gray-500">
            No critical or high-severity facts missing. Attorney review still required.
          </p>
        )}
      </ReportSection>

      {/* ─── 10. Attorney Review Disclaimer ──────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 mb-6 print:break-inside-avoid">
        <h2 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
          <span className="text-gray-400">10.</span>Attorney Review Disclaimer
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>This report is for attorney review only.</strong> It identifies known facts,
          missing information, and procedural considerations based on available matter data. It does
          not provide legal advice, determine where a case should be filed, or replace attorney
          judgment. All scoring is deterministic and based solely on the presence, confidence, and
          verification status of structured facts. The absence of a blocker does not indicate
          filing readiness. All considerations noted here may be relevant — attorney review is
          required before any filing decision is made.
        </p>
      </div>

      {/* Navigation — screen only */}
      <div className="flex gap-3 print:hidden">
        <Link
          href={`/matters/${matter.id}/readiness`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Readiness Score
        </Link>
        <Link
          href={`/matters/${matter.id}/issues`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Issues
        </Link>
        <Link
          href={`/matters/${matter.id}/facts`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit Facts
        </Link>
      </div>
    </div>
  );
}
