'use client';

import { useActionState, useState } from 'react';
import { FACT_TYPES, FACT_TYPE_LABELS, EXTRACTION_METHODS } from '@/lib/constants';
import { createFact, type AddFactFormState } from '../actions';

const FACT_TYPE_OPTIONS = Object.values(FACT_TYPES).map((v) => ({
  value: v,
  label: FACT_TYPE_LABELS[v] ?? v,
}));

type Props = { matterId: string };

export function AddFactForm({ matterId }: Props) {
  const [open, setOpen] = useState(false);
  const boundAction = createFact.bind(null, matterId);
  const [state, formAction, isPending] = useActionState<AddFactFormState, FormData>(
    boundAction,
    {},
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        + Add Fact
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Add Fact</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fact_type" className="block text-xs font-medium text-gray-700 mb-1">
              Fact Type <span className="text-red-500">*</span>
            </label>
            <select
              id="fact_type"
              name="fact_type"
              defaultValue=""
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="" disabled>
                Select type
              </option>
              {FACT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {state.errors?.fact_type && (
              <p className="mt-0.5 text-xs text-red-600">{state.errors.fact_type}</p>
            )}
          </div>

          <div>
            <label htmlFor="value" className="block text-xs font-medium text-gray-700 mb-1">
              Value <span className="text-red-500">*</span>
            </label>
            <input
              id="value"
              name="value"
              type="text"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            {state.errors?.value && (
              <p className="mt-0.5 text-xs text-red-600">{state.errors.value}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="normalized_value"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Normalized Value
            </label>
            <input
              id="normalized_value"
              name="normalized_value"
              type="text"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div>
            <label htmlFor="confidence" className="block text-xs font-medium text-gray-700 mb-1">
              Confidence (0–1)
            </label>
            <input
              id="confidence"
              name="confidence"
              type="text"
              defaultValue="1.0"
              placeholder="1.0"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            {state.errors?.confidence && (
              <p className="mt-0.5 text-xs text-red-600">{state.errors.confidence}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="extraction_method"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Extraction Method
            </label>
            <select
              id="extraction_method"
              name="extraction_method"
              defaultValue="manual"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              {Object.values(EXTRACTION_METHODS).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="source_document"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Source Document
            </label>
            <input
              id="source_document"
              name="source_document"
              type="text"
              placeholder="e.g. Police Report.pdf"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="page_number" className="block text-xs font-medium text-gray-700 mb-1">
              Page Number
            </label>
            <input
              id="page_number"
              name="page_number"
              type="number"
              min="1"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="human_verified"
                className="rounded border-gray-300"
              />
              Human Verified
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Add Fact'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
