'use server';

import path from 'path';
import fs from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { extractFactsFromText } from '@/lib/ai';

// TODO: Replace with S3-compatible storage (e.g. AWS S3, Cloudflare R2) before production.
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/tiff',
  'image/bmp',
  'image/webp',
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — matches next.config.ts serverActions.bodySizeLimit

function errorRedirect(matterId: string, message: string): never {
  redirect(`/matters/${matterId}/documents?error=${encodeURIComponent(message)}`);
}

export async function uploadDocument(matterId: string, formData: FormData): Promise<void> {
  const file = formData.get('file') as File | null;
  const documentType = (formData.get('document_type') as string | null)?.trim() || null;

  if (!file || file.size === 0) {
    errorRedirect(matterId, 'No file selected.');
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    errorRedirect(
      matterId,
      'Unsupported file type. Upload a PDF or image (PNG, JPG, GIF, TIFF, WEBP).',
    );
  }

  if (file.size > MAX_BYTES) {
    errorRedirect(matterId, 'File exceeds 10 MB limit.');
  }

  // Create matter-scoped directory
  const matterDir = path.join(UPLOADS_ROOT, matterId);
  await fs.mkdir(matterDir, { recursive: true });

  // Create DB record first to get the cuid for the filename
  const doc = await prisma.document.create({
    data: {
      matter_id: matterId,
      filename: file.name,
      document_type: documentType,
      mime_type: file.type,
      size_bytes: file.size,
      processing_status: 'uploaded',
    },
  });

  // Store as [docId].[ext] to avoid collisions; original filename preserved in DB
  const ext = path.extname(file.name).toLowerCase();
  const storedName = `${doc.id}${ext}`;
  const absPath = path.join(matterDir, storedName);
  // Store as forward-slash path (OS-independent) relative to cwd
  const storageUrl = `uploads/${matterId}/${storedName}`;

  const bytes = await file.arrayBuffer();
  await fs.writeFile(absPath, Buffer.from(bytes));

  await prisma.document.update({
    where: { id: doc.id },
    data: { storage_url: storageUrl },
  });

  redirect(`/matters/${matterId}/documents?uploaded=1`);
}

const PDF_MIME_TYPE = 'application/pdf';

export async function extractDocumentText(documentId: string, matterId: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });

  if (!doc || !doc.storage_url) {
    revalidatePath(`/matters/${matterId}/documents`);
    return;
  }

  if (doc.mime_type !== PDF_MIME_TYPE) {
    await prisma.document.update({
      where: { id: documentId },
      data: { processing_status: 'unsupported' },
    });
    revalidatePath(`/matters/${matterId}/documents`);
    return;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { processing_status: 'processing' },
  });

  try {
    const absPath = path.join(process.cwd(), doc.storage_url);
    const fileBytes = await fs.readFile(absPath);

    // pdfjs-dist legacy build — required for Node.js (main build uses browser globals)
    const pdfjsPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.mjs');
    const workerPath = path.join(
      process.cwd(),
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
    );
    const pdfjs = await import(/* webpackIgnore: true */ pdfjsPath);
    pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(fileBytes),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    });
    const pdfDoc = await loadingTask.promise;

    let text = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item: { str?: string }) => typeof item.str === 'string')
        .map((item: { str: string }) => item.str)
        .join(' ');
      text += pageText + '\n';
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        processing_status: 'text_extracted',
        extracted_text: text.trim(),
        extracted_at: new Date(),
        extraction_error: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        processing_status: 'extraction_failed',
        extraction_error: message,
        extracted_at: new Date(),
      },
    });
  }

  revalidatePath(`/matters/${matterId}/documents`);
}

export async function suggestFacts(documentId: string, matterId: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });

  if (!doc || !doc.extracted_text) {
    redirect(
      `/matters/${matterId}/documents?suggest_error=${encodeURIComponent('No extracted text found. Extract text from the PDF first.')}`,
    );
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errorMessage: string | null = null;

  try {
    const suggestions = await extractFactsFromText(doc.extracted_text);

    for (const suggested of suggestions) {
      // Skip if a verified fact already exists for this matter + fact_type
      const verifiedExisting = await prisma.fact.findFirst({
        where: { matter_id: matterId, fact_type: suggested.fact_type, human_verified: true },
      });
      if (verifiedExisting) {
        skipped++;
        continue;
      }

      // Update if an unverified fact from this exact document already exists
      const sameDocExisting = await prisma.fact.findFirst({
        where: {
          matter_id: matterId,
          fact_type: suggested.fact_type,
          human_verified: false,
          document_id: documentId,
        },
      });

      if (sameDocExisting) {
        await prisma.fact.update({
          where: { id: sameDocExisting.id },
          data: {
            value: suggested.value,
            confidence: suggested.confidence,
          },
        });
        updated++;
      } else {
        await prisma.fact.create({
          data: {
            matter_id: matterId,
            fact_type: suggested.fact_type,
            value: suggested.value,
            confidence: suggested.confidence,
            extraction_method: 'ai_document_extraction',
            source_document: doc.filename,
            document_id: documentId,
            human_verified: false,
          },
        });
        created++;
      }
    }
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : 'Unexpected error during AI fact extraction.';
  }

  revalidatePath(`/matters/${matterId}/facts`);

  if (errorMessage) {
    redirect(
      `/matters/${matterId}/documents?suggest_error=${encodeURIComponent(errorMessage.slice(0, 400))}`,
    );
  }

  redirect(
    `/matters/${matterId}/documents?suggest_created=${created}&suggest_updated=${updated}&suggest_skipped=${skipped}&suggest_doc=${encodeURIComponent(doc.filename)}`,
  );
}

export async function deleteDocument(documentId: string, matterId: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });

  if (doc?.storage_url) {
    const absPath = path.join(process.cwd(), doc.storage_url);
    await fs.unlink(absPath).catch(() => undefined); // ignore if already gone
  }

  await prisma.document.delete({ where: { id: documentId } });
  revalidatePath(`/matters/${matterId}/documents`);
}
