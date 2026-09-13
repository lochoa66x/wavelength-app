// Academic dates do not establish an ongoing activity. Keep completion status
// attached to the particular qualification, shared by API, edit and export.
const qualification = /\b(?:degree|diploma|bachelor|master(?:'s| of)|doctorate|Ph\.?D\.?|B\.?Sc\.?|M\.?Sc\.?|B\.?A\.?|M\.?A\.?)\b/i;
const ongoing = /\b(?:completing|pursuing|studying|enrolled|in progress|expected|candidate for|working toward)\b/i;
const terms = text => String(text).toLowerCase().replace(/[^\p{L}]+/gu, ' ').split(' ').filter(w => w.length > 3 && !/^(?:degree|diploma|bachelor|master|completing|pursuing|studying|progress|expected|university|college|example|have|hold|earned|with|from|currently|education)$/.test(w));
export function academicStatusIssues(proposed, sources = []) {
  const text = String(proposed || '');
  if (!qualification.test(text)) return [];
  const lines = sources.flatMap(s => String(typeof s === 'string' ? s : s?.excerpt || '').split(/\r?\n/)).filter(line => qualification.test(line));
  const words = terms(text);
  const relevant = lines.filter(line => terms(line).some(word => words.includes(word)));
  if (ongoing.test(text) && !relevant.some(line => ongoing.test(line))) return ['Preserve the qualification status: its date alone does not establish that the candidate is completing or pursuing it.'];
  if (/\b(?:graduate|graduated|earned|completed|hold|awarded)\b/i.test(text) && relevant.length
    && relevant.every(line => ongoing.test(line))) return ['An in-progress qualification cannot be presented as completed or awarded.'];
  return [];
}
