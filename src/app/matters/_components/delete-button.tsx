'use client';

import { deleteMatter } from '../actions';

export function DeleteMatterButton({ id }: { id: string }) {
  const action = deleteMatter.bind(null, id);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm('Delete this matter? This cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
