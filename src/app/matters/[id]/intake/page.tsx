import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ENTITY_TYPES, ENTITY_TYPE_LABELS } from '@/lib/constants';
import { saveIntakeFacts } from './actions';

type IntakeField = {
  fact_type: string;
  label: string;
  required: boolean;
  type?: 'text' | 'date' | 'select';
  placeholder?: string;
};

type IntakeSection = {
  label: string;
  fields: IntakeField[];
};

const INTAKE_SECTIONS: IntakeSection[] = [
  {
    label: 'Plaintiff',
    fields: [
      { fact_type: 'plaintiff_name', label: 'Full Name', required: true, placeholder: 'e.g. Jane Smith' },
      { fact_type: 'plaintiff_residence', label: 'Residence', required: true, placeholder: 'City, State' },
      { fact_type: 'plaintiff_citizenship', label: 'State of Citizenship', required: false },
    ],
  },
  {
    label: 'Defendant',
    fields: [
      { fact_type: 'defendant_name', label: 'Name', required: true, placeholder: 'e.g. Acme Corp' },
      { fact_type: 'defendant_type', label: 'Entity Type', required: true, type: 'select' },
      { fact_type: 'defendant_residence', label: 'Residence / Principal Office', required: false },
      { fact_type: 'defendant_incorporation_state', label: 'State of Incorporation', required: false },
      {
        fact_type: 'defendant_principal_place_of_business',
        label: 'Principal Place of Business',
        required: false,
      },
      { fact_type: 'defendant_service_address', label: 'Service Address', required: false },
    ],
  },
  {
    label: 'Incident',
    fields: [
      { fact_type: 'incident_date', label: 'Date', required: true, type: 'date' },
      { fact_type: 'incident_address', label: 'Address', required: true },
      { fact_type: 'incident_county', label: 'County', required: true },
      { fact_type: 'incident_state', label: 'State', required: true },
    ],
  },
  {
    label: 'Damages',
    fields: [
      {
        fact_type: 'medical_expenses',
        label: 'Medical Expenses',
        required: false,
        placeholder: 'e.g. $50,000',
      },
      {
        fact_type: 'lost_wages',
        label: 'Lost Wages',
        required: false,
        placeholder: 'e.g. $10,000',
      },
      {
        fact_type: 'property_damage',
        label: 'Property Damage',
        required: false,
        placeholder: 'e.g. $5,000',
      },
      {
        fact_type: 'estimated_amount_in_controversy',
        label: 'Estimated Amount in Controversy',
        required: false,
        placeholder: 'e.g. $75,000',
      },
    ],
  },
];

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  return { title: matter ? `Intake — ${matter.name}` : 'Matter Not Found' };
}

export default async function IntakePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;

  const matter = await prisma.matter.findUnique({ where: { id } });
  if (!matter) notFound();

  const facts = await prisma.fact.findMany({ where: { matter_id: id } });
  const factsByType: Record<string, string> = Object.fromEntries(
    facts.map((f) => [f.fact_type, f.value]),
  );

  const formAction = saveIntakeFacts.bind(null, matter.id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/matters/${matter.id}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {matter.name}
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Intake</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Enter known facts. Empty fields are skipped. Clearing a saved field removes the fact.
        </p>
      </div>

      {saved === '1' && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          Intake saved.
        </div>
      )}

      <form action={formAction} className="space-y-8">
        {INTAKE_SECTIONS.map((section) => (
          <div key={section.label}>
            <h2 className="text-sm font-semibold text-gray-900 mb-3 pb-1.5 border-b border-gray-200">
              {section.label}
            </h2>
            <div className="space-y-3 max-w-lg">
              {section.fields.map((field) => (
                <div key={field.fact_type}>
                  <label
                    htmlFor={field.fact_type}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      id={field.fact_type}
                      name={field.fact_type}
                      defaultValue={factsByType[field.fact_type] ?? ''}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="">Select type</option>
                      {Object.values(ENTITY_TYPES).map((t) => (
                        <option key={t} value={t}>
                          {ENTITY_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.fact_type}
                      name={field.fact_type}
                      type={field.type ?? 'text'}
                      defaultValue={factsByType[field.fact_type] ?? ''}
                      placeholder={field.placeholder ?? ''}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  )}

                  {factsByType[field.fact_type] && (
                    <p className="mt-0.5 text-xs text-green-700">Saved</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Save Intake
          </button>
          <Link
            href={`/matters/${matter.id}/facts`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Facts
          </Link>
          <Link
            href={`/matters/${matter.id}`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Matter
          </Link>
        </div>
      </form>
    </div>
  );
}
