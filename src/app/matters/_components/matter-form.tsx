'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
  MATTER_STATUSES,
  MATTER_STATUS_LABELS,
} from '@/lib/constants';
import type { MatterFormState } from '../actions';

type DefaultValues = {
  name?: string;
  practice_area?: string;
  status?: string;
  notes?: string | null;
};

type Props = {
  action: (prevState: MatterFormState, formData: FormData) => Promise<MatterFormState>;
  defaultValues?: DefaultValues;
  cancelHref: string;
  submitLabel?: string;
};

export function MatterForm({
  action,
  defaultValues,
  cancelHref,
  submitLabel = 'Save Matter',
}: Props) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Matter Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultValues?.name}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="e.g. Smith v. Acme Corp"
        />
        {state.errors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="practice_area" className="block text-sm font-medium text-gray-700 mb-1">
          Practice Area <span className="text-red-500">*</span>
        </label>
        <select
          id="practice_area"
          name="practice_area"
          defaultValue={defaultValues?.practice_area ?? ''}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="" disabled>
            Select practice area
          </option>
          {Object.values(PRACTICE_AREAS).map((area) => (
            <option key={area} value={area}>
              {PRACTICE_AREA_LABELS[area]}
            </option>
          ))}
        </select>
        {state.errors?.practice_area && (
          <p className="mt-1 text-xs text-red-600">{state.errors.practice_area}</p>
        )}
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status <span className="text-red-500">*</span>
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? MATTER_STATUSES.INTAKE}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          {Object.values(MATTER_STATUSES).map((s) => (
            <option key={s} value={s}>
              {MATTER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {state.errors?.status && (
          <p className="mt-1 text-xs text-red-600">{state.errors.status}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ''}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Optional notes"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
