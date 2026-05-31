-- CreateTable
CREATE TABLE "Matter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "practice_area" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'intake',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "county" TEXT,
    "state" TEXT,
    "citizenship_state" TEXT,
    "incorporation_state" TEXT,
    "principal_place_of_business" TEXT,
    "registered_agent" TEXT,
    "service_address" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Entity_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "Matter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_date" DATETIME,
    "address" TEXT,
    "county" TEXT,
    "state" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Event_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "Matter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "document_type" TEXT,
    "storage_url" TEXT,
    "processing_status" TEXT NOT NULL DEFAULT 'pending',
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "Matter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "entity_id" TEXT,
    "event_id" TEXT,
    "document_id" TEXT,
    "fact_type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalized_value" TEXT,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "extraction_method" TEXT NOT NULL DEFAULT 'manual',
    "source_document" TEXT,
    "page_number" INTEGER,
    "human_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Fact_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "Matter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Fact_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Fact_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Fact_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "why_it_matters" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Issue_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "Matter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rule_key" TEXT NOT NULL,
    "practice_area" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'general',
    "required_fact_types" TEXT NOT NULL,
    "applies_when" TEXT,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "why_it_matters" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL DEFAULT 'filing_readiness',
    "readiness_score" REAL,
    "summary" TEXT,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "Matter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Entity_matter_id_idx" ON "Entity"("matter_id");

-- CreateIndex
CREATE INDEX "Event_matter_id_idx" ON "Event"("matter_id");

-- CreateIndex
CREATE INDEX "Document_matter_id_idx" ON "Document"("matter_id");

-- CreateIndex
CREATE INDEX "Fact_matter_id_idx" ON "Fact"("matter_id");

-- CreateIndex
CREATE INDEX "Fact_matter_id_fact_type_idx" ON "Fact"("matter_id", "fact_type");

-- CreateIndex
CREATE INDEX "Issue_matter_id_idx" ON "Issue"("matter_id");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_rule_key_key" ON "Rule"("rule_key");

-- CreateIndex
CREATE INDEX "Rule_practice_area_idx" ON "Rule"("practice_area");

-- CreateIndex
CREATE INDEX "Report_matter_id_idx" ON "Report"("matter_id");
