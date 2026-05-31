'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { EXTRACTION_METHODS } from '@/lib/constants';

const VALID_EXTRACTION_METHODS = Object.values(EXTRACTION_METHODS) as string[];

export type AddFactFormState = {
  errors?: {
    fact_type?: string;
    value?: string;
    confidence?: string;
  };
};

export async function createFact(
  matterId: string,
  _prevState: AddFactFormState,
  formData: FormData,
): Promise<AddFactFormState> {
  const fact_type = (formData.get('fact_type') as string | null)?.trim() ?? '';
  const value = (formData.get('value') as string | null)?.trim() ?? '';
  const normalized_value = (formData.get('normalized_value') as string | null)?.trim() || null;
  const confidenceRaw = (formData.get('confidence') as string | null)?.trim();
  const source_document = (formData.get('source_document') as string | null)?.trim() || null;
  const pageRaw = (formData.get('page_number') as string | null)?.trim();
  const human_verified = formData.get('human_verified') === 'on';
  const extraction_method_raw = (formData.get('extraction_method') as string | null) ?? 'manual';

  const errors: NonNullable<AddFactFormState['errors']> = {};
  if (!fact_type) errors.fact_type = 'Fact type is required.';
  if (!value) errors.value = 'Value is required.';

  let confidence = 1.0;
  if (confidenceRaw) {
    const parsed = parseFloat(confidenceRaw);
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
      errors.confidence = 'Must be between 0.0 and 1.0.';
    } else {
      confidence = parsed;
    }
  }

  if (Object.keys(errors).length > 0) return { errors };

  const extraction_method = VALID_EXTRACTION_METHODS.includes(extraction_method_raw)
    ? extraction_method_raw
    : 'manual';
  const page_number = pageRaw ? parseInt(pageRaw, 10) || null : null;

  await prisma.fact.create({
    data: {
      matter_id: matterId,
      fact_type,
      value,
      normalized_value,
      confidence,
      extraction_method,
      source_document,
      page_number,
      human_verified,
    },
  });

  redirect(`/matters/${matterId}/facts`);
}

export async function toggleVerifyFact(factId: string): Promise<void> {
  const fact = await prisma.fact.findUnique({
    where: { id: factId },
    select: { human_verified: true, matter_id: true },
  });
  if (!fact) return;
  await prisma.fact.update({
    where: { id: factId },
    data: { human_verified: !fact.human_verified },
  });
  revalidatePath(`/matters/${fact.matter_id}/facts`);
}

export async function deleteFact(factId: string): Promise<void> {
  const fact = await prisma.fact.findUnique({
    where: { id: factId },
    select: { matter_id: true },
  });
  if (!fact) return;
  await prisma.fact.delete({ where: { id: factId } });
  revalidatePath(`/matters/${fact.matter_id}/facts`);
}
