/**
 * Demo seed — creates a sample Personal Injury matter with realistic facts.
 *
 * Run: npm run db:demo
 *
 * Idempotent: skips creation if a matter with the same name already exists.
 * To reset: delete the matter in the UI (or via Prisma Studio) then re-run.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_MATTER_NAME = 'Johnson v. Acme Logistics Corp.';

async function main() {
  console.log('Demo seed: Plaintiff Filing Readiness Analyzer\n');

  // Ensure rules are seeded first
  const ruleCount = await prisma.rule.count();
  if (ruleCount === 0) {
    console.log('⚠  No rules found. Run "npm run db:seed" first to seed the PI rule pack.\n');
  }

  const existing = await prisma.matter.findFirst({
    where: { name: DEMO_MATTER_NAME },
  });

  if (existing) {
    console.log(`Demo matter already exists: ${existing.id}`);
    console.log(`  URL: http://localhost:3000/matters/${existing.id}`);
    console.log('\nTo reset: delete the matter in the UI and re-run this script.');
    return;
  }

  // ── Create matter ──────────────────────────────────────────────────────────
  const matter = await prisma.matter.create({
    data: {
      name: DEMO_MATTER_NAME,
      practice_area: 'personal_injury',
      status: 'active',
      notes:
        'Demo matter. Plaintiff injured when commercial truck ran red light at Congress & 12th on 2024-03-15. Defendant is a Delaware-incorporated logistics company operating out of Dallas.',
    },
  });

  console.log(`✓ Matter created: ${matter.id}`);

  // ── Create facts ───────────────────────────────────────────────────────────
  //
  // Fact set is designed to produce an interesting demo state:
  //   - All plaintiff / incident / corporate defendant facts present and verified
  //   - medical_expenses: AI-extracted, high confidence (0.9), needs review
  //   - lost_wages: AI-extracted, LOW confidence (0.6), needs review
  //   - estimated_amount_in_controversy: intentionally absent → high blocker
  //
  // Expected readiness: ~89%
  //   Plaintiff 100% · Defendant 100% · Incident 100% · Damages 50% · Provenance ~89%
  //
  const SOURCE_DOC = 'Medical Records Summary.pdf';

  const facts = [
    // Plaintiff ──────────────────────────────────────────────────────────────
    {
      fact_type: 'plaintiff_name',
      value: 'Jane Johnson',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'plaintiff_residence',
      value: 'Austin, Texas',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'plaintiff_citizenship',
      value: 'Texas',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },

    // Defendant ──────────────────────────────────────────────────────────────
    {
      fact_type: 'defendant_name',
      value: 'Acme Logistics Corp.',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'defendant_type',
      value: 'corporation',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'defendant_incorporation_state',
      value: 'Delaware',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'defendant_principal_place_of_business',
      value: 'Dallas, Texas',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'defendant_service_address',
      value: '100 Commerce Drive, Dallas, TX 75201',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },

    // Incident ───────────────────────────────────────────────────────────────
    {
      fact_type: 'incident_date',
      value: '2024-03-15',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'incident_address',
      value: '1200 Congress Ave, Austin, TX 78701',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'incident_county',
      value: 'Travis',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },
    {
      fact_type: 'incident_state',
      value: 'Texas',
      extraction_method: 'manual',
      confidence: 1.0,
      human_verified: true,
    },

    // Damages — AI-extracted, high confidence, needs review ──────────────────
    {
      fact_type: 'medical_expenses',
      value: '$47,350.00',
      extraction_method: 'ai_document_extraction',
      confidence: 0.9,
      human_verified: false,
      source_document: SOURCE_DOC,
      source_quote: 'Total medical charges to date: $47,350.00 per attached billing summary.',
    },

    // Damages — AI-extracted, LOW confidence (0.6 < 0.75 threshold), needs review
    {
      fact_type: 'lost_wages',
      value: '$8,400',
      extraction_method: 'ai_document_extraction',
      confidence: 0.6,
      human_verified: false,
      source_document: SOURCE_DOC,
      source_quote: 'approximately six weeks of missed work at her usual rate',
    },

    // NOTE: estimated_amount_in_controversy intentionally omitted.
    //       This creates a high-severity blocker in Issues and Readiness pages.
  ] as const;

  for (const fact of facts) {
    await prisma.fact.create({
      data: { matter_id: matter.id, ...fact },
    });
  }

  console.log(`✓ ${facts.length} facts created`);
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`Demo matter ready:`);
  console.log(`  URL:     http://localhost:3000/matters/${matter.id}`);
  console.log(`  Score:   ~89% overall readiness`);
  console.log(`  Blocker: estimated_amount_in_controversy (missing — high severity)`);
  console.log(`  Review:  2 AI-extracted facts need attorney review`);
  console.log(`           (medical_expenses 90%, lost_wages 60% confidence)`);
  console.log('─────────────────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
