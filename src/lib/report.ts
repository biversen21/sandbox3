import type { Fact } from '@prisma/client';
import { FACT_TYPE_LABELS, PRACTICE_AREA_LABELS, MATTER_STATUS_LABELS } from './constants';
import type { ReadinessResult } from './readiness';
import type { DerivedIssue } from './rules';

function labelFactType(ft: string): string {
  return (
    FACT_TYPE_LABELS[ft] ??
    ft
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

export function getFactValue(facts: Fact[], factType: string): string | null {
  return facts.find((f) => f.fact_type === factType)?.value.trim() || null;
}

// Mirrors the applies_when condition in pi_corporate_defendant_facts seed rule
const CORPORATE_ENTITY_TYPES = ['corporation', 'llc', 'partnership', 'other'];

export function isCorporateDefendant(facts: Fact[]): boolean {
  const defType = getFactValue(facts, 'defendant_type')?.toLowerCase() ?? '';
  return CORPORATE_ENTITY_TYPES.some((t) => defType === t || defType.includes(t));
}

// ─── Fact grouping ─────────────────────────────────────────────────────────

export type FactGroup = {
  category: string;
  label: string;
  facts: Fact[];
};

const CATEGORY_DEFS = [
  {
    category: 'plaintiff',
    label: 'Plaintiff',
    types: ['plaintiff_name', 'plaintiff_residence', 'plaintiff_citizenship'],
  },
  {
    category: 'defendant',
    label: 'Defendant',
    types: [
      'defendant_name',
      'defendant_type',
      'defendant_residence',
      'defendant_incorporation_state',
      'defendant_principal_place_of_business',
      'defendant_service_address',
    ],
  },
  {
    category: 'incident',
    label: 'Incident',
    types: ['incident_date', 'incident_address', 'incident_county', 'incident_state'],
  },
  {
    category: 'damages',
    label: 'Damages',
    types: ['medical_expenses', 'lost_wages', 'property_damage', 'estimated_amount_in_controversy'],
  },
] as const;

const ALL_KNOWN_TYPES: Set<string> = new Set(CATEGORY_DEFS.flatMap((c) => [...c.types]));

export function groupFactsByCategory(facts: Fact[]): FactGroup[] {
  const groups: FactGroup[] = CATEGORY_DEFS.map(({ category, label, types }) => ({
    category,
    label,
    facts: facts.filter((f) => (types as readonly string[]).includes(f.fact_type)),
  })).filter((g) => g.facts.length > 0);

  const other = facts.filter((f) => !ALL_KNOWN_TYPES.has(f.fact_type));
  if (other.length > 0) groups.push({ category: 'other', label: 'Other', facts: other });

  return groups;
}

// ─── Claim suggestions ─────────────────────────────────────────────────────

export type ClaimSuggestion = {
  name: string;
  basis: string;
};

export function deriveClaimSuggestions(facts: Fact[], practiceArea: string): ClaimSuggestion[] {
  const suggestions: ClaimSuggestion[] = [];
  const isCorporate = isCorporateDefendant(facts);
  const defType = getFactValue(facts, 'defendant_type')?.toLowerCase() ?? '';
  const hasIncidentFacts =
    !!getFactValue(facts, 'incident_date') || !!getFactValue(facts, 'incident_state');

  if (['personal_injury', 'premises_liability', 'motor_vehicle'].includes(practiceArea)) {
    suggestions.push({
      name: 'Negligence',
      basis:
        'Standard negligence theory is commonly applicable in personal injury matters. Attorney review is required to assess applicable elements and available defenses.',
    });
  }

  if (practiceArea === 'motor_vehicle' && hasIncidentFacts) {
    suggestions.push({
      name: 'Motor Vehicle Negligence',
      basis:
        'Incident facts suggest a motor vehicle-related event. Motor vehicle negligence may be applicable. Attorney review required.',
    });
  }

  if (practiceArea === 'premises_liability') {
    suggestions.push({
      name: 'Premises Liability',
      basis:
        "Practice area indicates a premises-related incident. Attorney review is required to assess landowner duty, the applicable standard of care, and the plaintiff's status on the property.",
    });
  }

  if (isCorporate && hasIncidentFacts) {
    suggestions.push({
      name: 'Vicarious Liability',
      basis:
        'Defendant appears to be a corporate or business entity. Vicarious liability may be applicable if an agent or employee was involved in the incident. Attorney review required.',
    });
    suggestions.push({
      name: 'Negligent Hiring / Supervision / Retention',
      basis:
        'Corporate or entity defendant present. If an agent or employee was involved, claims for negligent hiring, supervision, or retention may be applicable. Attorney review required.',
    });
  }

  if (isCorporate && practiceArea === 'motor_vehicle') {
    suggestions.push({
      name: 'Negligent Entrustment',
      basis:
        'Corporate or entity defendant in a motor vehicle matter. Negligent entrustment may be applicable if a vehicle was provided to an operator. Attorney review required.',
    });
  }

  if (practiceArea === 'premises_liability' && isCorporate) {
    suggestions.push({
      name: 'Negligent Maintenance / Inspection',
      basis:
        'Entity defendant in a premises liability matter. Negligent maintenance or failure to inspect may be applicable. Attorney review required.',
    });
  }

  // Government defendant — note potential for additional considerations
  if (defType === 'government') {
    suggestions.push({
      name: 'Claims Against Government Entity',
      basis:
        'Defendant is identified as a government entity. Claims against government defendants may be subject to specific notice requirements, immunity considerations, and procedural rules. Attorney review required.',
    });
  }

  return suggestions;
}

// ─── Plain text export ─────────────────────────────────────────────────────

type MatterLike = {
  name: string;
  practice_area: string;
  status: string;
  notes: string | null;
  created_at: Date;
};

export function buildPlainTextReport(
  matter: MatterLike,
  facts: Fact[],
  factGroups: FactGroup[],
  claimSuggestions: ClaimSuggestion[],
  readiness: ReadinessResult,
  missingIssues: DerivedIssue[],
  generatedAt: Date,
): string {
  const lines: string[] = [];
  const hr = '─'.repeat(60);

  const practiceLabel =
    PRACTICE_AREA_LABELS[matter.practice_area as keyof typeof PRACTICE_AREA_LABELS] ??
    matter.practice_area;
  const statusLabel =
    MATTER_STATUS_LABELS[matter.status as keyof typeof MATTER_STATUS_LABELS] ?? matter.status;

  lines.push('FILING READINESS REPORT');
  lines.push(hr);
  lines.push(`Matter: ${matter.name}`);
  lines.push(`Generated: ${generatedAt.toLocaleString()}`);
  lines.push('');

  lines.push('1. MATTER SUMMARY');
  lines.push(hr);
  lines.push(`Practice Area: ${practiceLabel}`);
  lines.push(`Status: ${statusLabel}`);
  lines.push(`Created: ${new Date(matter.created_at).toLocaleDateString()}`);
  if (matter.notes) lines.push(`Notes: ${matter.notes}`);
  lines.push('');

  lines.push('2. KNOWN FACTS');
  lines.push(hr);
  if (facts.length === 0) {
    lines.push('No facts recorded.');
  } else {
    for (const group of factGroups) {
      lines.push(`${group.label}:`);
      for (const f of group.facts) {
        const conf = `${Math.round(f.confidence * 100)}% confidence`;
        const verified = f.human_verified ? 'verified' : 'unverified';
        lines.push(`  ${labelFactType(f.fact_type)}: ${f.value} (${conf}, ${verified})`);
        if (f.source_document) {
          const page = f.page_number ? `, p.${f.page_number}` : '';
          lines.push(`    Source: ${f.source_document}${page}`);
        }
      }
      lines.push('');
    }
  }

  const isCorporate = isCorporateDefendant(facts);
  const defFacts = facts.filter((f) => f.fact_type.startsWith('defendant_'));
  lines.push('3. DEFENDANT ANALYSIS');
  lines.push(hr);
  if (defFacts.length === 0) {
    lines.push('No defendant facts recorded.');
  } else {
    for (const f of defFacts) {
      lines.push(`  ${labelFactType(f.fact_type)}: ${f.value}`);
    }
    if (isCorporate) {
      lines.push('');
      lines.push(
        'Defendant appears to be a corporate or business entity. Corporate citizenship information — including state of incorporation and principal place of business — may be relevant to diversity jurisdiction analysis and service planning. Attorney review required.',
      );
    }
  }
  lines.push('');

  const venueFacts = ['incident_address', 'incident_county', 'incident_state', 'plaintiff_residence'];
  lines.push('4. VENUE-RELEVANT FACTS');
  lines.push(hr);
  for (const ft of venueFacts) {
    const val = getFactValue(facts, ft);
    lines.push(`  ${labelFactType(ft)}: ${val ?? '[not recorded]'}`);
  }
  lines.push('');
  lines.push(
    'These facts may be relevant to venue analysis. Attorney review required.',
  );
  lines.push('');

  const jurisdictionFacts = [
    'plaintiff_citizenship',
    'defendant_incorporation_state',
    'defendant_principal_place_of_business',
    'estimated_amount_in_controversy',
    'medical_expenses',
  ];
  lines.push('5. JURISDICTION-RELEVANT FACTS');
  lines.push(hr);
  for (const ft of jurisdictionFacts) {
    const val = getFactValue(facts, ft);
    lines.push(`  ${labelFactType(ft)}: ${val ?? '[not recorded]'}`);
  }
  lines.push('');
  lines.push(
    'These facts may be relevant to jurisdiction considerations. Attorney review required.',
  );
  lines.push('');

  const removalFacts = [
    'plaintiff_citizenship',
    'defendant_incorporation_state',
    'defendant_principal_place_of_business',
    'estimated_amount_in_controversy',
  ];
  lines.push('6. POTENTIAL REMOVAL CONSIDERATIONS');
  lines.push(hr);
  for (const ft of removalFacts) {
    const val = getFactValue(facts, ft);
    lines.push(`  ${labelFactType(ft)}: ${val ?? '[not recorded]'}`);
  }
  const defType = getFactValue(facts, 'defendant_type')?.toLowerCase();
  if (defType === 'government') {
    lines.push('  Defendant Type: Government entity noted.');
  }
  lines.push('');
  lines.push(
    'These facts may be relevant to removal considerations. No conclusion about removability is made here. Attorney review required.',
  );
  lines.push('');

  lines.push('7. MISSING FACTS');
  lines.push(hr);
  if (missingIssues.length === 0) {
    lines.push('No missing required facts detected.');
  } else {
    for (const issue of missingIssues) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.title}`);
      lines.push(`    Why it matters: ${issue.why_it_matters}`);
    }
  }
  lines.push('');

  lines.push('8. POTENTIAL CLAIM CATEGORIES');
  lines.push(hr);
  lines.push(
    'The following are potential claim categories for attorney review only. They are not legal advice and do not constitute legal conclusions.',
  );
  lines.push('');
  if (claimSuggestions.length === 0) {
    lines.push(
      'No specific claim category suggestions based on current structured data. Attorney review required.',
    );
  } else {
    for (const claim of claimSuggestions) {
      lines.push(`  • ${claim.name} (potential)`);
      lines.push(`    ${claim.basis}`);
    }
  }
  lines.push('');

  lines.push('9. FILING READINESS SCORE');
  lines.push(hr);
  lines.push(`Overall Readiness: ${readiness.overall}%`);
  lines.push('');
  lines.push('Category Scores:');
  for (const cat of readiness.categories) {
    const label = cat.key === 'provenance' ? 'verified' : 'required';
    lines.push(
      `  ${cat.label}: ${cat.score}% (${cat.present_count}/${cat.required_count} ${label})`,
    );
  }
  if (readiness.primary_blockers.length > 0) {
    lines.push('');
    lines.push('Primary Blockers:');
    for (const b of readiness.primary_blockers) {
      lines.push(`  • ${b.title}`);
      lines.push(`    ${b.why_it_matters}`);
    }
  }
  lines.push('');

  lines.push('10. ATTORNEY REVIEW DISCLAIMER');
  lines.push(hr);
  lines.push(
    'This report is for attorney review only. It identifies known facts, missing information, and procedural considerations based on available matter data. It does not provide legal advice, determine where a case should be filed, or replace attorney judgment. All scoring is deterministic and based solely on the presence, confidence, and verification status of structured facts. The absence of a blocker does not indicate filing readiness. All considerations noted here may be relevant — attorney review is required before any filing decision is made.',
  );

  return lines.join('\n');
}
