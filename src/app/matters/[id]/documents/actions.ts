'use server';

import path from 'path';
import fs from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

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

export async function deleteDocument(documentId: string, matterId: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });

  if (doc?.storage_url) {
    const absPath = path.join(process.cwd(), doc.storage_url);
    await fs.unlink(absPath).catch(() => undefined); // ignore if already gone
  }

  await prisma.document.delete({ where: { id: documentId } });
  revalidatePath(`/matters/${matterId}/documents`);
}
