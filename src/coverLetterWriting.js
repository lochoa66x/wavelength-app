import { coverLetterLengthPolicy } from "./coverLetterControls.js";
import { editorialSentences, repeatsContribution } from "./resumeSummaryWriting.js";
const words = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
const FILLER = /\b(?:aligns? closely|provides? a practical basis|(?:this|these) (?:combination|strengths?) equips? me|disciplined approach|uniquely positioned|proven track record|(?:this|that) (?:experience|background|involvement) is (?:directly relevant|well suited)|equip(?:s)? me to drive|pair (?:that|this) .*discipline with)\b/i;
const CLICHES = /\b(?:highly motivated|results[- ]driven|valuable asset|exceptional interpersonal skills|excellent communication skills|dynamic professional|extensive experience|stakeholder[- ]facing (?:technical and business )?expertise)\b/i;
const normalizedWords = (value) => words(String(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ""));

export function reviewEditorialText(text) {
  const issues = [];
  if (/\b(?:this|that) (?:work|experience|background) (?:addresses|matches|meets|supports)\b[^.!?]{0,160}\b(?:your posting|job description|this position)\b/i.test(text)
    || /\bI would bring (?:that|this)\b[^.!?]{0,160}\b(?:work described|responsibilit(?:y|ies) (?:in|for)|listed in your)\b/i.test(text)
    || /\b(?:supporting|matching)\b[^.!?]{0,130}\b(?:work described in the posting|the role[’']s [^.!?]{0,65}responsibilities)\b/i.test(text)) {
    issues.push({ code: "posting_echo", advice: "Remove the sentence explaining that your experience matches the posting. Let the specific example demonstrate the connection, or add a distinct source-supported detail." });
  }
  if (/\b(?:this|that|these) (?:work|experience|responsibilities) (?:speaks? directly to|reflects?)\b[^.!?]{0,180}\b(?:your need|your posting|the role|work listed)\b/i.test(text)) issues.push({ code: "posting_echo", advice: "Cut the sentence announcing a match and retain the specific contribution. Add a distinct supported detail only when useful." });
  if (FILLER.test(text)) issues.push({ code: "generic_bridge", advice: "Cut the generic claim of relevance, or replace it with a specific connection supported by the example." });
  if (CLICHES.test(text)) issues.push({ code: "empty_self_description", advice: "Replace broad self-description with a specific responsibility, example, or supported result; otherwise omit it." });
  if (String(text).split(/(?<=[.!?])\s+/).some((sentence) => words(sentence).length > 40)) issues.push({ code: "long_sentence", advice: "Split the long sentence around its principal contribution; retain the source's scope and qualifications." });
  if (words(text).length > 35 && (String(text).match(/[,;|]/g) || []).length >= 7) issues.push({ code: "technical_inventory", advice: "Select the few tools or delivery activities that explain this example instead of listing the full inventory." });
  return issues;
}

// Editorial advice is independent of evidence validation: it must never
// authorize a claim or force a short, factual letter to grow filler.
export function reviewCoverLetterWriting(paragraphs, length = "standard", { partial = false, existingDraft } = {}) {
  const issues = [];
  const seen = new Map();
  const sentencesSeen = new Set();
  const policy = coverLetterLengthPolicy(length, existingDraft);
  let wordCount = 0;
  for (const paragraph of paragraphs || []) {
    const text = String(paragraph.text || "");
    const count = words(text).length;
    wordCount += count;
    const add = (code, advice) => { if (!issues.some((issue) => issue.paragraphId === paragraph.id && issue.code === code)) issues.push({ paragraphId: paragraph.id, code, advice }); };
    if (editorialSentences(text).slice(1).some((sentence) => /^(?:my|this|that) work (?:cent(?:er|re)s on|focuses on|involves|consists of)\b/i.test(sentence.trim()))) {
      add("restated_work_description", "The example is followed by a generic description of the same work. Remove that restatement; keep a second sentence only for a distinct source-supported scope, constraint or outcome.");
    }
    if (paragraph.purpose === "opening" && /^(?:I(?: am|['’]m) (?:applying|writing)|I would like to apply|Please accept (?:my|this) application)\b/i.test(text.trim())) {
      add("formulaic_opening", "Start with a relevant contribution, work setting or professional focus already supported by the cited evidence. The subject line identifies the application. Do not substitute enthusiasm, a stock hook or a list of every example in the body.");
    }
    if (paragraph.purpose === "opening") {
      const otherParagraphs = partial && existingDraft?.paragraphs ? existingDraft.paragraphs.filter((entry) => entry.id !== paragraph.id) : (paragraphs || []).filter((entry) => entry.id !== paragraph.id);
      const repeats = otherParagraphs.filter((entry) => entry.purpose === "evidence" && editorialSentences(entry.text).some((sentence) => repeatsContribution(text, sentence)));
      if (repeats.length) {
        add("opening_repeats_evidence", "Keep the strongest example in the opening and use different supported detail later, or make the opening a brief statement of professional context. Do not preview and then retell the same work with synonyms.");
        if (!partial) for (const entry of repeats) issues.push({ paragraphId: entry.id, code: "opening_repeats_evidence", advice: "This paragraph repeats the opening example. Keep its facts once and use another supported contribution only if one is available; do not invent variety." });
      }
    }
    if (partial && paragraph.purpose === "evidence" && existingDraft?.paragraphs?.some((entry) => entry.purpose === "opening" && editorialSentences(text).some((sentence) => repeatsContribution(entry.text, sentence)))) {
      add("opening_repeats_evidence", "This paragraph repeats the existing opening. Use distinct supported detail and preserve the untouched opening; do not invent a new example.");
    }
    if (count > (paragraph.purpose === "closing" ? 45 : 95)) add("dense_paragraph", "Shorten this paragraph around one example; retain the candidate's contribution level.");
    for (const issue of reviewEditorialText(text)) add(issue.code, issue.advice);
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const descriptor = /^(?:[\p{L}-]+\s+){1,7}(?:with (?:experience|expertise|knowledge)|responsible for|specializing in|skilled in)\b/u.test(sentence.trim());
      if (descriptor && !/\b(?:I|we|is|are|was|were|has|have|brings?|leads?|works?|supports?)\b/i.test(sentence)) add("sentence_fragment", "Rewrite this résumé-style fragment as a complete first-person sentence about a supported contribution.");
      const tokens = normalizedWords(sentence);
      if (tokens.length < 5) continue;
      const normalized = tokens.join(" ");
      if (sentencesSeen.has(normalized)) add("repeated_sentence", "Remove the repeated sentence; each sentence should add information, including within the same paragraph.");
      sentencesSeen.add(normalized);
    }
    const tokens = normalizedWords(text);
    let repeats = false;
    for (let index = 0; index <= tokens.length - 10; index += 1) {
      const phrase = tokens.slice(index, index + 10).join(" ");
      const previous = seen.get(phrase);
      if (previous && (previous.id !== paragraph.id || index - previous.index >= 10)) repeats = true;
      else if (!previous) seen.set(phrase, { id: paragraph.id, index });
    }
    if (repeats) add("repeated_language", "Use a distinct example or cut substantial phrasing already used in this letter.");
  }
  if (!partial && wordCount > policy.maxWords) {
    for (const paragraph of paragraphs || []) issues.push({ paragraphId: paragraph.id, code: "letter_length", advice: `Reduce the full letter to ${policy.maxWords} words or fewer; retain its strongest supported example and remove repeated detail.` });
  }
  if (!partial && (paragraphs || []).length > policy.maxParagraphs) {
    for (const paragraph of paragraphs || []) issues.push({ paragraphId: paragraph.id, code: "letter_structure", advice: `Use at most ${policy.maxParagraphs} paragraphs${length === "short" ? " with one principal evidence example" : " with distinct examples"}; omit a redundant paragraph rather than compressing every detail.` });
  }
  return { wordCount, issues, status: issues.length ? "review" : "pass", note: "Mechanical writing checks provide suggestions, not a guarantee of persuasive writing or factual accuracy." };
}

export function mergeCoverLetterParagraphRepair(original, replacement, paragraphIds) {
  const expected = new Set(paragraphIds);
  const patches = replacement?.paragraphs;
  if (!Array.isArray(patches) || patches.length !== expected.size || new Set(patches.map((p) => p?.id)).size !== expected.size) return null;
  if (patches.some((p) => !expected.has(p?.id))) return null;
  const byId = new Map(patches.map((p) => [p.id, p]));
  if ([...expected].some((id) => !original.paragraphs.some((p) => p.id === id))) return null;
  return { ...original, paragraphs: original.paragraphs.map((paragraph) => {
    const patch = byId.get(paragraph.id);
    return patch ? { ...patch, purpose: paragraph.purpose } : paragraph;
  }) };
}
