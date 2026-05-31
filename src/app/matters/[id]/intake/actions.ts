'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const INTAKE_FACT_TYPES = [
  'plaintiff_name',
  'plaintiff_residence',
  'plaintiff_citizenship',
  'defendant_name',
  'defendant_type',
  'defendant_residence',
  'defendant_incorporation_state',
  'defendant_principal_place_of_business',
  'defendant_service_address',
  'incident_date',
  'incident_address',
  'incident_county',
  'incident_state',
  'medical_expenses',
  'lost_wages',
  'property_damage',
  'estimated_amount_in_controversy',
] as const;

export async function saveIntakeFacts(matterId: string, formData: FormData): Promise<void> {
  for (const factType of INTAKE_FACT_TYPES) {
    const value = (formData.get(factType) as string | null)?.trim() ?? '';

    const existing = await prisma.fact.findFirst({
      where: { matter_id: matterId, fact_type: factType },
    });

    if (value) {
      if (existing) {
        await prisma.fact.update({ where: { id: existing.id }, data: { value } });
      } else {
        await prisma.fact.create({
          data: {
            matter_id: matterId,
            fact_type: factType,
            value,
            confidence: 1.0,
            extraction_method: 'manual_intake',
            source_document: 'Structured Intake',
            human_verified: true,
          },
        });
      }
    } else if (existing) {
      await prisma.fact.delete({ where: { id: existing.id } });
    }
  }

  redirect(`/matters/${matterId}/intake?saved=1`);
}
