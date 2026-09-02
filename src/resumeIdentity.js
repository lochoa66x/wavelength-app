const PLACEHOLDER_NAME = /^(?:resume|résumé|curriculum vitae|cv|candidate|unknown|name|n\/?a)$/i;
const HEADING = /^(?:professional|career|employment|work|education|skills?|summary|profile|experience|qualifications?|certifications?|languages?|contact)(?:\s+(?:summary|profile|experience|history|skills|information))?$/i;

function cleanLine(value, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function plausibleName(value) {
  const line = cleanLine(value, 140).replace(/^(?:name|candidate)\s*:\s*/i, "");
  const words = line.split(/\s+/).filter(Boolean);
  return words.length >= 2
    && words.length <= 7
    && !PLACEHOLDER_NAME.test(line)
    && !HEADING.test(line)
    && !/[@|•·]|\d|https?:|www\.|linkedin/i.test(line)
    && words.every((word) => /^[\p{L}'’.\-]+$/u.test(word));
}

export function resumeIdentityFromText(value) {
  const lines = String(value || "").split(/\r?\n/).map((line) => cleanLine(line)).filter(Boolean);
  const labelledName = lines.find((line) => /^(?:name|candidate)\s*:/i.test(line) && plausibleName(line));
  const fullName = cleanLine((labelledName || (plausibleName(lines[0]) ? lines[0] : "")).replace(/^(?:name|candidate)\s*:\s*/i, ""), 140);
  const contactLines = lines.slice(0, 14).filter((line) => (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line)
    || /(?:\+?\d[\d\s().-]{7,}\d)/.test(line)
    || /(?:linkedin\.com|https?:\/\/|www\.)/i.test(line)
  ));
  return {
    name: fullName,
    contact: [...new Set(contactLines)].join(" · ").slice(0, 1_000),
  };
}
