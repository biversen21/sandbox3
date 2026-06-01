import type { Fact, Rule } from '@prisma/client';

const BASE_DATE = new Date('2024-01-01T00:00:00.000Z');
let seq = 0;
const id = () => `test-${(++seq).toString().padStart(3, '0')}`;

export function makeFact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: id(),
    matter_id: 'matter-1',
    entity_id: null,
    event_id: null,
    document_id: null,
    fact_type: 'plaintiff_name',
    value: 'Jane Doe',
    normalized_value: null,
    confidence: 1.0,
    extraction_method: 'manual',
    source_document: null,
    page_number: null,
    source_quote: null,
    human_verified: true,
    verified_by: null,
    created_at: BASE_DATE,
    updated_at: BASE_DATE,
    ...overrides,
  };
}

export function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: id(),
    rule_key: `rule-${id()}`,
    practice_area: 'personal_injury',
    jurisdiction: 'general',
    required_fact_types: '["plaintiff_name"]',
    applies_when: null,
    severity: 'critical',
    title: 'Test Rule',
    why_it_matters: 'For testing purposes.',
    created_at: BASE_DATE,
    updated_at: BASE_DATE,
    ...overrides,
  };
}

// Pre-built PI rules matching the seed data
export const PI_RULES: Rule[] = [
  makeRule({
    rule_key: 'pi_plaintiff_facts',
    required_fact_types: JSON.stringify(['plaintiff_name', 'plaintiff_residence']),
    applies_when: null,
    severity: 'critical',
    title: 'Plaintiff Identification Facts',
    why_it_matters: 'Plaintiff identity and residence are foundational.',
  }),
  makeRule({
    rule_key: 'pi_defendant_facts',
    required_fact_types: JSON.stringify(['defendant_name', 'defendant_type']),
    applies_when: null,
    severity: 'critical',
    title: 'Defendant Identification Facts',
    why_it_matters: 'Defendant identity is required.',
  }),
  makeRule({
    rule_key: 'pi_incident_location_facts',
    required_fact_types: JSON.stringify([
      'incident_date',
      'incident_address',
      'incident_county',
      'incident_state',
    ]),
    applies_when: null,
    severity: 'critical',
    title: 'Incident Location and Date Facts',
    why_it_matters: 'Incident location and date are foundational.',
  }),
  makeRule({
    rule_key: 'pi_corporate_defendant_facts',
    required_fact_types: JSON.stringify([
      'defendant_incorporation_state',
      'defendant_principal_place_of_business',
      'defendant_service_address',
    ]),
    applies_when: JSON.stringify({
      defendant_type: ['corporation', 'llc', 'partnership', 'other'],
    }),
    severity: 'high',
    title: 'Corporate Defendant Facts',
    why_it_matters: 'Corporate citizenship may be relevant to diversity jurisdiction.',
  }),
  makeRule({
    rule_key: 'pi_damages_required',
    required_fact_types: JSON.stringify([
      'medical_expenses',
      'estimated_amount_in_controversy',
    ]),
    applies_when: null,
    severity: 'high',
    title: 'Damages — Required',
    why_it_matters: 'Medical expenses and amount in controversy may affect jurisdiction.',
  }),
];
