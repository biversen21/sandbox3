'use client';

import { toggleVerifyFact, deleteFact } from '../actions';

type Props = {
  factId: string;
  verified: boolean;
};

export function FactActions({ factId, verified }: Props) {
  const toggleAction = toggleVerifyFact.bind(null, factId);
  const deleteAction = deleteFact.bind(null, factId);

  return (
    <div className="flex gap-1">
      <form action={toggleAction}>
        <button
          type="submit"
          className={
            verified
              ? 'rounded px-2 py-1 text-xs font-medium text-green-700 border border-green-300 hover:bg-green-50'
              : 'rounded px-2 py-1 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50'
          }
        >
          {verified ? '✓ Verified' : 'Verify'}
        </button>
      </form>
      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (!window.confirm('Delete this fact?')) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="rounded px-2 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50"
        >
          Delete
        </button>
      </form>
    </div>
  );
}
