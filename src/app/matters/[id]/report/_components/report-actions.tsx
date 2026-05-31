'use client';

import { useState } from 'react';

export function CopyReportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? '✓ Copied' : 'Copy as Plain Text'}
    </button>
  );
}

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Print
    </button>
  );
}
