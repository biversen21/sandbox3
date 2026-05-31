-- AlterTable
ALTER TABLE "Document" ADD COLUMN "extracted_at" DATETIME;
ALTER TABLE "Document" ADD COLUMN "extracted_text" TEXT;
ALTER TABLE "Document" ADD COLUMN "extraction_error" TEXT;
