import Link from 'next/link';
import type { Metadata } from 'next';
import { createMatter } from '../actions';
import { MatterForm } from '../_components/matter-form';

export const metadata: Metadata = { title: 'New Matter — Filing Readiness' };

export default function NewMatterPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/matters" className="text-sm text-gray-500 hover:text-gray-900">
          ← Matters
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">New Matter</h1>
      </div>
      <MatterForm action={createMatter} cancelHref="/matters" submitLabel="Create Matter" />
    </div>
  );
}
