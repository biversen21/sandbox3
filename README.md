# Plaintiff Filing Readiness Analyzer

An AI-assisted plaintiff litigation intake and filing-readiness platform.

## Setup

### Prerequisites

- Node.js 18.18+
- npm

### Install

```bash
npm install
```

### Database

Copy the example environment file:

```bash
cp .env.example .env
```

The default uses SQLite for local development (`file:./dev.db`).

To switch to PostgreSQL: update `DATABASE_URL` in `.env` and change
`provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.

Run migrations:

```bash
npx prisma migrate dev --name init
```

Seed the Personal Injury rule pack:

```bash
npx prisma db seed
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Validation

```bash
npm run lint
npm run build
```

### Database Studio

```bash
npx prisma studio
```

### AI Fact Extraction (optional)

To enable AI-assisted fact suggestion from extracted PDF text:

```bash
# Add to .env
ANTHROPIC_API_KEY=your_key_here
```

Get a key at [console.anthropic.com](https://console.anthropic.com/). The app works without it — AI extraction buttons will show a friendly error message.

## Stack

- [Next.js 15](https://nextjs.org/) — App Router, TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Prisma 5](https://www.prisma.io/) — ORM
- SQLite (local dev) / PostgreSQL (production)

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the full product spec, data model, and engineering principles.

---

## Developer Notes

### Readiness Score Is Fact Completeness, Not Legal Readiness

The readiness score is a **fact completeness score** — it measures whether the structured facts
required by the seeded rule pack are present, verified, and high-confidence. A score of 100%
means all configured required facts are recorded. It does **not** mean the matter is legally
ready to file. Attorney judgment is always required before any filing decision.

### No LLM in the Readiness and Report Pipeline

The readiness score, missing fact detection, issue derivation, and the full filing readiness
report are all generated **deterministically** from structured fact data and the seeded rule pack.
No LLM or AI model is used anywhere in this pipeline. LLM usage is reserved for future document
extraction features only.

### Attorney Review Always Required

The system never makes legal conclusions. It surfaces structured facts, identifies what is
missing based on configured rules, and provides structured data for attorney review. Venue
analysis, jurisdiction determinations, removal analysis, and all filing decisions are the
attorney's responsibility. All report language uses "may be relevant" rather than conclusions.

### SQLite JSON Fields

Prisma 5.x does not support the `Json` type on SQLite. All JSON fields (`required_fact_types`,
`applies_when`, `metadata`, `summary`) are stored as `String` and parsed centrally in
`src/lib/rules.ts`. Migrating to PostgreSQL only requires changing the `provider` in
`prisma/schema.prisma` — no application logic changes.

---

## Required Fact Coverage

All fact types required by the seeded Personal Injury rule pack are available in the structured
intake form (`/matters/[id]/intake`) and via manual entry (`/matters/[id]/facts`).

| Fact Type | Rule | Severity | Intake | Manual |
|---|---|---|:---:|:---:|
| plaintiff_name | pi_plaintiff_facts | critical | ✓ | ✓ |
| plaintiff_residence | pi_plaintiff_facts | critical | ✓ | ✓ |
| defendant_name | pi_defendant_facts | critical | ✓ | ✓ |
| defendant_type | pi_defendant_facts | critical | ✓ | ✓ |
| incident_date | pi_incident_location_facts | critical | ✓ | ✓ |
| incident_address | pi_incident_location_facts | critical | ✓ | ✓ |
| incident_county | pi_incident_location_facts | critical | ✓ | ✓ |
| incident_state | pi_incident_location_facts | critical | ✓ | ✓ |
| defendant_incorporation_state | pi_corporate_defendant_facts | high | ✓ | ✓ |
| defendant_principal_place_of_business | pi_corporate_defendant_facts | high | ✓ | ✓ |
| defendant_service_address | pi_corporate_defendant_facts | high | ✓ | ✓ |
| medical_expenses | pi_damages_required | high | ✓ | ✓ |
| estimated_amount_in_controversy | pi_damages_required | high | ✓ | ✓ |
| lost_wages | pi_damages_optional | medium | ✓ | ✓ |
| property_damage | pi_damages_optional | medium | ✓ | ✓ |

Additional facts in intake (not required by any rule, used in report sections):

| Fact Type | Used In |
|---|---|
| plaintiff_citizenship | Jurisdiction-Relevant Facts, Potential Removal Considerations |
| defendant_residence | Defendant Analysis |

---

## Smoke Test Scenarios

Four documented scenarios for validating the readiness engine, issues page, and report.

### Scenario 1: Empty Matter

1. Create a new Personal Injury matter.
2. Do not fill any intake fields.
3. Navigate to **Filing Readiness** — expect ~0% overall score.
4. Navigate to **Issues** — expect all critical/high required facts listed as missing.
5. Navigate to **Report** — expect Known Facts section empty, Missing Facts section fully populated, claim suggestions absent (no facts to reason from).

### Scenario 2: Base PI Matter (Individual Defendant)

1. Create a new Personal Injury matter.
2. Fill intake:
   - Plaintiff: name + residence
   - Defendant: name, type = **Individual**
   - Incident: date, address, county, state
3. Navigate to **Filing Readiness** — expect ~80% overall (Damages section at 0%).
4. Navigate to **Issues** — expect `medical_expenses` and `estimated_amount_in_controversy` as high-severity missing. Corporate rule should **not** trigger.
5. Navigate to **Report** — Defendant Analysis should show no corporate citizenship checklist. Negligence suggestion appears; no corporate claim suggestions.

### Scenario 3: Corporate Defendant Matter

1. Create a new Personal Injury matter.
2. Fill intake:
   - Plaintiff: name + residence
   - Defendant: name, type = **Corporation**
   - Incident: date, address, county, state
3. Navigate to **Filing Readiness** — expect ~60–65% overall (Damages at 0%, Defendant at ~40% due to missing corporate facts).
4. Navigate to **Issues** — expect `defendant_incorporation_state`, `defendant_principal_place_of_business`, `defendant_service_address` as high-severity missing, plus damages facts.
5. Navigate to **Report** — Defendant Analysis should show corporate citizenship checklist with all three facts marked missing. Vicarious Liability and Negligent Hiring suggestions should appear.

### Scenario 4: Damages-Complete Matter (Full PI)

1. Start from Scenario 3 (corporate defendant).
2. Fill remaining intake fields:
   - Defendant: incorporation state, principal place of business, service address
   - Damages: medical expenses, estimated amount in controversy
3. Navigate to **Filing Readiness** — expect 100% overall score.
4. Navigate to **Issues** — expect 0 missing required facts. Low-confidence or unverified issues may appear if intake facts were not manually verified.
5. Navigate to **Report** — Known Facts fully populated across all categories. Primary Blockers section shows none. Readiness score 100%. All report sections complete.

---

## Demo Walkthrough

### Option A: Seeded demo matter (fastest)

```bash
# 1. Seed rules (if not already done)
npm run db:seed

# 2. Create the demo matter
npm run db:demo

# 3. Start the server
npm run dev
```

Open `http://localhost:3000` → click **Johnson v. Acme Logistics Corp.**

**What you'll see:**

| Page | State |
|---|---|
| **Matter Detail** | Facts: 14 (2 need review), Documents: 0 |
| **Facts** | 12 verified manual facts + 2 AI-extracted (amber highlight, Needs review badge) |
| **Issues** | 1 missing (estimated_amount_in_controversy — high) · 1 low confidence · 2 needs review |
| **Filing Readiness** | ~89% overall · Damages at 50% · Provenance ~89% |
| **Report** | All 10 sections · Source excerpts on AI facts · Copy or Print |

To complete the demo: go to **Intake**, add an amount in controversy, then re-check Readiness (→ 100%).

---

### Option B: Manual end-to-end walkthrough

**Step 1 — Create a matter**
- Go to `/matters/new`
- Name: anything, Practice Area: Personal Injury, Status: Intake

**Step 2 — Fill intake**
- Plaintiff: name, residence, citizenship
- Defendant: name, type = Corporation, incorporation state, principal place of business, service address
- Incident: date, address, county, state
- Damages: medical expenses (leave estimated amount out to see a blocker)

**Step 3 — View Issues**
- Navigate to Issues → see `estimated_amount_in_controversy` as a high-severity blocker

**Step 4 — View Readiness**
- Navigate to Filing Readiness → see Damages category at 50%, overall ~75%

**Step 5 — Upload a document**
- Navigate to Documents → upload a PDF
- Click **Extract Text** → wait for `text_extracted` status

**Step 6 — Suggest Facts (requires `ANTHROPIC_API_KEY`)**
- Click **Suggest Facts** → AI extracts filing-relevant facts
- Success banner shows created/updated/skipped counts
- Click "Review suggested facts →"

**Step 7 — Review AI facts**
- Facts page: AI facts highlighted in amber with "Needs review" badge
- Source column shows "Source excerpt:" with provenance quote
- Click **Verify** on facts the attorney confirms → badge turns green

**Step 8 — Add estimated amount**
- Go to Intake or Facts → add `estimated_amount_in_controversy`

**Step 9 — View Filing Readiness Report**
- Navigate to Report → 10-section deterministic report
- Click **Copy as Plain Text** or **Print** for attorney review

---

## MVP Status

### What Works

- Matter CRUD (create, read, update, delete)
- Structured intake form — 17 filing-relevant fact types across plaintiff, defendant, incident, damages
- Manual fact entry with provenance fields (source document, confidence, verification)
- Document upload — PDF + image, local filesystem storage, 10 MB limit
- Secure file serving — DB-validated path, path traversal prevention
- PDF text extraction — `pdfjs-dist` legacy build, Node.js compatible, synchronous
- AI fact suggestion from extracted text — Anthropic API, structured JSON output
- Source quote provenance on AI-extracted facts
- Attorney review workflow — Verify toggle promotes facts to `human_verified`
- Missing fact detection — deterministic, PI rule pack, severity-coded
- Low-confidence and needs-review issue flagging (< 75% confidence, unverified AI facts)
- Filing readiness score — deterministic, 5-category weighted (Plaintiff/Defendant/Incident/Damages/Provenance)
- Filing readiness report — 10 sections, print-friendly, copy-as-plain-text
- No-LLM pipeline — all readiness, scoring, issue detection, and reporting is deterministic

### Intentionally Not Built (MVP Scope)

- OCR for images (text extraction is PDF-only)
- Complaint or motion drafting
- Legal research or citation generation
- Venue analysis engine
- Jurisdiction rule packs (beyond base PI)
- Removal analysis
- Embeddings / RAG / vector search
- Authentication and user accounts
- Enterprise RBAC
- Background job queue
- Billing
- Integrations (Clio, Filevine, MyCase, etc.)
- Multi-firm / multi-tenant support

### Known Production Gaps

| Gap | Notes |
|---|---|
| **File storage** | Local filesystem only — replace with S3/R2 before production |
| **Authentication** | No auth — do not expose publicly without auth layer |
| **Database** | SQLite for local dev — migrate to PostgreSQL before production |
| **API key management** | `ANTHROPIC_API_KEY` in env var — use a secrets manager in production |
| **Rate limiting** | No rate limits on uploads or AI extraction |
| **Audit log** | Fact verification has no persistent audit trail |
| **Multi-tenancy** | Single-tenant — no firm/user isolation |
| **Error monitoring** | No Sentry or equivalent — add before production |
