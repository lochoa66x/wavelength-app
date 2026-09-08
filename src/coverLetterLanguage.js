const SELF_DISQUALIFYING_PATTERNS = Object.freeze([
  /\bcareer[ -](?:change|transition)\b/i,
  /\btransition(?:al|ing)?\s+(?:into|to)\b/i,
  /\bnew\s+(?:career|path|journey)\b/i,
  /\b(?:material|significant|major|critical)\s+(?:gap|limitation|shortcoming)\b/i,
  /\bmy\s+(?:gap|limitation|shortcoming)\b/i,
  /\b(?:my\s+)?(?:r[eé]sum[eé]|resume)\s+(?:does\s+not|doesn't|did\s+not|didn't)\s+(?:include|show|demonstrate|contain)\b/i,
  /\bI\s+(?:do\s+not|don't|did\s+not|didn't|cannot|can't|lack)\b[^.]{0,140}\b(?:experience|expertise|knowledge|skill|qualification|background|exposure)\b/i,
  /\b(?:no|without)\s+(?:direct|prior|verified|specific|hands-on|relevant)?\s*(?:experience|expertise|knowledge|skill|qualification|background|exposure)\b/i,
  /\b(?:not|never)\s+(?:worked|configured|implemented|delivered|led|performed|supported|completed|used)\b/i,
  /\b(?:not\s+in|outside)\s+(?:the\s+|a\s+|an\s+)?[^.]{0,90}\bcontext\b/i,
  /\b(?:though|although|while)\b[^.]{0,160}\b(?:rather\s+than|not|without|lack(?:ing|s)?)\b/i,
  /\brather\s+than\s+(?:in|within|for|with|having)\b/i,
  /\b(?:ramp|come)\s+(?:up\s+)?(?:on|in|to)\s+(?:a\s+)?new\b/i,
  /\bif\b[^.]{0,180}\b(?:open\s+to|willing\s+to\s+consider|firm\s+prerequisite|strict\s+prerequisite|non[- ]negotiable)\b/i,
  /\bif\b[^.]{0,180}\b(?:prerequisite|requirement|must-have)\b[^.]{0,80}\bI\s+understand\b/i,
]);

export function containsSelfDisqualifyingCoverLetterLanguage(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  return SELF_DISQUALIFYING_PATTERNS.some((pattern) => pattern.test(value));
}
