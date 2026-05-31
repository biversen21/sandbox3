# Project: Plaintiff Filing Readiness Analyzer

You are the engineering agent building the MVP for an AI-assisted plaintiff litigation intake and filing-readiness platform.

This project is part of an indie SaaS portfolio. Optimize for speed, clarity, extensibility, and low operational complexity.

The founder is a senior engineering leader with limited weekly build time.

Assume:

* Aggressive MVP execution
* AI-assisted development workflow
* Willingness to rewrite implementation details later
* Preference for simple, durable architecture
* No premature enterprise complexity
* Schema and data model matter more than perfect UI polish

---

## Product Thesis

Most legal AI tools focus on:

* Drafting
* Research
* Document chat

This product focuses upstream:

Help plaintiff-side attorneys and paralegals identify, organize, validate, and complete the facts required before a matter is filing-ready.

The MVP is:

* NOT a legal research platform
* NOT a complaint generator
* NOT an AI lawyer
* NOT a motion drafting tool

The MVP IS:

**Filing Readiness Intelligence**

Core question:

> What filing-critical facts do we have, what are we missing, and why does it matter?

Everything else is built on top of that foundation.

---

## Core User

Plaintiff-side attorneys and paralegals.

Initial practice areas:

* Personal Injury
* Premises Liability
* Motor Vehicle Accidents

Future practice areas:

* Employment Litigation
* Mass Torts

Target firms:

* Solo
* Small Firm
* Mid-Sized Plaintiff Firms

---

## Primary KPI

Reduce attorney/paralegal effort required to identify filing-critical facts by at least 50%.

Secondary KPIs:

* Reduced intake cycle time
* Fewer missing facts at filing
* Increased matter throughput
* Reduced client follow-up loops
* Improved consistency across matters

---

## Non-Negotiable Product Principles

### Attorney Review Required

Never present legal conclusions.

**Allowed:**
> Based on currently known facts, the following considerations may be relevant.

**Not allowed:**
> File this case in Court X.

**Not allowed:**
> This case belongs in Federal Court.

The system identifies facts and considerations.  
The attorney makes legal decisions.

---

### Never Invent Law

Never invent:

* Statutes
* Case law
* Citations
* Procedural rules
* Jurisdiction thresholds
* Court-specific requirements

If rules are required:

* Store them in structured data
* Explain them using the LLM
* Evaluate them deterministically

**Rules engine decides. LLM explains.**

---

### Provenance Required

Every extracted fact must include:

* Source document
* Page number (if available)
* Extraction method
* Confidence score
* Human verification status

Example:

```json
{
  "fact_type": "incident_date",
  "value": "2026-04-12",
  "source_document": "Police Report.pdf",
  "page": 3,
  "confidence": 0.96,
  "verified": false
}
```

Facts without provenance are lower trust.

---

### Deterministic > AI

**LLM responsibilities:**

* Fact extraction
* Classification
* Summarization
* Explanations
* Claim category suggestions

**Deterministic responsibilities:**

* Missing fact detection
* Readiness scoring
* Required fact evaluation
* Rule evaluation
* Venue logic (future)
* Jurisdiction logic (future)
* Removal logic (future)

Never rely on the LLM as the source of truth for procedural requirements.

---

## MVP Scope

### Build

* Matter Management
* Structured Intake
* Document Upload
* Fact Extraction
* Fact Provenance
* Missing Fact Detection
* Readiness Scoring
* Filing Readiness Reports
* Audit Trail Foundations

### Do Not Build

* Complaint Drafting
* Motion Drafting
* Legal Research
* Citation Generation
* Case Law Search
* RAG Platform
* Vector Database
* Enterprise RBAC
* Billing
* Integrations with Clio/Filevine/etc.

---

## Core Data Model

Permanent primitives:

```
Matter
Document
Fact
Entity
Event
Issue
Rule
Report
```

Everything should be modeled around structured litigation facts.

**Do not design around PDFs. Design around facts.**

---

### Matter

Represents a legal matter.

Fields:

* id
* name
* practice_area
* status
* notes
* created_at
* updated_at

---

### Entity

Represents:

* Plaintiff
* Defendant
* Witness
* Provider
* Employer
* Insurer

Fields:

* id
* matter_id
* role
* entity_type
* name
* address
* county
* state
* citizenship_state
* incorporation_state
* principal_place_of_business
* registered_agent
* service_address
* metadata

---

### Event

Represents:

* Accident
* Treatment
* Surgery
* Communication
* Employment Action

Fields:

* id
* matter_id
* event_type
* event_date
* address
* county
* state
* description

---

### Document

Fields:

* id
* matter_id
* filename
* document_type
* storage_url
* processing_status
* uploaded_at

---

### Fact

Most important object in the system.

Fields:

* id
* matter_id
* entity_id
* event_id
* document_id
* fact_type
* value
* normalized_value
* confidence
* extraction_method
* source_document
* page_number
* human_verified
* verified_by

Example fact types:

* plaintiff_residence
* plaintiff_citizenship
* defendant_name
* defendant_type
* defendant_incorporation_state
* defendant_principal_place_of_business
* defendant_service_address
* incident_date
* incident_address
* incident_county
* incident_state
* medical_expenses
* lost_wages
* property_damage
* estimated_amount_in_controversy

---

### Issue

Represents:

* Missing Fact
* Conflicting Fact
* Low Confidence Fact
* Readiness Blocker

Fields:

* id
* matter_id
* issue_type
* severity
* title
* description
* why_it_matters
* status

---

### Rule

Structured deterministic requirement.

Fields:

* id
* rule_key
* practice_area
* jurisdiction
* required_fact_types
* applies_when
* severity
* title
* why_it_matters

---

### Report

Fields:

* id
* matter_id
* report_type
* readiness_score
* summary
* generated_at

---

## Initial Rule Pack

Start with Personal Injury only.

### Base PI Requirements

Required:

* plaintiff_name
* plaintiff_residence
* defendant_name
* defendant_type
* incident_date
* incident_address
* incident_county
* incident_state

---

### Corporate Defendant Requirements

Applies when: `defendant_type = corporation/entity`

Required:

* incorporation_state
* principal_place_of_business
* service_address

Reason: Relevant to service planning and diversity analysis.

---

### Damages Requirements

Required:

* medical_expenses
* estimated_amount_in_controversy

Optional:

* lost_wages
* property_damage

Reason: Relevant to valuation and jurisdiction considerations.

---

## Missing Fact Engine

This is the MVP's primary feature.

Example output:

```
Missing Facts

Defendant Principal Place of Business
Why It Matters:
Corporate citizenship analysis may require this information.

Service Address
Why It Matters:
Service planning requires a valid address.

Estimated Amount in Controversy
Why It Matters:
May affect court assignment and federal jurisdiction considerations.

Attorney review required.
```

---

## Readiness Score

Deterministic only. No AI scoring.

Example:

```
Plaintiff Facts:   100%
Defendant Facts:    60%
Incident Facts:     90%
Damages Facts:      50%
Overall Readiness:  75%

Primary Blockers:
- Missing service address
- Missing principal place of business
- Missing damages estimate
```

---

## Filing Readiness Report

Sections:

1. Matter Summary
2. Known Facts
3. Defendant Analysis
4. Venue-Relevant Facts
5. Jurisdiction-Relevant Facts
6. Potential Removal Considerations
7. Missing Facts
8. Potential Claim Categories
9. Filing Readiness Score
10. Attorney Review Disclaimer

The report surfaces information. The report does not make legal decisions.

---

## Potential Claim Categories

Suggestions only. Examples:

* Negligence
* Negligence Per Se
* Motor Vehicle Negligence
* Premises Liability
* Negligent Entrustment
* Negligent Hiring
* Negligent Maintenance
* Vicarious Liability

Requirements:

* Always mark as potential
* Always require attorney review
* Never draft causes of action

---

## UX Priorities

The UI should always answer:

1. What do we know?
2. What are we missing?
3. Why does it matter?
4. Where did this fact come from?

Pages:

* Matter List
* Matter Detail
* Intake
* Documents
* Facts
* Issues
* Filing Readiness Report

**Avoid chat-first UX. This is a workflow product.**

---

## Recommended Stack

**Frontend:**

* Next.js
* TypeScript
* Tailwind
* shadcn/ui

**Backend:**

* Next.js API Routes
* Postgres
* Prisma

**Storage:**

* S3-compatible object storage

**AI:**

* Provider abstraction
* Anthropic/OpenAI interchangeable

**Avoid:**

* Microservices
* Kafka
* Event sourcing
* Premature RAG
* Enterprise architecture

Keep it boring.

---

## Build Order

1. Database schema
2. Matter CRUD
3. Intake forms
4. Fact model
5. Manual fact entry
6. Missing fact engine
7. Readiness scoring
8. Report generation
9. Document upload
10. AI extraction

**Important: Manual facts before AI extraction. Prove the workflow first.**

---

## Git Workflow (Non-Negotiable)

Never commit directly to main.

Every task must follow:

1. Create feature branch
2. Implement changes
3. Run validation
4. Commit to branch
5. Open Pull Request
6. Stop and wait for review

Example:

```
git checkout -b feature/matter-crud
git checkout -b feature/fact-model
git checkout -b feature/readiness-engine
```

Before opening a PR:

* Run tests
* Run lint
* Verify build
* Verify migrations

Every PR should contain:

* Summary
* Scope
* Schema changes
* Screenshots (if UI)
* Follow-up TODOs

Assume:

* Protected main branch
* PR-based workflow
* No direct commits to main
* No direct pushes to main
* No automatic merges

---

## MVP Acceptance Criteria

User can:

1. Create matter
2. Enter plaintiff facts
3. Enter defendant facts
4. Enter incident facts
5. Enter damages facts
6. Upload documents
7. View facts
8. See missing facts
9. Understand why facts matter
10. Generate filing readiness report

---

## Compliance Disclaimer

Use:

> This report is for attorney review only. It identifies known facts, missing information, and procedural considerations based on available matter data. It does not provide legal advice, determine where a case should be filed, or replace attorney judgment.

---

## Future Roadmap (Not MVP)

Future modules:

* Venue Analysis
* Federal Diversity Analysis
* Removal Analysis
* Jurisdiction Rule Packs
* Litigation Timeline
* Case Graph Visualization
* Complaint Drafting
* Firm Knowledge Base
* Motion Intelligence
* Settlement Analytics
* RAG Layer

Design for these. Do not build them now.

---

## Founder Preferences

Optimize for:

* Fast execution
* Demoability
* Clear schemas
* Durable data structures
* Low hosting cost
* AI-assisted development
* Minimal complexity

**Code is disposable. Data structures are not.**

When in doubt:

> Choose the simpler implementation that preserves future optionality.
