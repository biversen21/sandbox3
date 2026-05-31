import Anthropic from '@anthropic-ai/sdk';

// Supported fact types for AI extraction — must match FACT_TYPES in constants.ts
const SUPPORTED_FACT_TYPES = new Set<string>([
  'plaintiff_name',
  'plaintiff_residence',
  'plaintiff_citizenship',
  'defendant_name',
  'defendant_type',
  'defendant_residence',
  'defendant_incorporation_state',
  'defendant_principal_place_of_business',
  'defendant_service_address',
  'incident_date',
  'incident_address',
  'incident_county',
  'incident_state',
  'medical_expenses',
  'lost_wages',
  'property_damage',
  'estimated_amount_in_controversy',
]);

export interface SuggestedFact {
  fact_type: string;
  value: string;
  confidence: number;
  source_quote?: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a legal intake assistant. Your only job is to extract filing-relevant facts from legal document text.

Rules:
- Extract only facts explicitly stated in the document. Do not infer, assume, or invent facts.
- Do not provide legal advice, legal conclusions, or any legal recommendations.
- Do not cite statutes, regulations, case law, or any legal authority.
- Do not suggest causes of action, claim categories, or filing venues.
- If a fact is not clearly present in the text, omit it entirely.
- Return only the supported fact types listed below.
- Include a short source_quote (max 100 chars) showing where you found the fact.
- Confidence: 0.9 = clearly and unambiguously stated; 0.7 = present but with some ambiguity; 0.5 = uncertain.
- If a fact type appears multiple times with conflicting values, return only the most specific or clearly stated value.

Supported fact types:
- plaintiff_name: Full legal name of the plaintiff
- plaintiff_residence: Plaintiff's home address or city/state of residence
- plaintiff_citizenship: Plaintiff's state of citizenship (for diversity analysis — may differ from residence)
- defendant_name: Full legal name of the defendant
- defendant_type: One of: individual, corporation, llc, partnership, government, nonprofit, other
- defendant_residence: Defendant's address (for individual defendants)
- defendant_incorporation_state: State of incorporation for corporate/entity defendants
- defendant_principal_place_of_business: State or city/state of defendant's principal business operations
- defendant_service_address: Address where defendant can be served with process
- incident_date: Date of incident/accident — ISO 8601 (YYYY-MM-DD) if determinable, otherwise as written
- incident_address: Street address or location where the incident occurred
- incident_county: County where the incident occurred
- incident_state: State where the incident occurred
- medical_expenses: Total medical expenses (as written in document, e.g. "$45,000")
- lost_wages: Lost wages or lost income amount (as written in document)
- property_damage: Property damage amount (as written in document)
- estimated_amount_in_controversy: Total estimated damages or claim value

Return ONLY a JSON object in this exact format — no explanation, no preamble, no markdown fences:
{"facts":[{"fact_type":"<type>","value":"<value>","confidence":<0-1>,"source_quote":"<quote>"}]}

If no supported facts are found: {"facts":[]}`;

export async function extractFactsFromText(text: string): Promise<SuggestedFact[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Add it to your .env file to enable AI fact extraction.',
    );
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract filing-relevant facts from this document text:\n\n${text.slice(0, 50_000)}`,
      },
    ],
  });

  const block = message.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response structure from AI provider.');
  }

  // Strip markdown code fences if the model wraps the JSON
  const raw = block.text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`AI response was not valid JSON. Preview: ${raw.slice(0, 300)}`);
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).facts)
  ) {
    throw new Error('AI response did not contain a "facts" array.');
  }

  const validated: SuggestedFact[] = [];
  for (const item of (parsed as { facts: unknown[] }).facts) {
    if (typeof item !== 'object' || item === null) continue;
    const f = item as Record<string, unknown>;

    const fact_type = typeof f.fact_type === 'string' ? f.fact_type.trim() : '';
    const value = typeof f.value === 'string' ? f.value.trim() : '';
    if (!fact_type || !value) continue;
    if (!SUPPORTED_FACT_TYPES.has(fact_type)) continue;

    const confidence =
      typeof f.confidence === 'number' ? Math.min(1, Math.max(0, f.confidence)) : 0.7;
    const source_quote =
      typeof f.source_quote === 'string' ? f.source_quote.trim().slice(0, 200) : undefined;

    validated.push({ fact_type, value, confidence, source_quote });
  }

  return validated;
}
