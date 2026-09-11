const words = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
const FILLER = /\b(?:aligns? closely|provides? a practical basis|(?:this|these) (?:combination|strengths?) equips? me|disciplined approach|uniquely positioned|proven track record)\b/i;

// Editorial advice is independent of evidence validation: it must never
// authorize a claim or force a short, factual letter to grow filler.
export function reviewCoverLetterWriting(paragraphs, length = "standard", { partial = false } = {}) {
  const issues = [];
  const seen = new Map();
  let wordCount = 0;
  for (const paragraph of paragraphs || []) {
    const text = String(paragraph.text || "");
    const count = words(text).length;
    wordCount += count;
    const add = (code, advice) => issues.push({ paragraphId: paragraph.id, code, advice });
    if (count > (paragraph.purpose === "closing" ? 45 : 95)) add("dense_paragraph", "Shorten this paragraph around one example; retain the candidate's contribution level.");
    if (text.split(/(?<=[.!?])\s+/).some((sentence) => words(sentence).length > 45)) add("long_sentence", "Split the long sentence without repeating the same technical inventory.");
    if (FILLER.test(text)) add("generic_bridge", "Replace the generic bridge with a specific connection to the posted work, or omit it.");
    const tokens = words(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ""));
    let repeats = false;
    for (let index = 0; index <= tokens.length - 10; index += 1) {
      const phrase = tokens.slice(index, index + 10).join(" ");
      if (seen.has(phrase) && seen.get(phrase) !== paragraph.id) repeats = true;
      else seen.set(phrase, paragraph.id);
    }
    if (repeats) add("repeated_language", "Use a distinct example or cut the language already used in another paragraph.");
  }
  if (!partial && wordCount > (length === "short" ? 250 : 350)) {
    for (const paragraph of paragraphs || []) issues.push({ paragraphId: paragraph.id, code: "letter_length", advice: `Reduce the full letter toward ${length === "short" ? "180–240" : "250–320"} words; keep the strongest evidence.` });
  }
  return { wordCount, issues, status: issues.length ? "review" : "pass" };
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
