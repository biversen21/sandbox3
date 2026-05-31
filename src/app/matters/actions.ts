'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MATTER_STATUSES, PRACTICE_AREAS } from '@/lib/constants';

const VALID_PRACTICE_AREAS = Object.values(PRACTICE_AREAS) as string[];
const VALID_STATUSES = Object.values(MATTER_STATUSES) as string[];

export type MatterFormState = {
  errors?: {
    name?: string;
    practice_area?: string;
    status?: string;
  };
};

function validateMatterForm(formData: FormData): {
  data?: { name: string; practice_area: string; status: string; notes: string | null };
  errors?: MatterFormState['errors'];
} {
  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const practice_area = (formData.get('practice_area') as string | null) ?? '';
  const status = (formData.get('status') as string | null) ?? '';
  const notes = (formData.get('notes') as string | null)?.trim() || null;

  const errors: NonNullable<MatterFormState['errors']> = {};
  if (!name) errors.name = 'Name is required.';
  if (!VALID_PRACTICE_AREAS.includes(practice_area)) errors.practice_area = 'Practice area is required.';
  if (!VALID_STATUSES.includes(status)) errors.status = 'Status is required.';

  if (Object.keys(errors).length > 0) return { errors };
  return { data: { name, practice_area, status, notes } };
}

export async function createMatter(
  _prevState: MatterFormState,
  formData: FormData,
): Promise<MatterFormState> {
  const validated = validateMatterForm(formData);
  if (validated.errors) return { errors: validated.errors };

  const matter = await prisma.matter.create({ data: validated.data! });
  redirect(`/matters/${matter.id}`);
}

export async function updateMatter(
  id: string,
  _prevState: MatterFormState,
  formData: FormData,
): Promise<MatterFormState> {
  const validated = validateMatterForm(formData);
  if (validated.errors) return { errors: validated.errors };

  await prisma.matter.update({ where: { id }, data: validated.data! });
  redirect(`/matters/${id}`);
}

export async function deleteMatter(id: string): Promise<void> {
  await prisma.matter.delete({ where: { id } });
  redirect('/matters');
}
