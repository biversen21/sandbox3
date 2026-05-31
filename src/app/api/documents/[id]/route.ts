import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/lib/prisma';

// Serves uploaded files that are referenced by Document records.
// Security controls:
//   1. Document must exist in DB (no arbitrary path access).
//   2. storage_url must start with 'uploads/' (no absolute paths).
//   3. storage_url must not contain '..' (no path traversal).
//   4. path.isAbsolute guard as a belt-and-suspenders check.
// TODO: Replace with signed S3 URLs before production.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });

  if (!doc || !doc.storage_url) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Validate storage_url is a safe relative path within uploads/
  if (
    path.isAbsolute(doc.storage_url) ||
    doc.storage_url.includes('..') ||
    !doc.storage_url.startsWith('uploads/')
  ) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const absPath = path.join(process.cwd(), doc.storage_url);
  const fileBytes = await fs.readFile(absPath).catch(() => null);

  if (!fileBytes) {
    return new NextResponse('File not found', { status: 404 });
  }

  const contentType = doc.mime_type ?? 'application/octet-stream';
  const encodedFilename = encodeURIComponent(doc.filename);

  return new NextResponse(fileBytes, {
    headers: {
      'Content-Type': contentType,
      // inline: display in browser (PDF viewer, image viewer) rather than force-download
      'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
