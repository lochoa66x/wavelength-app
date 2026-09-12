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

// Only explicitly identified candidate links; never collect arbitrary employer
// or project URLs from the surrounding employment narrative.
export function resumeProfessionalLinks(value) {
  const links = [];
  for (const line of String(value || "").split(/\r?\n/)) {
    const labelled = line.trim().match(/^(portfolio|work[- ]samples?|professional website|personal website|linkedin)\s*:\s*(https?:\/\/\S+)\s*$/i);
    if (!labelled) continue;
    const url = labelled[2].replace(/[.,;]+$/, "");
    try {
      const parsed = new URL(url);
      if (!parsed.hostname || parsed.username || parsed.password || !['https:', 'http:'].includes(parsed.protocol)) continue;
      if (!links.some((entry) => entry.url === url)) links.push({ label: labelled[1], url });
    } catch { /* Malformed source links are not exported as clickable URLs. */ }
  }
  return links;
}

export function resumeIdentityFromText(value) {
  const lines = String(value || "").split(/\r?\n/).map((line) => cleanLine(line)).filter(Boolean);
  const labelledName = lines.find((line) => /^(?:name|candidate)\s*:/i.test(line) && plausibleName(line));
  const firstLine = lines[0] || "";
  const [headerName, headerTitle] = firstLine.split(/\s+[–—|\-]\s+/, 2);
  const roleWords = /\b(?:architect|consultant|designer|manager|engineer|developer|analyst|director|technician|specialist|coordinator|officer)\b/i;
  const nameWithTitle = headerTitle && roleWords.test(headerTitle) && !roleWords.test(headerName) && plausibleName(headerName) ? headerName : "";
  const fullName = cleanLine((labelledName || nameWithTitle || (plausibleName(firstLine) ? firstLine : "")).replace(/^(?:name|candidate)\s*:\s*/i, ""), 140);
  const sectionStart = lines.findIndex((line, index) => index > 0 && HEADING.test(line));
  const contactLines = lines.slice(0, sectionStart < 0 ? 14 : Math.min(sectionStart, 14)).filter((line) => (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line)
    || (/^(?:(?:phone|tel|telephone|mobile|cell)\s*:\s*)?\+?\d[\d\s().-]{7,}\d$/i.test(line) && !/^(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}$/.test(line))
    || /(?:linkedin\.com|https?:\/\/|www\.)/i.test(line)
  ));
  return {
    name: fullName,
    contact: [...new Set([...contactLines, ...resumeProfessionalLinks(value).map((entry) => entry.url)])].join(" · ").slice(0, 1_000),
  };
}
