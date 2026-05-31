import type { Rule, Fact } from '@prisma/client';
import {
  isRuleApplicable,
  parseRequiredFactTypes,
  getPresentFactTypes,
  deriveMissingFactIssues,
  deriveLowConfidenceIssues,
  deriveNeedsReviewIssues,
  type DerivedIssue,
} from './rules';

export const LOW_CONFIDENCE_THRESHOLD = 0.75;

export type CategoryScore = {
  key: string;
  label: string;
  weight: number;      // 0–1, used in weighted average
  score: number;       // 0–100
  required_count: number;
  present_count: number;
  missing_fact_types: string[];
};

export type ReadinessResult = {
  overall: number;                    // 0–100, weighted average
  categories: CategoryScore[];
  primary_blockers: DerivedIssue[];   // critical + high missing facts
  missing_issues: DerivedIssue[];
  low_confidence_issues: DerivedIssue[];
  needs_review_issues: DerivedIssue[];
};

// Category definitions drive the scoring independent of DB rules.
// Required fact types per category come from the PI rule pack.
// The defendant category expands dynamically when the corporate rule applies.
const CATEGORY_DEFS = [
  {
    key: 'plaintiff',
    label: 'Plaintiff Facts',
    weight: 0.2,
    base_required: ['plaintiff_name', 'plaintiff_residence'],
  },
  {
    key: 'defendant',
    label: 'Defendant Facts',
    weight: 0.25,
    base_required: ['defendant_name', 'defendant_type'],
  },
  {
    key: 'incident',
    label: 'Incident Facts',
    weight: 0.25,
    base_required: ['incident_date', 'incident_address', 'incident_county', 'incident_state'],
  },
  {
    key: 'damages',
    label: 'Damages Facts',
    weight: 0.2,
    base_required: ['medical_expenses', 'estimated_amount_in_controversy'],
  },
  {
    key: 'provenance',
    label: 'Provenance & Review',
    weight: 0.1,
    base_required: [], // scored by verification + confidence, not by fact type presence
  },
] as const;

function provenanceScore(facts: Fact[]): number {
  if (facts.length === 0) return 0;
  const verifiedRatio = facts.filter((f) => f.human_verified).length / facts.length;
  const confidentRatio =
    facts.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD).length / facts.length;
  return Math.round(((verifiedRatio + confidentRatio) / 2) * 100);
}

export function analyzeReadiness(facts: Fact[], rules: Rule[]): ReadinessResult {
  const present = getPresentFactTypes(facts);

  // Determine if the corporate defendant rule is applicable
  const corporateRule = rules.find((r) => r.rule_key === 'pi_corporate_defendant_facts');
  const corporateApplies = corporateRule ? isRuleApplicable(corporateRule, facts) : false;

  // Score each category
  const categories: CategoryScore[] = CATEGORY_DEFS.map((def) => {
    if (def.key === 'provenance') {
      const pScore = provenanceScore(facts);
      return {
        key: def.key,
        label: def.label,
        weight: def.weight,
        score: pScore,
        required_count: facts.length,
        present_count: facts.filter((f) => f.human_verified).length,
        missing_fact_types: [],
      };
    }

    const required: string[] = [...def.base_required];

    // Expand defendant category with corporate requirements when applicable
    if (def.key === 'defendant' && corporateApplies && corporateRule) {
      const extra = parseRequiredFactTypes(corporateRule.required_fact_types);
      for (const ft of extra) {
        if (!required.includes(ft)) required.push(ft);
      }
    }

    const missing = required.filter((ft) => !present.has(ft));
    const present_count = required.length - missing.length;
    const score = required.length > 0 ? Math.round((present_count / required.length) * 100) : 100;

    return {
      key: def.key,
      label: def.label,
      weight: def.weight,
      score,
      required_count: required.length,
      present_count,
      missing_fact_types: missing,
    };
  });

  const overall = Math.round(categories.reduce((sum, c) => sum + c.score * c.weight, 0));

  const missing_issues = deriveMissingFactIssues(rules, facts);
  const low_confidence_issues = deriveLowConfidenceIssues(facts);
  const needs_review_issues = deriveNeedsReviewIssues(facts);

  const primary_blockers = missing_issues.filter(
    (i) => i.severity === 'critical' || i.severity === 'high',
  );

  return {
    overall,
    categories,
    primary_blockers,
    missing_issues,
    low_confidence_issues,
    needs_review_issues,
  };
}
