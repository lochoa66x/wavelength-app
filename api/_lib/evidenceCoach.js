import { createHash } from "node:crypto";

export const EVIDENCE_COACH_TOOL = {
  name: "return_candidate_evidence_clarification",
  description: "Return a candidate-controlled evidence proposal grounded only in the candidate fields supplied for this request.",
  input_schema: {
    type: "object",
    properties: {
      proposed_wording: { type: "string" },
      facts_used: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source_field: {
              type: "string",
              enum: ["answer", "context", "employer_or_project", "approximate_date", "contribution_level", "follow_up_answer"],
            },
            source_excerpt: { type: "string" },
          },
          required: ["source_field", "source_excerpt"],
        },
      },
      unresolved_details: { type: "array", items: { type: "string" } },
      follow_up_question: { type: "string" },
      contribution_level: { type: "string", enum: ["supported", "contributed", "owned", "led"] },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      disposition: { type: "string", enum: ["reviewable", "follow_up"] },
    },
    required: ["proposed_wording", "facts_used", "unresolved_details", "follow_up_question", "contribution_level", "confidence", "disposition"],
  },
};

const SOURCE_LIMITS = {
  answer: 1_200,
  context: 500,
  employer_or_project: 180,
  approximate_date: 80,
  contribution_level: 20,
  follow_up_answer: 800,
};
const CONTRIBUTION_LEVELS = ["supported", "contributed", "owned", "led"];
const CONTRIBUTION_RANK = new Map(CONTRIBUTION_LEVELS.map((level, index) => [level, index]));
const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const DISPOSITIONS = new Set(["reviewable", "follow_up"]);
const SENSITIVE_CLAIMS = [
  { label: "credential or licence", pattern: /\b(?:certified|certification|credential(?:ed)?|licensed|licence|license|registered|red seal|journeyperson|journeyman|degree|diploma)\b/gi },
  { label: "regulated clinical action", pattern: /\b(?:diagnos(?:e|ed|ing|is)|prescrib(?:e|ed|ing)|administer(?:ed|ing)? medication|treated patients?)\b/gi },
  { label: "employment authority", pattern: /\b(?:managed|supervised|directed|department head|people manager)\b/gi },
];

export function cleanEvidenceCoachText(value, maxLength = 1_200) {
  return typeof value === "string"
    ? value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength)
    : "";
}

function normalized(value) {
  return cleanEvidenceCoachText(value, 20_000)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-");
}

export function normalizeEvidenceCoachInput(raw = {}) {
  const candidateInput = raw?.candidate_input && typeof raw.candidate_input === "object"
    ? raw.candidate_input
    : {};
  const input = Object.fromEntries(Object.entries(SOURCE_LIMITS).map(([field, limit]) => [
    field,
    field === "contribution_level"
      ? (CONTRIBUTION_RANK.has(candidateInput[field]) ? candidateInput[field] : "supported")
      : cleanEvidenceCoachText(candidateInput[field], limit),
  ]));
  return {
    requirement: {
      id: cleanEvidenceCoachText(raw?.requirement?.id, 40),
      text: cleanEvidenceCoachText(raw?.requirement?.text, 1_500),
      question: cleanEvidenceCoachText(raw?.requirement?.question, 1_000),
    },
    candidate_input: input,
  };
}

export function validateEvidenceCoachInput(raw) {
  const value = normalizeEvidenceCoachInput(raw);
  const errors = [];
  if (!value.requirement.id) errors.push("The evidence question is missing its requirement reference.");
  if (!value.requirement.text || !value.requirement.question) errors.push("The evidence question is incomplete.");
  if (value.candidate_input.answer.length < 3) errors.push("Add a factual sentence in your own words before asking for clarification.");
  return { value, errors };
}

function exactExcerptIn(excerpt, source) {
  const needle = normalized(excerpt);
  return needle.length >= 2 && normalized(source).includes(needle);
}

function numbers(value) {
  return normalized(value).match(/\b\d[\d,.%+/-]*\b/g) || [];
}

function highestContributionIn(value) {
  const text = normalized(value);
  if (/\b(?:led|directed|supervised|managed|headed)\b/.test(text)) return "led";
  if (/\b(?:owned|accountable for)\b/.test(text)) return "owned";
  if (/\b(?:contributed|coordinated|collaborated)\b/.test(text)) return "contributed";
  return "supported";
}

function unsupportedSensitiveClaims(proposal, candidateCorpus) {
  const issues = [];
  for (const claim of SENSITIVE_CLAIMS) {
    const matches = [...String(proposal || "").matchAll(claim.pattern)].map((match) => match[0]);
    for (const match of matches) {
      if (!exactExcerptIn(match, candidateCorpus)) issues.push(`${claim.label} is not present in the candidate's source words`);
    }
  }
  const acronyms = String(proposal || "").match(/\b[A-Z][A-Z0-9+./-]{1,14}\b/g) || [];
  for (const acronym of acronyms) {
    if (acronym === "I") continue;
    if (!exactExcerptIn(acronym, candidateCorpus)) issues.push(`technical or named term “${acronym}” is not present in the candidate's source words`);
  }
  return [...new Set(issues)];
}

export function validateEvidenceCoachProposal(raw, input) {
  const source = normalizeEvidenceCoachInput(input);
  const candidateInput = source.candidate_input;
  const candidateCorpus = Object.values(candidateInput).join("\n");
  const proposedWording = cleanEvidenceCoachText(raw?.proposed_wording, 1_600);
  const disposition = DISPOSITIONS.has(raw?.disposition) ? raw.disposition : "follow_up";
  const contributionLevel = CONTRIBUTION_RANK.has(raw?.contribution_level)
    ? raw.contribution_level
    : candidateInput.contribution_level;
  const confidence = CONFIDENCE_LEVELS.has(raw?.confidence) ? raw.confidence : "low";
  const followUpQuestion = cleanEvidenceCoachText(raw?.follow_up_question, 600);
  const unresolvedDetails = Array.isArray(raw?.unresolved_details)
    ? raw.unresolved_details.slice(0, 8).map((entry) => cleanEvidenceCoachText(entry, 240)).filter(Boolean)
    : [];
  const factsUsed = Array.isArray(raw?.facts_used)
    ? raw.facts_used.slice(0, 10).map((fact) => ({
      source_field: Object.hasOwn(SOURCE_LIMITS, fact?.source_field) ? fact.source_field : "",
      source_excerpt: cleanEvidenceCoachText(fact?.source_excerpt, 500),
    })).filter((fact) => fact.source_field && fact.source_excerpt)
    : [];
  const issues = [];

  for (const fact of factsUsed) {
    if (!exactExcerptIn(fact.source_excerpt, candidateInput[fact.source_field])) {
      issues.push(`A cited ${fact.source_field} fact is not an exact supplied excerpt.`);
    }
  }
  const sourceRank = CONTRIBUTION_RANK.get(candidateInput.contribution_level) || 0;
  if ((CONTRIBUTION_RANK.get(contributionLevel) || 0) > sourceRank) issues.push("The proposal elevated the candidate's selected contribution level.");
  if ((CONTRIBUTION_RANK.get(highestContributionIn(proposedWording)) || 0) > sourceRank) issues.push("The proposed wording implies a higher contribution level than the candidate selected.");
  for (const token of numbers(proposedWording)) {
    if (!normalized(candidateCorpus).includes(token)) issues.push(`Numeric claim “${token}” was not supplied by the candidate.`);
  }
  issues.push(...unsupportedSensitiveClaims(proposedWording, candidateCorpus));

  if (disposition === "reviewable") {
    if (proposedWording.length < 12) issues.push("A reviewable proposal needs complete wording.");
    if (!factsUsed.length) issues.push("A reviewable proposal needs exact candidate fact citations.");
    if (unresolvedDetails.length || followUpQuestion) issues.push("A proposal with unresolved details must ask a follow-up instead of being reviewable.");
  } else {
    if (proposedWording) issues.push("Follow-up responses cannot include candidate-ready proposed wording.");
    if (!followUpQuestion) issues.push("A follow-up response needs one specific candidate-facing question.");
  }

  const proposal = {
    proposed_wording: disposition === "reviewable" ? proposedWording : "",
    facts_used: factsUsed,
    unresolved_details: unresolvedDetails,
    follow_up_question: disposition === "follow_up" ? followUpQuestion : "",
    contribution_level: contributionLevel,
    confidence,
    disposition,
  };
  proposal.evidence_hash = createHash("sha256")
    .update(JSON.stringify({ requirement_id: source.requirement.id, candidate_input: candidateInput, proposal }))
    .digest("hex");

  return { proposal, issues: [...new Set(issues)] };
}
