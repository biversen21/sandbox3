import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { updateMatter } from '../../actions';
import { MatterForm } from '../../_components/matter-form';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  return { title: matter ? `Edit ${matter.name} — Filing Readiness` : 'Matter Not Found' };
}

export default async function EditMatterPage({ params }: Props) {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });

  if (!matter) notFound();

  const boundAction = updateMatter.bind(null, matter.id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/matters/${matter.id}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {matter.name}
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Edit Matter</h1>
      </div>
      <MatterForm
        action={boundAction}
        defaultValues={{
          name: matter.name,
          practice_area: matter.practice_area,
          status: matter.status,
          notes: matter.notes,
        }}
        cancelHref={`/matters/${matter.id}`}
        submitLabel="Save Changes"
      />
    </div>
  );
}
