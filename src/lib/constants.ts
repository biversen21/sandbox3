export const PRACTICE_AREAS = {
  PERSONAL_INJURY: 'personal_injury',
  PREMISES_LIABILITY: 'premises_liability',
  MOTOR_VEHICLE: 'motor_vehicle',
} as const;

export type PracticeArea = (typeof PRACTICE_AREAS)[keyof typeof PRACTICE_AREAS];

export const MATTER_STATUSES = {
  INTAKE: 'intake',
  ACTIVE: 'active',
  FILING_READY: 'filing_ready',
  FILED: 'filed',
  CLOSED: 'closed',
} as const;

export type MatterStatus = (typeof MATTER_STATUSES)[keyof typeof MATTER_STATUSES];

export const ENTITY_ROLES = {
  PLAINTIFF: 'plaintiff',
  DEFENDANT: 'defendant',
  WITNESS: 'witness',
  PROVIDER: 'provider',
  EMPLOYER: 'employer',
  INSURER: 'insurer',
} as const;

export type EntityRole = (typeof ENTITY_ROLES)[keyof typeof ENTITY_ROLES];

export const ENTITY_TYPES = {
  INDIVIDUAL: 'individual',
  CORPORATION: 'corporation',
  LLC: 'llc',
  PARTNERSHIP: 'partnership',
  GOVERNMENT: 'government',
  NONPROFIT: 'nonprofit',
  OTHER: 'other',
} as const;

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

export const FACT_TYPES = {
  // Plaintiff
  PLAINTIFF_NAME: 'plaintiff_name',
  PLAINTIFF_RESIDENCE: 'plaintiff_residence',
  PLAINTIFF_CITIZENSHIP: 'plaintiff_citizenship',
  // Defendant
  DEFENDANT_NAME: 'defendant_name',
  DEFENDANT_TYPE: 'defendant_type',
  DEFENDANT_RESIDENCE: 'defendant_residence',
  DEFENDANT_INCORPORATION_STATE: 'defendant_incorporation_state',
  DEFENDANT_PRINCIPAL_PLACE_OF_BUSINESS: 'defendant_principal_place_of_business',
  DEFENDANT_SERVICE_ADDRESS: 'defendant_service_address',
  // Incident
  INCIDENT_DATE: 'incident_date',
  INCIDENT_ADDRESS: 'incident_address',
  INCIDENT_COUNTY: 'incident_county',
  INCIDENT_STATE: 'incident_state',
  // Damages
  MEDICAL_EXPENSES: 'medical_expenses',
  LOST_WAGES: 'lost_wages',
  PROPERTY_DAMAGE: 'property_damage',
  ESTIMATED_AMOUNT_IN_CONTROVERSY: 'estimated_amount_in_controversy',
} as const;

export type FactType = (typeof FACT_TYPES)[keyof typeof FACT_TYPES];

export const ISSUE_TYPES = {
  MISSING_FACT: 'missing_fact',
  CONFLICTING_FACT: 'conflicting_fact',
  LOW_CONFIDENCE: 'low_confidence',
  READINESS_BLOCKER: 'readiness_blocker',
} as const;

export type IssueType = (typeof ISSUE_TYPES)[keyof typeof ISSUE_TYPES];

export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type SeverityLevel = (typeof SEVERITY_LEVELS)[keyof typeof SEVERITY_LEVELS];

export const EXTRACTION_METHODS = {
  MANUAL: 'manual',
  AI: 'ai',
  IMPORT: 'import',
} as const;

export type ExtractionMethod = (typeof EXTRACTION_METHODS)[keyof typeof EXTRACTION_METHODS];

export const ISSUE_STATUSES = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[keyof typeof ISSUE_STATUSES];

export const EVENT_TYPES = {
  ACCIDENT: 'accident',
  TREATMENT: 'treatment',
  SURGERY: 'surgery',
  COMMUNICATION: 'communication',
  EMPLOYMENT_ACTION: 'employment_action',
  OTHER: 'other',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const DOCUMENT_TYPES = {
  POLICE_REPORT: 'police_report',
  MEDICAL_RECORD: 'medical_record',
  INSURANCE_DOCUMENT: 'insurance_document',
  PHOTO_EVIDENCE: 'photo_evidence',
  WITNESS_STATEMENT: 'witness_statement',
  CORPORATE_FILING: 'corporate_filing',
  CONTRACT: 'contract',
  CORRESPONDENCE: 'correspondence',
  OTHER: 'other',
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_PROCESSING_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  FAILED: 'failed',
} as const;

export const REPORT_TYPES = {
  FILING_READINESS: 'filing_readiness',
} as const;

export const PRACTICE_AREA_LABELS: Record<PracticeArea, string> = {
  personal_injury: 'Personal Injury',
  premises_liability: 'Premises Liability',
  motor_vehicle: 'Motor Vehicle Accident',
};

export const MATTER_STATUS_LABELS: Record<MatterStatus, string> = {
  intake: 'Intake',
  active: 'Active',
  filing_ready: 'Filing Ready',
  filed: 'Filed',
  closed: 'Closed',
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  individual: 'Individual',
  corporation: 'Corporation',
  llc: 'LLC',
  partnership: 'Partnership',
  government: 'Government Entity',
  nonprofit: 'Nonprofit',
  other: 'Other',
};

export const FACT_TYPE_LABELS: Record<string, string> = {
  plaintiff_name: 'Plaintiff Name',
  plaintiff_residence: 'Plaintiff Residence',
  plaintiff_citizenship: 'Plaintiff Citizenship',
  defendant_name: 'Defendant Name',
  defendant_type: 'Defendant Type',
  defendant_residence: 'Defendant Residence',
  defendant_incorporation_state: 'State of Incorporation',
  defendant_principal_place_of_business: 'Principal Place of Business',
  defendant_service_address: 'Service Address',
  incident_date: 'Incident Date',
  incident_address: 'Incident Address',
  incident_county: 'Incident County',
  incident_state: 'Incident State',
  medical_expenses: 'Medical Expenses',
  lost_wages: 'Lost Wages',
  property_damage: 'Property Damage',
  estimated_amount_in_controversy: 'Est. Amount in Controversy',
};

export const EXTRACTION_METHOD_LABELS: Record<string, string> = {
  manual: 'Manual',
  manual_intake: 'Intake',
  ai: 'AI',
  import: 'Import',
};
