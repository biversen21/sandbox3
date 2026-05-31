import type { Rule, Fact } from '@prisma/client';
import { FACT_TYPE_LABELS } from './constants';

// ─── Safe JSON parsers (never scattered across app code) ───────────────────

export function parseRequiredFactTypes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    return [];
  } catch {
    return [];
  }
}

export function parseAppliesWhen(raw: string | null | undefined): Record<string, string[]> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string[]>;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Fact helpers ──────────────────────────────────────────────────────────

export function getPresentFactTypes(facts: Fact[]): Set<string> {
  return new Set(facts.filter((f) => f.value.trim() !== '').map((f) => f.fact_type));
}

export function getFactValue(facts: Fact[], factType: string): string | null {
  return facts.find((f) => f.fact_type === factType)?.value.trim() || null;
}

// ─── Rule evaluation ───────────────────────────────────────────────────────

export function isRuleApplicable(rule: Rule, facts: Fact[]): boolean {
  const condition = parseAppliesWhen(rule.applies_when);
  if (!condition) return true;

  for (const [factType, allowedValues] of Object.entries(condition)) {
    const factValue = getFactValue(facts, factType);
    if (!factValue) return false;
    const lower = factValue.toLowerCase();
    const matched = (allowedValues as string[]).some(
      (v) => lower === v.toLowerCase() || lower.includes(v.toLowerCase()),
    );
    if (!matched) return false;
  }
  return true;
}

export function getMissingRequiredFacts(rule: Rule, facts: Fact[]): string[] {
  const required = parseRequiredFactTypes(rule.required_fact_types);
  const present = getPresentFactTypes(facts);
  return required.filter((ft) => !present.has(ft));
}

// ─── Issue derivation (not persisted — derived from rules + facts) ─────────

export type DerivedIssue = {
  issue_type: 'missing_fact' | 'low_confidence' | 'needs_review';
  severity: 'critical' | 'high' | 'medium' | 'low';
  fact_type: string;
  title: string;
  why_it_matters: string;
};

const LOW_CONFIDENCE_THRESHOLD = 0.75;

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function labelFactType(factType: string): string {
  return (
    FACT_TYPE_LABELS[factType] ??
    factType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

export function deriveMissingFactIssues(rules: Rule[], facts: Fact[]): DerivedIssue[] {
  const issues: DerivedIssue[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    if (!isRuleApplicable(rule, facts)) continue;
    const missing = getMissingRequiredFacts(rule, facts);

    for (const factType of missing) {
      if (seen.has(factType)) continue;
      seen.add(factType);
      issues.push({
        issue_type: 'missing_fact',
        severity: rule.severity as DerivedIssue['severity'],
        fact_type: factType,
        title: labelFactType(factType),
        why_it_matters: rule.why_it_matters,
      });
    }
  }

  return issues.sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4),
  );
}

export function deriveLowConfidenceIssues(facts: Fact[]): DerivedIssue[] {
  return facts
    .filter((f) => f.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map((f) => ({
      issue_type: 'low_confidence' as const,
      severity: (f.confidence < 0.5 ? 'high' : 'medium') as DerivedIssue['severity'],
      fact_type: f.fact_type,
      title: `${labelFactType(f.fact_type)} — ${Math.round(f.confidence * 100)}% confidence`,
      why_it_matters:
        'This fact has low confidence and may require additional verification or documentation before filing.',
    }))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4));
}

export function deriveNeedsReviewIssues(facts: Fact[]): DerivedIssue[] {
  return facts
    .filter((f) => !f.human_verified)
    .map((f) => ({
      issue_type: 'needs_review' as const,
      severity: 'low' as const,
      fact_type: f.fact_type,
      title: labelFactType(f.fact_type),
      why_it_matters:
        'This fact has not been verified by a human reviewer. Attorney review is recommended before relying on this information.',
    }));
}
