export const COVER_LETTER_VOICES = Object.freeze([
  { id: "direct", label: "Direct", description: "Plain, concise, and practical.", instruction: "Use plain, economical sentences. State the contribution directly and omit ceremonial transitions." },
  { id: "warm", label: "Warm", description: "Conversational and approachable.", instruction: "Use natural first-person phrasing and an approachable conversational rhythm. A simple thank-you is enough; do not invent enthusiasm, personal motivation, admiration, or a relationship with the employer." },
  { id: "confident", label: "Confident", description: "Assured, with concrete evidence.", instruction: "Lead with the strongest supported contribution and a concrete example. Use assured, restrained phrasing without superlatives, promises, or stronger ownership than the source establishes." },
]);
export const COVER_LETTER_LENGTHS = Object.freeze([
  { id: "short", label: "Short", description: "One focused example; up to 180 words.", maxWords: 180, maxParagraphs: 3 },
  { id: "standard", label: "Standard", description: "Room for two distinct examples; up to 320 words.", maxWords: 320, maxParagraphs: 4 },
]);
export const countCoverLetterWords = (paragraphs) => (Array.isArray(paragraphs) ? paragraphs : []).reduce((count, paragraph) => count + String(paragraph?.text || "").trim().split(/\s+/).filter(Boolean).length, 0);

export function coverLetterLengthPolicy(length, existingDraft) {
  const policy = COVER_LETTER_LENGTHS.find((entry) => entry.id === length) || COVER_LETTER_LENGTHS[1];
  const previousWords = countCoverLetterWords(existingDraft?.paragraphs);
  const shortening = policy.id === "short" && existingDraft?.length !== "short" && previousWords > 180;
  return { ...policy, previousWords: shortening ? previousWords : 0, maxWords: shortening ? Math.min(policy.maxWords, Math.floor(previousWords * 0.75)) : policy.maxWords };
}

export function coverLetterGenerationSettings({ plan, voice = "direct", length = "standard", paragraphId = "" }) {
  const selectedVoice = paragraphId ? plan?.voice || voice : voice;
  const selectedLength = paragraphId ? plan?.length || length : length;
  return {
    voice: COVER_LETTER_VOICES.some((entry) => entry.id === selectedVoice) ? selectedVoice : "direct",
    length: COVER_LETTER_LENGTHS.some((entry) => entry.id === selectedLength) ? selectedLength : "standard",
  };
}

export function coverLetterControlInstructions({ voice, length, existingDraft, paragraphId = "" }) {
  const policy = coverLetterLengthPolicy(length, existingDraft);
  const voiceRule = (COVER_LETTER_VOICES.find((entry) => entry.id === voice) || COVER_LETTER_VOICES[0]).instruction;
  const structure = paragraphId
    ? `Regenerate exactly one paragraph with id "${paragraphId}". Preserve its purpose from EXISTING DRAFT and return only that paragraph. Preserve the current letter's voice and length. Do not retell examples already covered by the other paragraphs.`
    : policy.id === "short"
      ? "Return two or three compact paragraphs. The opening may itself contain the ONE principal evidence example. Add an evidence paragraph only for distinct supporting detail, then a brief closing. Do not force a separate introduction that repeats the example."
      : "Return two to four paragraphs. Start with a relevant supported contribution or specific professional context, add one or two DISTINCT supporting examples only when available, then close briefly. The opening can be the first evidence example; do not preview a list of the body’s examples.";
  return `Voice: ${voice}. ${voiceRule}\nLength: ${policy.id}. ${policy.description} Maximum ${policy.maxWords} words for a full letter.\n${structure}\n${policy.previousWords && !paragraphId ? `The previous letter has ${policy.previousWords} words. Compress it by at least 25% toward the stated maximum, keeping its strongest example and cutting repeated detail. This is an editorial goal, never permission to change facts.\n` : ""}Write complete first-person sentences. Do not paste a résumé summary fragment after the opening. Lead with a concrete supported contribution. Use the posting to select relevant examples; do not append a sentence explaining that each example matches a listed responsibility. Avoid repeating the résumé inventory; preserve employer, supervision, credential status, and team attribution. There is no minimum word count. Sparse evidence should produce a brief letter, never padding. An already concise draft does not need invented detail or gratuitous rewriting.`;
}
