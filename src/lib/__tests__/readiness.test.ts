import { describe, it, expect } from 'vitest';
import { analyzeReadiness } from '@/lib/readiness';
import { makeFact, makeRule, PI_RULES } from './fixtures';

// ─── analyzeReadiness ───────────────────────────────────────────────────────

describe('analyzeReadiness', () => {
  it('returns 0% overall when no facts and no rules', () => {
    const result = analyzeReadiness([], []);
    expect(result.overall).toBe(0);
  });

  it('returns the five expected category keys', () => {
    const result = analyzeReadiness([], PI_RULES);
    const keys = result.categories.map((c) => c.key);
    expect(keys).toContain('plaintiff');
    expect(keys).toContain('defendant');
    expect(keys).toContain('incident');
    expect(keys).toContain('damages');
    expect(keys).toContain('provenance');
  });

  it('returns 0 score for all non-provenance categories when no facts provided', () => {
    const result = analyzeReadiness([], PI_RULES);
    for (const cat of result.categories) {
      if (cat.key !== 'provenance') {
        expect(cat.score).toBe(0);
      }
    }
  });

  it('returns 100% plaintiff score when all plaintiff facts present', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane' }),
      makeFact({ fact_type: 'plaintiff_residence', value: 'Austin TX' }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    const plaintiff = result.categories.find((c) => c.key === 'plaintiff')!;
    expect(plaintiff.score).toBe(100);
    expect(plaintiff.present_count).toBe(2);
    expect(plaintiff.required_count).toBe(2);
  });

  it('returns 50% plaintiff score when one of two plaintiff facts is missing', () => {
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: 'Jane' })];
    const result = analyzeReadiness(facts, PI_RULES);
    const plaintiff = result.categories.find((c) => c.key === 'plaintiff')!;
    expect(plaintiff.score).toBe(50);
    expect(plaintiff.missing_fact_types).toContain('plaintiff_residence');
  });

  it('defendant category has 2 required facts for individual defendant', () => {
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'individual' })];
    const result = analyzeReadiness(facts, PI_RULES);
    const defendant = result.categories.find((c) => c.key === 'defendant')!;
    expect(defendant.required_count).toBe(2);
  });

  it('defendant category expands to 5 required facts for corporate defendant', () => {
    const facts = [
      makeFact({ fact_type: 'defendant_name', value: 'Acme Corp' }),
      makeFact({ fact_type: 'defendant_type', value: 'corporation' }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    const defendant = result.categories.find((c) => c.key === 'defendant')!;
    // base 2 + 3 corporate = 5
    expect(defendant.required_count).toBe(5);
  });

  it('defendant corporate expansion includes the three corporate fact types', () => {
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'llc' })];
    const result = analyzeReadiness(facts, PI_RULES);
    const defendant = result.categories.find((c) => c.key === 'defendant')!;
    expect(defendant.missing_fact_types).toContain('defendant_incorporation_state');
    expect(defendant.missing_fact_types).toContain('defendant_principal_place_of_business');
    expect(defendant.missing_fact_types).toContain('defendant_service_address');
  });

  it('provenance score is 0 when no facts', () => {
    const result = analyzeReadiness([], PI_RULES);
    const prov = result.categories.find((c) => c.key === 'provenance')!;
    expect(prov.score).toBe(0);
  });

  it('provenance score is 100 when all facts are verified and high confidence', () => {
    const facts = [
      makeFact({ human_verified: true, confidence: 1.0 }),
      makeFact({ human_verified: true, confidence: 0.9 }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    const prov = result.categories.find((c) => c.key === 'provenance')!;
    expect(prov.score).toBe(100);
  });

  it('provenance score is 50 when all facts are unverified but high confidence', () => {
    const facts = [
      makeFact({ human_verified: false, confidence: 1.0 }),
      makeFact({ human_verified: false, confidence: 0.9 }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    const prov = result.categories.find((c) => c.key === 'provenance')!;
    expect(prov.score).toBe(50);
  });

  it('provenance score is 50 when all facts verified but low confidence', () => {
    const facts = [
      makeFact({ human_verified: true, confidence: 0.5 }),
      makeFact({ human_verified: true, confidence: 0.4 }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    const prov = result.categories.find((c) => c.key === 'provenance')!;
    expect(prov.score).toBe(50);
  });

  it('provenance present_count equals number of verified facts', () => {
    const facts = [
      makeFact({ human_verified: true }),
      makeFact({ human_verified: false }),
      makeFact({ human_verified: true }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    const prov = result.categories.find((c) => c.key === 'provenance')!;
    expect(prov.present_count).toBe(2);
    expect(prov.required_count).toBe(3);
  });

  it('primary_blockers contains only critical and high severity missing issues', () => {
    const rules = [
      makeRule({
        required_fact_types: JSON.stringify(['plaintiff_name']),
        severity: 'critical',
      }),
      makeRule({
        required_fact_types: JSON.stringify(['medical_expenses']),
        severity: 'high',
      }),
      makeRule({
        required_fact_types: JSON.stringify(['incident_description']),
        severity: 'medium',
      }),
    ];
    const result = analyzeReadiness([], rules);
    expect(result.primary_blockers.every((b) => ['critical', 'high'].includes(b.severity))).toBe(
      true,
    );
    expect(result.primary_blockers.map((b) => b.fact_type)).toContain('plaintiff_name');
    expect(result.primary_blockers.map((b) => b.fact_type)).toContain('medical_expenses');
    expect(result.primary_blockers.map((b) => b.fact_type)).not.toContain('incident_description');
  });

  it('missing_issues, low_confidence_issues, needs_review_issues are present in result', () => {
    const facts = [makeFact({ confidence: 0.4, human_verified: false })];
    const result = analyzeReadiness(facts, PI_RULES);
    expect(Array.isArray(result.missing_issues)).toBe(true);
    expect(Array.isArray(result.low_confidence_issues)).toBe(true);
    expect(Array.isArray(result.needs_review_issues)).toBe(true);
  });

  it('low_confidence_issues populated from facts below 0.75 threshold', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane', confidence: 0.4 }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    expect(result.low_confidence_issues).toHaveLength(1);
    expect(result.low_confidence_issues[0].fact_type).toBe('plaintiff_name');
  });

  it('needs_review_issues populated from unverified facts', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane', human_verified: false }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    expect(result.needs_review_issues).toHaveLength(1);
  });

  it('returns 100% overall when all PI base facts present, verified, high confidence', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'plaintiff_residence', value: 'Austin TX', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'defendant_name', value: 'Bob Smith', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'defendant_type', value: 'individual', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'incident_date', value: '2024-01-01', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'incident_address', value: '123 Main', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'incident_county', value: 'Travis', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'incident_state', value: 'Texas', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'medical_expenses', value: '$50,000', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'estimated_amount_in_controversy', value: '$75,000', human_verified: true, confidence: 1.0 }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    expect(result.overall).toBe(100);
    expect(result.missing_issues).toHaveLength(0);
  });

  it('overall is a weighted average of category scores', () => {
    // Only plaintiff facts present (weight 0.20, score 100)
    // All others are 0 except provenance (depends on facts)
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane', human_verified: true, confidence: 1.0 }),
      makeFact({ fact_type: 'plaintiff_residence', value: 'Austin', human_verified: true, confidence: 1.0 }),
    ];
    const result = analyzeReadiness(facts, PI_RULES);
    // plaintiff: 100 * 0.20 = 20
    // defendant: 0 * 0.25 = 0
    // incident: 0 * 0.25 = 0
    // damages: 0 * 0.20 = 0
    // provenance: 100 * 0.10 = 10
    // overall = 30
    expect(result.overall).toBe(30);
  });
});
