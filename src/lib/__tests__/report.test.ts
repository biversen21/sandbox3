import { describe, it, expect } from 'vitest';
import {
  getFactValue,
  isCorporateDefendant,
  groupFactsByCategory,
  deriveClaimSuggestions,
  buildPlainTextReport,
} from '@/lib/report';
import type { ReadinessResult } from '@/lib/readiness';
import type { DerivedIssue } from '@/lib/rules';
import { makeFact } from './fixtures';

// ─── getFactValue ───────────────────────────────────────────────────────────

describe('report.getFactValue', () => {
  it('returns trimmed value for a matching fact_type', () => {
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: '  Jane  ' })];
    expect(getFactValue(facts, 'plaintiff_name')).toBe('Jane');
  });

  it('returns null when fact_type is not found', () => {
    expect(getFactValue([], 'plaintiff_name')).toBeNull();
  });

  it('returns null for whitespace-only value', () => {
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: '   ' })];
    expect(getFactValue(facts, 'plaintiff_name')).toBeNull();
  });
});

// ─── isCorporateDefendant ───────────────────────────────────────────────────

describe('isCorporateDefendant', () => {
  it.each(['corporation', 'llc', 'partnership', 'other'])(
    'returns true for defendant_type "%s"',
    (type) => {
      const facts = [makeFact({ fact_type: 'defendant_type', value: type })];
      expect(isCorporateDefendant(facts)).toBe(true);
    },
  );

  it('returns false for defendant_type "individual"', () => {
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'individual' })];
    expect(isCorporateDefendant(facts)).toBe(false);
  });

  it('returns false for defendant_type "government"', () => {
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'government' })];
    expect(isCorporateDefendant(facts)).toBe(false);
  });

  it('is case-insensitive', () => {
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'Corporation' })];
    expect(isCorporateDefendant(facts)).toBe(true);
  });

  it('returns false when no defendant_type fact exists', () => {
    expect(isCorporateDefendant([])).toBe(false);
  });
});

// ─── groupFactsByCategory ───────────────────────────────────────────────────

describe('groupFactsByCategory', () => {
  it('returns empty array for no facts', () => {
    expect(groupFactsByCategory([])).toEqual([]);
  });

  it('places plaintiff_name into the plaintiff category', () => {
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: 'Jane' })];
    const groups = groupFactsByCategory(facts);
    const plaintiff = groups.find((g) => g.category === 'plaintiff');
    expect(plaintiff).toBeDefined();
    expect(plaintiff!.facts).toHaveLength(1);
  });

  it('places defendant_name into the defendant category', () => {
    const facts = [makeFact({ fact_type: 'defendant_name', value: 'Acme' })];
    const groups = groupFactsByCategory(facts);
    const defendant = groups.find((g) => g.category === 'defendant');
    expect(defendant).toBeDefined();
  });

  it('places incident_date into the incident category', () => {
    const facts = [makeFact({ fact_type: 'incident_date', value: '2024-01-01' })];
    const groups = groupFactsByCategory(facts);
    expect(groups.find((g) => g.category === 'incident')).toBeDefined();
  });

  it('places medical_expenses into the damages category', () => {
    const facts = [makeFact({ fact_type: 'medical_expenses', value: '$50,000' })];
    const groups = groupFactsByCategory(facts);
    expect(groups.find((g) => g.category === 'damages')).toBeDefined();
  });

  it('places unknown fact_type into the other category', () => {
    const facts = [makeFact({ fact_type: 'some_unknown_fact', value: 'foo' })];
    const groups = groupFactsByCategory(facts);
    const other = groups.find((g) => g.category === 'other');
    expect(other).toBeDefined();
    expect(other!.facts[0].fact_type).toBe('some_unknown_fact');
  });

  it('excludes empty categories from the result', () => {
    // Only plaintiff facts — defendant, incident, damages should not appear
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: 'Jane' })];
    const groups = groupFactsByCategory(facts);
    const categories = groups.map((g) => g.category);
    expect(categories).not.toContain('defendant');
    expect(categories).not.toContain('incident');
    expect(categories).not.toContain('damages');
  });

  it('puts multiple fact types in the correct category', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane' }),
      makeFact({ fact_type: 'plaintiff_residence', value: 'Austin' }),
    ];
    const groups = groupFactsByCategory(facts);
    const plaintiff = groups.find((g) => g.category === 'plaintiff')!;
    expect(plaintiff.facts).toHaveLength(2);
  });
});

// ─── deriveClaimSuggestions ─────────────────────────────────────────────────

describe('deriveClaimSuggestions', () => {
  it('returns Negligence for personal_injury practice area', () => {
    const suggestions = deriveClaimSuggestions([], 'personal_injury');
    expect(suggestions.map((s) => s.name)).toContain('Negligence');
  });

  it('returns Negligence for premises_liability practice area', () => {
    const suggestions = deriveClaimSuggestions([], 'premises_liability');
    expect(suggestions.map((s) => s.name)).toContain('Negligence');
  });

  it('returns Negligence for motor_vehicle practice area', () => {
    const suggestions = deriveClaimSuggestions([], 'motor_vehicle');
    expect(suggestions.map((s) => s.name)).toContain('Negligence');
  });

  it('returns no suggestions for unknown practice area', () => {
    expect(deriveClaimSuggestions([], 'employment')).toHaveLength(0);
  });

  it('returns Vicarious Liability for corporate defendant with incident facts', () => {
    const facts = [
      makeFact({ fact_type: 'defendant_type', value: 'corporation' }),
      makeFact({ fact_type: 'incident_date', value: '2024-01-01' }),
    ];
    const suggestions = deriveClaimSuggestions(facts, 'personal_injury');
    expect(suggestions.map((s) => s.name)).toContain('Vicarious Liability');
  });

  it('does NOT return Vicarious Liability for individual defendant', () => {
    const facts = [
      makeFact({ fact_type: 'defendant_type', value: 'individual' }),
      makeFact({ fact_type: 'incident_date', value: '2024-01-01' }),
    ];
    const suggestions = deriveClaimSuggestions(facts, 'personal_injury');
    expect(suggestions.map((s) => s.name)).not.toContain('Vicarious Liability');
  });

  it('returns Motor Vehicle Negligence for motor_vehicle with incident facts', () => {
    const facts = [makeFact({ fact_type: 'incident_state', value: 'Texas' })];
    const suggestions = deriveClaimSuggestions(facts, 'motor_vehicle');
    expect(suggestions.map((s) => s.name)).toContain('Motor Vehicle Negligence');
  });

  it('returns Premises Liability for premises_liability area', () => {
    const suggestions = deriveClaimSuggestions([], 'premises_liability');
    expect(suggestions.map((s) => s.name)).toContain('Premises Liability');
  });

  it('returns Negligent Entrustment for corporate defendant + motor_vehicle', () => {
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'llc' })];
    const suggestions = deriveClaimSuggestions(facts, 'motor_vehicle');
    expect(suggestions.map((s) => s.name)).toContain('Negligent Entrustment');
  });

  it('returns Negligent Hiring for corporate defendant with incident facts', () => {
    const facts = [
      makeFact({ fact_type: 'defendant_type', value: 'corporation' }),
      makeFact({ fact_type: 'incident_date', value: '2024-01-01' }),
    ];
    const suggestions = deriveClaimSuggestions(facts, 'personal_injury');
    expect(suggestions.map((s) => s.name)).toContain('Negligent Hiring / Supervision / Retention');
  });

  it('returns government claim suggestion for government defendant', () => {
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'government' })];
    const suggestions = deriveClaimSuggestions(facts, 'personal_injury');
    expect(suggestions.map((s) => s.name)).toContain('Claims Against Government Entity');
  });

  it('each suggestion has a non-empty basis', () => {
    const suggestions = deriveClaimSuggestions([], 'personal_injury');
    for (const s of suggestions) {
      expect(s.basis.length).toBeGreaterThan(0);
    }
  });
});

// ─── buildPlainTextReport ───────────────────────────────────────────────────

const STUB_MATTER = {
  name: 'Test v. Defendant',
  practice_area: 'personal_injury',
  status: 'active',
  notes: null,
  created_at: new Date('2024-01-01'),
};

function makeReadiness(overrides: Partial<ReadinessResult> = {}): ReadinessResult {
  return {
    overall: 75,
    categories: [
      { key: 'plaintiff', label: 'Plaintiff Facts', weight: 0.2, score: 100, required_count: 2, present_count: 2, missing_fact_types: [] },
      { key: 'defendant', label: 'Defendant Facts', weight: 0.25, score: 50, required_count: 2, present_count: 1, missing_fact_types: ['defendant_type'] },
      { key: 'incident', label: 'Incident Facts', weight: 0.25, score: 100, required_count: 4, present_count: 4, missing_fact_types: [] },
      { key: 'damages', label: 'Damages Facts', weight: 0.2, score: 50, required_count: 2, present_count: 1, missing_fact_types: ['estimated_amount_in_controversy'] },
      { key: 'provenance', label: 'Provenance & Review', weight: 0.1, score: 80, required_count: 5, present_count: 4, missing_fact_types: [] },
    ],
    primary_blockers: [],
    missing_issues: [],
    low_confidence_issues: [],
    needs_review_issues: [],
    ...overrides,
  };
}

describe('buildPlainTextReport', () => {
  it('includes all 10 section headers', () => {
    const report = buildPlainTextReport(
      STUB_MATTER,
      [],
      [],
      [],
      makeReadiness(),
      [],
      new Date(),
    );
    expect(report).toContain('1. MATTER SUMMARY');
    expect(report).toContain('2. KNOWN FACTS');
    expect(report).toContain('3. DEFENDANT ANALYSIS');
    expect(report).toContain('4. VENUE-RELEVANT FACTS');
    expect(report).toContain('5. JURISDICTION-RELEVANT FACTS');
    expect(report).toContain('6. POTENTIAL REMOVAL CONSIDERATIONS');
    expect(report).toContain('7. MISSING FACTS');
    expect(report).toContain('8. POTENTIAL CLAIM CATEGORIES');
    expect(report).toContain('9. FILING READINESS SCORE');
    expect(report).toContain('10. ATTORNEY REVIEW DISCLAIMER');
  });

  it('includes the matter name', () => {
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], makeReadiness(), [], new Date());
    expect(report).toContain('Test v. Defendant');
  });

  it('shows "No facts recorded." when facts array is empty', () => {
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], makeReadiness(), [], new Date());
    expect(report).toContain('No facts recorded.');
  });

  it('shows "[not recorded]" for missing venue facts', () => {
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], makeReadiness(), [], new Date());
    expect(report).toContain('[not recorded]');
  });

  it('shows overall readiness score', () => {
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], makeReadiness({ overall: 42 }), [], new Date());
    expect(report).toContain('42%');
  });

  it('shows the attorney review disclaimer text', () => {
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], makeReadiness(), [], new Date());
    expect(report).toContain('attorney review only');
  });

  it('shows "No missing required facts detected." when no missing issues', () => {
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], makeReadiness(), [], new Date());
    expect(report).toContain('No missing required facts detected.');
  });

  it('includes missing issue title when issues are present', () => {
    const issue: DerivedIssue = {
      fact_type: 'medical_expenses',
      issue_type: 'missing_fact',
      severity: 'high',
      title: 'Missing Medical Expenses',
      why_it_matters: 'Required for damages assessment.',
    };
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], makeReadiness(), [issue], new Date());
    expect(report).toContain('Missing Medical Expenses');
    expect(report).toContain('Required for damages assessment.');
  });

  it('includes fact values when facts are present', () => {
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: 'Jane Doe' })];
    const groups = [{ category: 'plaintiff', label: 'Plaintiff', facts }];
    const report = buildPlainTextReport(STUB_MATTER, facts, groups, [], makeReadiness(), [], new Date());
    expect(report).toContain('Jane Doe');
  });

  it('shows primary blockers when present', () => {
    const blocker: DerivedIssue = {
      fact_type: 'plaintiff_name',
      issue_type: 'missing_fact',
      severity: 'critical',
      title: 'Missing Plaintiff Name',
      why_it_matters: 'Foundational to filing.',
    };
    const readiness = makeReadiness({ primary_blockers: [blocker] });
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], readiness, [], new Date());
    expect(report).toContain('Primary Blockers');
    expect(report).toContain('Missing Plaintiff Name');
  });

  it('shows category scores in the readiness section', () => {
    const report = buildPlainTextReport(STUB_MATTER, [], [], [], makeReadiness(), [], new Date());
    expect(report).toContain('Plaintiff Facts');
    expect(report).toContain('Defendant Facts');
  });

  it('includes claim suggestions when provided', () => {
    const claims = [{ name: 'Negligence', basis: 'Standard theory applies.' }];
    const report = buildPlainTextReport(STUB_MATTER, [], [], claims, makeReadiness(), [], new Date());
    expect(report).toContain('Negligence (potential)');
  });

  it('shows matter notes when present', () => {
    const matter = { ...STUB_MATTER, notes: 'Client called on Monday.' };
    const report = buildPlainTextReport(matter, [], [], [], makeReadiness(), [], new Date());
    expect(report).toContain('Client called on Monday.');
  });
});
