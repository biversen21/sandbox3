import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PI_RULES = [
  {
    rule_key: 'pi_plaintiff_facts',
    practice_area: 'personal_injury',
    jurisdiction: 'general',
    required_fact_types: JSON.stringify(['plaintiff_name', 'plaintiff_residence']),
    applies_when: null,
    severity: 'critical',
    title: 'Plaintiff Identification Facts',
    why_it_matters:
      'Plaintiff identity and residence are foundational to establishing standing, party identification, and venue considerations.',
  },
  {
    rule_key: 'pi_defendant_facts',
    practice_area: 'personal_injury',
    jurisdiction: 'general',
    required_fact_types: JSON.stringify(['defendant_name', 'defendant_type']),
    applies_when: null,
    severity: 'critical',
    title: 'Defendant Identification Facts',
    why_it_matters:
      'Defendant identity and entity type are required for proper party identification, service planning, and to evaluate applicable procedural requirements.',
  },
  {
    rule_key: 'pi_incident_location_facts',
    practice_area: 'personal_injury',
    jurisdiction: 'general',
    required_fact_types: JSON.stringify([
      'incident_date',
      'incident_address',
      'incident_county',
      'incident_state',
    ]),
    applies_when: null,
    severity: 'critical',
    title: 'Incident Location and Date Facts',
    why_it_matters:
      'Incident location and date are foundational to venue analysis, statute of limitations evaluation, and liability assessment. Attorney review required.',
  },
  {
    rule_key: 'pi_corporate_defendant_facts',
    practice_area: 'personal_injury',
    jurisdiction: 'general',
    required_fact_types: JSON.stringify([
      'defendant_incorporation_state',
      'defendant_principal_place_of_business',
      'defendant_service_address',
    ]),
    applies_when: JSON.stringify({ defendant_type: ['corporation', 'llc', 'partnership', 'other'] }),
    severity: 'high',
    title: 'Corporate Defendant Facts',
    why_it_matters:
      'Corporate citizenship information — state of incorporation and principal place of business — may be relevant to diversity jurisdiction analysis and service planning. Attorney review required.',
  },
  {
    rule_key: 'pi_damages_required',
    practice_area: 'personal_injury',
    jurisdiction: 'general',
    required_fact_types: JSON.stringify(['medical_expenses', 'estimated_amount_in_controversy']),
    applies_when: null,
    severity: 'high',
    title: 'Damages — Required',
    why_it_matters:
      'Medical expenses and estimated amount in controversy are relevant to case valuation and may affect jurisdiction threshold considerations. Attorney review required.',
  },
  {
    rule_key: 'pi_damages_optional',
    practice_area: 'personal_injury',
    jurisdiction: 'general',
    required_fact_types: JSON.stringify(['lost_wages', 'property_damage']),
    applies_when: null,
    severity: 'medium',
    title: 'Damages — Additional',
    why_it_matters:
      'Lost wages and property damage may be relevant to the total amount in controversy and overall case valuation.',
  },
];

async function main() {
  console.log('Seeding Personal Injury rule pack...');

  for (const rule of PI_RULES) {
    await prisma.rule.upsert({
      where: { rule_key: rule.rule_key },
      update: rule,
      create: rule,
    });
    console.log(`  ✓ ${rule.rule_key}`);
  }

  console.log(`\nSeeded ${PI_RULES.length} rules.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
