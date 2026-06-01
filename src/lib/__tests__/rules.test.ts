import { describe, it, expect } from 'vitest';
import {
  parseRequiredFactTypes,
  parseAppliesWhen,
  getPresentFactTypes,
  getFactValue,
  isRuleApplicable,
  getMissingRequiredFacts,
  deriveMissingFactIssues,
  deriveLowConfidenceIssues,
  deriveNeedsReviewIssues,
} from '@/lib/rules';
import { makeFact, makeRule, PI_RULES } from './fixtures';

// ─── parseRequiredFactTypes ─────────────────────────────────────────────────

describe('parseRequiredFactTypes', () => {
  it('returns a string array from a valid JSON array', () => {
    expect(parseRequiredFactTypes('["a","b","c"]')).toEqual(['a', 'b', 'c']);
  });

  it('filters non-string entries', () => {
    expect(parseRequiredFactTypes('["a", 1, null, "b"]')).toEqual(['a', 'b']);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseRequiredFactTypes('not json')).toEqual([]);
  });

  it('returns empty array when JSON is an object', () => {
    expect(parseRequiredFactTypes('{"key":"value"}')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseRequiredFactTypes('')).toEqual([]);
  });

  it('returns empty array for empty JSON array', () => {
    expect(parseRequiredFactTypes('[]')).toEqual([]);
  });
});

// ─── parseAppliesWhen ───────────────────────────────────────────────────────

describe('parseAppliesWhen', () => {
  it('parses a valid condition object', () => {
    const raw = JSON.stringify({ defendant_type: ['corporation', 'llc'] });
    expect(parseAppliesWhen(raw)).toEqual({ defendant_type: ['corporation', 'llc'] });
  });

  it('returns null for null input', () => {
    expect(parseAppliesWhen(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseAppliesWhen(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseAppliesWhen('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseAppliesWhen('bad json')).toBeNull();
  });

  it('returns null when JSON is an array', () => {
    expect(parseAppliesWhen('["a","b"]')).toBeNull();
  });

  it('returns null when JSON is a primitive', () => {
    expect(parseAppliesWhen('"just a string"')).toBeNull();
  });
});

// ─── getPresentFactTypes ────────────────────────────────────────────────────

describe('getPresentFactTypes', () => {
  it('returns a set of fact types with non-empty values', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane' }),
      makeFact({ fact_type: 'incident_date', value: '2024-01-01' }),
    ];
    const present = getPresentFactTypes(facts);
    expect(present.has('plaintiff_name')).toBe(true);
    expect(present.has('incident_date')).toBe(true);
  });

  it('excludes facts with empty or whitespace-only values', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: '' }),
      makeFact({ fact_type: 'incident_date', value: '   ' }),
    ];
    const present = getPresentFactTypes(facts);
    expect(present.size).toBe(0);
  });

  it('returns an empty set for an empty array', () => {
    expect(getPresentFactTypes([])).toEqual(new Set());
  });

  it('deduplicates the same fact_type', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane' }),
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane Doe' }),
    ];
    const present = getPresentFactTypes(facts);
    expect(present.size).toBe(1);
    expect(present.has('plaintiff_name')).toBe(true);
  });
});

// ─── getFactValue ───────────────────────────────────────────────────────────

describe('getFactValue', () => {
  it('returns the trimmed value for a matching fact_type', () => {
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: '  Jane Doe  ' })];
    expect(getFactValue(facts, 'plaintiff_name')).toBe('Jane Doe');
  });

  it('returns null when fact_type is not found', () => {
    expect(getFactValue([], 'plaintiff_name')).toBeNull();
  });

  it('returns null when value is whitespace only', () => {
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: '   ' })];
    expect(getFactValue(facts, 'plaintiff_name')).toBeNull();
  });

  it('returns the first matching value when duplicates exist', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'First' }),
      makeFact({ fact_type: 'plaintiff_name', value: 'Second' }),
    ];
    expect(getFactValue(facts, 'plaintiff_name')).toBe('First');
  });
});

// ─── isRuleApplicable ───────────────────────────────────────────────────────

describe('isRuleApplicable', () => {
  it('returns true when applies_when is null (unconditional rule)', () => {
    const rule = makeRule({ applies_when: null });
    expect(isRuleApplicable(rule, [])).toBe(true);
  });

  it('returns true when the fact value matches a condition', () => {
    const rule = makeRule({
      applies_when: JSON.stringify({ defendant_type: ['corporation', 'llc'] }),
    });
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'corporation' })];
    expect(isRuleApplicable(rule, facts)).toBe(true);
  });

  it('matches case-insensitively', () => {
    const rule = makeRule({
      applies_when: JSON.stringify({ defendant_type: ['corporation'] }),
    });
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'Corporation' })];
    expect(isRuleApplicable(rule, facts)).toBe(true);
  });

  it('returns false when the required condition fact is absent', () => {
    const rule = makeRule({
      applies_when: JSON.stringify({ defendant_type: ['corporation'] }),
    });
    expect(isRuleApplicable(rule, [])).toBe(false);
  });

  it('returns false when the fact value does not match any allowed value', () => {
    const rule = makeRule({
      applies_when: JSON.stringify({ defendant_type: ['corporation', 'llc'] }),
    });
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'individual' })];
    expect(isRuleApplicable(rule, facts)).toBe(false);
  });

  it('matches via substring (e.g. "corp" matches "corporation")', () => {
    const rule = makeRule({
      applies_when: JSON.stringify({ defendant_type: ['corp'] }),
    });
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'corporation' })];
    expect(isRuleApplicable(rule, facts)).toBe(true);
  });
});

// ─── getMissingRequiredFacts ────────────────────────────────────────────────

describe('getMissingRequiredFacts', () => {
  it('returns all required fact types when no facts are present', () => {
    const rule = makeRule({
      required_fact_types: JSON.stringify(['plaintiff_name', 'plaintiff_residence']),
    });
    expect(getMissingRequiredFacts(rule, [])).toEqual([
      'plaintiff_name',
      'plaintiff_residence',
    ]);
  });

  it('returns only missing fact types', () => {
    const rule = makeRule({
      required_fact_types: JSON.stringify(['plaintiff_name', 'plaintiff_residence']),
    });
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: 'Jane' })];
    expect(getMissingRequiredFacts(rule, facts)).toEqual(['plaintiff_residence']);
  });

  it('returns empty array when all required facts are present', () => {
    const rule = makeRule({
      required_fact_types: JSON.stringify(['plaintiff_name']),
    });
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: 'Jane' })];
    expect(getMissingRequiredFacts(rule, facts)).toEqual([]);
  });

  it('returns empty array when required_fact_types is empty', () => {
    const rule = makeRule({ required_fact_types: '[]' });
    expect(getMissingRequiredFacts(rule, [])).toEqual([]);
  });
});

// ─── deriveMissingFactIssues ────────────────────────────────────────────────

describe('deriveMissingFactIssues', () => {
  it('returns an issue for each missing required fact', () => {
    const rules = [
      makeRule({
        required_fact_types: JSON.stringify(['plaintiff_name', 'plaintiff_residence']),
        severity: 'critical',
        why_it_matters: 'Plaintiff facts are foundational.',
      }),
    ];
    const issues = deriveMissingFactIssues(rules, []);
    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.fact_type)).toContain('plaintiff_name');
    expect(issues.map((i) => i.fact_type)).toContain('plaintiff_residence');
  });

  it('deduplicates a fact_type that appears in multiple rules', () => {
    const rules = [
      makeRule({ required_fact_types: JSON.stringify(['plaintiff_name']), severity: 'critical' }),
      makeRule({ required_fact_types: JSON.stringify(['plaintiff_name']), severity: 'high' }),
    ];
    const issues = deriveMissingFactIssues(rules, []);
    expect(issues.filter((i) => i.fact_type === 'plaintiff_name')).toHaveLength(1);
  });

  it('skips rules that are not applicable', () => {
    const corporateRule = makeRule({
      required_fact_types: JSON.stringify(['defendant_incorporation_state']),
      applies_when: JSON.stringify({ defendant_type: ['corporation'] }),
    });
    // No defendant_type fact → rule not applicable
    const issues = deriveMissingFactIssues([corporateRule], []);
    expect(issues).toHaveLength(0);
  });

  it('applies conditional rules when the condition matches', () => {
    const corporateRule = makeRule({
      required_fact_types: JSON.stringify(['defendant_incorporation_state']),
      applies_when: JSON.stringify({ defendant_type: ['corporation'] }),
      severity: 'high',
    });
    const facts = [makeFact({ fact_type: 'defendant_type', value: 'corporation' })];
    const issues = deriveMissingFactIssues([corporateRule], facts);
    expect(issues).toHaveLength(1);
    expect(issues[0].fact_type).toBe('defendant_incorporation_state');
  });

  it('sorts issues by severity — critical before high before medium', () => {
    const rules = [
      makeRule({
        required_fact_types: JSON.stringify(['medical_expenses']),
        severity: 'high',
      }),
      makeRule({
        required_fact_types: JSON.stringify(['plaintiff_name']),
        severity: 'critical',
      }),
    ];
    const issues = deriveMissingFactIssues(rules, []);
    expect(issues[0].severity).toBe('critical');
    expect(issues[1].severity).toBe('high');
  });

  it('returns empty array when all required facts are present', () => {
    const rules = [
      makeRule({ required_fact_types: JSON.stringify(['plaintiff_name']) }),
    ];
    const facts = [makeFact({ fact_type: 'plaintiff_name', value: 'Jane' })];
    expect(deriveMissingFactIssues(rules, facts)).toHaveLength(0);
  });

  it('sets issue_type to missing_fact', () => {
    const rules = [makeRule({ required_fact_types: JSON.stringify(['plaintiff_name']) })];
    const issues = deriveMissingFactIssues(rules, []);
    expect(issues[0].issue_type).toBe('missing_fact');
  });

  it('uses PI_RULES correctly — corporate rule skipped for individual defendant', () => {
    const facts = [
      makeFact({ fact_type: 'plaintiff_name', value: 'Jane' }),
      makeFact({ fact_type: 'plaintiff_residence', value: 'Austin TX' }),
      makeFact({ fact_type: 'defendant_name', value: 'Bob Smith' }),
      makeFact({ fact_type: 'defendant_type', value: 'individual' }),
      makeFact({ fact_type: 'incident_date', value: '2024-01-01' }),
      makeFact({ fact_type: 'incident_address', value: '123 Main' }),
      makeFact({ fact_type: 'incident_county', value: 'Travis' }),
      makeFact({ fact_type: 'incident_state', value: 'Texas' }),
    ];
    const issues = deriveMissingFactIssues(PI_RULES, facts);
    const factTypes = issues.map((i) => i.fact_type);
    // Corporate facts should NOT appear
    expect(factTypes).not.toContain('defendant_incorporation_state');
    // Damages facts should appear
    expect(factTypes).toContain('medical_expenses');
    expect(factTypes).toContain('estimated_amount_in_controversy');
  });
});

// ─── deriveLowConfidenceIssues ──────────────────────────────────────────────

describe('deriveLowConfidenceIssues', () => {
  it('returns issues for facts with confidence below 0.75', () => {
    const facts = [
      makeFact({ fact_type: 'lost_wages', confidence: 0.6 }),
      makeFact({ fact_type: 'medical_expenses', confidence: 0.9 }),
    ];
    const issues = deriveLowConfidenceIssues(facts);
    expect(issues).toHaveLength(1);
    expect(issues[0].fact_type).toBe('lost_wages');
  });

  it('assigns severity "high" when confidence is below 0.5', () => {
    const facts = [makeFact({ confidence: 0.4 })];
    const issues = deriveLowConfidenceIssues(facts);
    expect(issues[0].severity).toBe('high');
  });

  it('assigns severity "medium" when confidence is between 0.5 and 0.75', () => {
    const facts = [makeFact({ confidence: 0.6 })];
    const issues = deriveLowConfidenceIssues(facts);
    expect(issues[0].severity).toBe('medium');
  });

  it('does not flag facts at exactly 0.75', () => {
    const facts = [makeFact({ confidence: 0.75 })];
    expect(deriveLowConfidenceIssues(facts)).toHaveLength(0);
  });

  it('includes the confidence percentage in the title', () => {
    const facts = [makeFact({ fact_type: 'lost_wages', confidence: 0.6 })];
    const issues = deriveLowConfidenceIssues(facts);
    expect(issues[0].title).toContain('60%');
  });

  it('sets issue_type to low_confidence', () => {
    const facts = [makeFact({ confidence: 0.5 })];
    expect(deriveLowConfidenceIssues(facts)[0].issue_type).toBe('low_confidence');
  });

  it('returns empty array when all facts are high confidence', () => {
    const facts = [
      makeFact({ confidence: 1.0 }),
      makeFact({ confidence: 0.9 }),
      makeFact({ confidence: 0.75 }),
    ];
    expect(deriveLowConfidenceIssues(facts)).toHaveLength(0);
  });

  it('sorts high-severity before medium-severity', () => {
    const facts = [
      makeFact({ fact_type: 'lost_wages', confidence: 0.6 }),  // medium
      makeFact({ fact_type: 'plaintiff_name', confidence: 0.4 }), // high
    ];
    const issues = deriveLowConfidenceIssues(facts);
    expect(issues[0].severity).toBe('high');
    expect(issues[1].severity).toBe('medium');
  });
});

// ─── deriveNeedsReviewIssues ────────────────────────────────────────────────

describe('deriveNeedsReviewIssues', () => {
  it('returns an issue for every unverified fact', () => {
    const facts = [
      makeFact({ human_verified: false }),
      makeFact({ human_verified: false }),
      makeFact({ human_verified: true }),
    ];
    expect(deriveNeedsReviewIssues(facts)).toHaveLength(2);
  });

  it('returns empty array when all facts are verified', () => {
    const facts = [
      makeFact({ human_verified: true }),
      makeFact({ human_verified: true }),
    ];
    expect(deriveNeedsReviewIssues(facts)).toHaveLength(0);
  });

  it('always assigns severity "low"', () => {
    const facts = [makeFact({ human_verified: false })];
    expect(deriveNeedsReviewIssues(facts)[0].severity).toBe('low');
  });

  it('sets issue_type to needs_review', () => {
    const facts = [makeFact({ human_verified: false })];
    expect(deriveNeedsReviewIssues(facts)[0].issue_type).toBe('needs_review');
  });
});
