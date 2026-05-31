import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
} from '@/lib/constants';
import { uploadDocument, deleteDocument, extractDocumentText } from './actions';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matter = await prisma.matter.findUnique({ where: { id } });
  return { title: matter ? `Documents — ${matter.name}` : 'Matter Not Found' };
}

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.gif,.tiff,.bmp,.webp';

const STATUS_BADGE: Record<string, string> = {
  uploaded: 'bg-blue-100 text-blue-800',
  pending: 'bg-blue-100 text-blue-800',
  processing: 'bg-amber-100 text-amber-800',
  text_extracted: 'bg-green-100 text-green-800',
  extraction_failed: 'bg-red-100 text-red-800',
  unsupported: 'bg-gray-100 text-gray-600',
  complete: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtLabel(filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() ?? '?';
  return ext.length <= 5 ? ext : ext.slice(0, 5);
}

export default async function DocumentsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { uploaded, error } = await searchParams;

  const matter = await prisma.matter.findUnique({ where: { id } });
  if (!matter) notFound();

  const documents = await prisma.document.findMany({
    where: { matter_id: id },
    orderBy: { uploaded_at: 'desc' },
  });

  const uploadAction = uploadDocument.bind(null, matter.id);

  return (
    <div>
      <div className="mb-6">
        <Link href={`/matters/${matter.id}`} className="text-sm text-gray-500 hover:text-gray-900">
          ← {matter.name}
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Documents</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload supporting documents. Extract text from PDFs for review. Images require OCR — not yet supported.
        </p>
      </div>

      {/* Success banner */}
      {uploaded === '1' && (
        <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          Document uploaded successfully.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Upload form */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Upload Document</h2>
        <form action={uploadAction} className="space-y-4 max-w-lg">
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
              File <span className="text-red-500">*</span>
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept={ACCEPTED_TYPES}
              required
              className="w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-400">
              PDF, PNG, JPG, GIF, TIFF, WEBP · Max 10 MB
            </p>
          </div>

          <div>
            <label
              htmlFor="document_type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Document Type
            </label>
            <select
              id="document_type"
              name="document_type"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select type (optional)</option>
              {Object.values(DOCUMENT_TYPES).map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Upload
          </button>
        </form>
      </div>

      {/* Document list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Uploaded Documents</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {documents.length}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {documents.map((doc) => {
              const deleteAction = deleteDocument.bind(null, doc.id, matter.id);
              const extractAction = extractDocumentText.bind(null, doc.id, matter.id);
              const typeLabel = doc.document_type
                ? (DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type)
                : 'Unclassified';
              const statusLabel =
                DOCUMENT_STATUS_LABELS[doc.processing_status] ?? doc.processing_status;
              const statusBadge =
                STATUS_BADGE[doc.processing_status] ?? 'bg-gray-100 text-gray-700';
              const hasFile = !!doc.storage_url;
              const isPdf = doc.mime_type === 'application/pdf';
              const canExtract =
                hasFile &&
                isPdf &&
                doc.processing_status !== 'processing' &&
                doc.processing_status !== 'unsupported';
              const hasText = !!doc.extracted_text;

              return (
                <div key={doc.id} className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    {/* File type badge */}
                    <div className="shrink-0 w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-400">
                        {fileExtLabel(doc.filename)}
                      </span>
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{typeLabel}</span>
                        {doc.mime_type && (
                          <>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{doc.mime_type}</span>
                          </>
                        )}
                        {doc.size_bytes !== null && (
                          <>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{formatBytes(doc.size_bytes)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status + date + actions */}
                    <div className="shrink-0 flex items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge}`}
                      >
                        {statusLabel}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>

                      {/* Open link */}
                      {hasFile && (
                        <Link
                          href={`/api/documents/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-gray-900 underline"
                        >
                          Open
                        </Link>
                      )}

                      {/* Extract / Re-extract text */}
                      {canExtract && (
                        <form action={extractAction}>
                          <button
                            type="submit"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            {hasText ? 'Re-extract' : 'Extract Text'}
                          </button>
                        </form>
                      )}

                      {/* Non-PDF note */}
                      {hasFile && !isPdf && doc.processing_status !== 'unsupported' && (
                        <form action={extractAction}>
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-gray-600 underline"
                            title="Images require OCR — not supported yet"
                          >
                            Mark unsupported
                          </button>
                        </form>
                      )}

                      {/* Delete */}
                      <form action={deleteAction}>
                        <button
                          type="submit"
                          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                          aria-label={`Delete ${doc.filename}`}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Extraction error */}
                  {doc.extraction_error && (
                    <p className="mt-1.5 text-xs text-red-600 pl-14">
                      Error: {doc.extraction_error}
                    </p>
                  )}

                  {/* Extracted text preview */}
                  {hasText && (
                    <div className="mt-2 pl-14">
                      <p className="text-xs font-medium text-gray-500 mb-1">Extracted text preview</p>
                      <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                        {doc.extracted_text!.slice(0, 800)}
                        {doc.extracted_text!.length > 800 ? '…' : ''}
                      </pre>
                      {doc.extracted_at && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          Extracted {new Date(doc.extracted_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Local development storage only.</strong> Uploaded files are stored on the
            local filesystem under <code className="font-mono">uploads/</code>. This directory is
            excluded from version control. Before production, replace with S3-compatible object
            storage (AWS S3, Cloudflare R2, etc.). Text extraction is PDF-only and synchronous —
            no OCR, no LLM. Extracted text is stored for reference only; Facts are not created automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
