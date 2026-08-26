const OCCUPATION_PROFILES = Object.freeze({
  sap_functional: {
    patterns: /\b(sap|erp|s\/4hana|s4hana|fi-ca|pscd|functional consultant|business analyst)\b/i,
    verbs: ["configured", "implemented", "integrated", "validated", "documented", "facilitated", "supported", "coordinated", "led", "delivered", "designed", "tested"],
  },
  software: {
    patterns: /\b(software|developer|engineer|programmer|frontend|backend|full[ -]?stack|devops|java|python|c\+\+)\b/i,
    verbs: ["built", "developed", "implemented", "deployed", "optimized", "debugged", "automated", "integrated", "tested", "reviewed", "maintained", "designed"],
  },
  leadership: {
    patterns: /\b(manager|director|lead|head|executive|supervisor|program|project manager)\b/i,
    verbs: ["led", "directed", "managed", "delivered", "coordinated", "mentored", "established", "negotiated", "planned", "oversaw", "resolved", "aligned"],
  },
  trades: {
    patterns: /\b(plumb|electric|carpenter|mechanic|technician|handyman|landscap|construction|trades?)\b/i,
    verbs: ["installed", "repaired", "maintained", "inspected", "operated", "troubleshot", "assembled", "measured", "fabricated", "supported", "completed", "documented"],
  },
  admin: {
    patterns: /\b(admin|assistant|office|clerical|data entry|coordinator|reception)\b/i,
    verbs: ["coordinated", "organized", "scheduled", "processed", "maintained", "prepared", "documented", "supported", "resolved", "tracked", "administered", "communicated"],
  },
  marketing: {
    patterns: /\b(marketing|growth|campaign|brand|social media|content strategist|communications)\b/i,
    verbs: ["launched", "developed", "managed", "analyzed", "optimized", "produced", "positioned", "grew", "coordinated", "measured", "created", "delivered"],
  },
  creative: {
    patterns: /\b(design|designer|creative|illustrat|artist|copywriter|photograph|video|ux|ui)\b/i,
    verbs: ["designed", "created", "produced", "developed", "conceptualized", "illustrated", "edited", "delivered", "collaborated", "presented", "refined", "directed"],
  },
  general: {
    patterns: /.*/,
    verbs: ["delivered", "implemented", "coordinated", "supported", "developed", "improved", "resolved", "organized", "designed", "managed", "led", "completed"],
  },
});

const VERB_FORMS = Object.freeze({
  achieve: "achieved", administer: "administered", align: "aligned", analyze: "analyzed", apply: "applied",
  architect: "architected", assemble: "assembled", author: "authored", automate: "automated",
  build: "built", collaborate: "collaborated", complete: "completed", configure: "configured",
  contribute: "contributed", coordinate: "coordinated", create: "created", debug: "debugged",
  define: "defined", deliver: "delivered", deploy: "deployed", design: "designed", develop: "developed",
  direct: "directed", document: "documented", drive: "drove", edit: "edited",
  establish: "established", execute: "executed", facilitate: "facilitated", fabricate: "fabricated",
  grow: "grew", implement: "implemented", improve: "improved", increase: "increased",
  inspect: "inspected", install: "installed", integrate: "integrated", launch: "launched",
  lead: "led", maintain: "maintained", manage: "managed", measure: "measured",
  mentor: "mentored", migrate: "migrated", negotiate: "negotiated", operate: "operated",
  optimize: "optimized", organize: "organized", oversee: "oversaw", perform: "performed",
  plan: "planned", position: "positioned", prepare: "prepared", present: "presented",
  process: "processed", produce: "produced", reduce: "reduced", refine: "refined",
  repair: "repaired", resolve: "resolved", review: "reviewed", run: "ran", scale: "scaled",
  schedule: "scheduled", spearhead: "spearheaded", streamline: "streamlined", support: "supported",
  supervise: "supervised", test: "tested", track: "tracked", transform: "transformed",
  troubleshoot: "troubleshot", validate: "validated", win: "won",
});

const PAST_TO_PRESENT = new Map(Object.entries(VERB_FORMS).map(([present, past]) => [past, present]));
const RECOGNIZED_VERBS = new Set([...Object.keys(VERB_FORMS), ...Object.values(VERB_FORMS)]);
const CONTRIBUTION_RANK = Object.freeze({ supported: 1, contributed: 2, owned: 3, led: 4 });
const VERB_RANK = Object.freeze({
  support: 1, supported: 1, assist: 1, assisted: 1, advise: 1, advised: 1,
  contribute: 2, contributed: 2, coordinate: 2, coordinated: 2, collaborate: 2, collaborated: 2,
  own: 3, owned: 3, deliver: 3, delivered: 3, implement: 3, implemented: 3,
  lead: 4, led: 4, direct: 4, directed: 4, spearhead: 4, spearheaded: 4,
});

const WEAK_REWRITES = [
  { pattern: /^was responsible for\s+/i, past: "Managed ", present: "Manage ", kind: "weak_opener" },
  { pattern: /^responsible for\s+/i, past: "Managed ", present: "Manage ", kind: "weak_opener" },
  { pattern: /^helped with\s+/i, past: "Supported ", present: "Support ", kind: "weak_opener" },
  { pattern: /^worked on\s+/i, past: "Contributed to ", present: "Contribute to ", kind: "weak_opener" },
  { pattern: /^assisted in\s+/i, past: "Assisted with ", present: "Assist with ", kind: "weak_opener" },
  { pattern: /^participated in\s+/i, past: "Contributed to ", present: "Contribute to ", kind: "imprecise_verb" },
  { pattern: /^involved in\s+/i, past: "Contributed to ", present: "Contribute to ", kind: "weak_opener" },
  { pattern: /^duties included\s+/i, past: "Completed ", present: "Complete ", kind: "weak_opener" },
  { pattern: /^tasked with\s+/i, past: "Completed ", present: "Complete ", kind: "weak_opener" },
];

function normalized(value) {
  return String(value || "").normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9+#.%]+/g, " ").trim();
}
function tokens(value) {
  return new Set(normalized(value).split(" ").filter((token) => token.length > 3));
}

function firstWord(value) {
  return String(value || "").trim().toLowerCase().match(/^[a-z]+/)?.[0] || "";
}

function isCurrent(value) {
  return /\b(present|current|now|ongoing)\b/i.test(String(value || ""));
}

function stableId(...parts) {
  const source = parts.join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `writing-${(hash >>> 0).toString(36)}`;
}

function bestResumeCitation(bullet, baseResume) {
  const bulletTokens = tokens(bullet);
  const lines = String(baseResume || "").split(/\r?\n/).map((line, index) => ({ line: line.trim(), index }));
  let best = null;
  for (const candidate of lines) {
    if (!candidate.line) continue;
    const candidateTokens = tokens(candidate.line);
    const overlap = [...bulletTokens].filter((token) => candidateTokens.has(token)).length;
    const score = overlap / Math.max(1, Math.min(bulletTokens.size, candidateTokens.size));
    if (!best || score > best.score) best = { ...candidate, score };
  }
  if (!best || best.score < 0.25) return [];
  return [{ source: "base_resume", section: "experience", line_index: best.index + 1, excerpt: best.line }];
}

function matchingCandidateCitation(bullet, analysis) {
  const bulletText = normalized(bullet);
  let best = null;
  for (const requirement of analysis?.requirements || []) {
    for (const citation of requirement.evidence || []) {
      if (citation.source !== "candidate_note") continue;
      const evidenceTokens = tokens(citation.excerpt);
      const overlap = [...evidenceTokens].filter((token) => bulletText.includes(token)).length;
      const score = overlap / Math.max(1, evidenceTokens.size);
      if (!best || score > best.score) best = { citation, score };
    }
  }
  return best?.score >= 0.35 ? best.citation : null;
}

export function inferOccupationProfile({ targetTitle, resumeTitle, requirements, category } = {}) {
  const context = [targetTitle, resumeTitle, category, ...(requirements || []).map((item) => item?.requirement)].filter(Boolean).join(" ");
  return Object.entries(OCCUPATION_PROFILES).find(([name, profile]) => name !== "general" && profile.patterns.test(context))?.[0] || "general";
}

function detectTense(opening) {
  if (PAST_TO_PRESENT.has(opening)) return "past";
  if (Object.hasOwn(VERB_FORMS, opening)) return "present";
  return "unknown";
}

function revisionForTense(bullet, opening, expected) {
  const replacement = expected === "past" ? VERB_FORMS[opening] : PAST_TO_PRESENT.get(opening);
  if (!replacement) return "";
  return `${replacement[0].toUpperCase()}${replacement.slice(1)}${String(bullet).trim().slice(opening.length)}`;
}

function issueRecord({ type, severity = "review", experience, experienceIndex, bullet, bulletIndex, explanation, suggestion, citations, profile }) {
  return {
    id: stableId(type, experienceIndex, bulletIndex, bullet),
    section: "experience",
    role: experience?.role || "",
    experience_index: experienceIndex,
    bullet_index: bulletIndex,
    original: String(bullet || "").trim(),
    issue_type: type,
    explanation,
    suggested_revision: suggestion || "",
    evidence_citations: citations || [],
    severity,
    occupation_profile: profile,
  };
}

export function buildWritingReview(resumeData, baseResume, options = {}) {
  const profile = inferOccupationProfile({
    targetTitle: options.targetTitle,
    resumeTitle: resumeData?.title,
    requirements: options.analysis?.requirements,
    category: options.category,
  });
  const preferredVerbs = OCCUPATION_PROFILES[profile].verbs;
  const issues = [];

  for (const [experienceIndex, experience] of (resumeData?.experience || []).entries()) {
    const currentRole = isCurrent(experience?.dates);
    for (const [bulletIndex, rawBullet] of (experience?.bullets || []).entries()) {
      const bullet = String(rawBullet || "").trim();
      if (!bullet) continue;
      const opening = firstWord(bullet);
      const citations = bestResumeCitation(bullet, baseResume);
      const candidateCitation = matchingCandidateCitation(bullet, options.analysis);
      if (candidateCitation) citations.unshift(candidateCitation);

      const weak = WEAK_REWRITES.find(({ pattern }) => pattern.test(bullet));
      if (weak) {
        const suggestion = bullet.replace(weak.pattern, currentRole ? weak.present : weak.past);
        issues.push(issueRecord({
          type: weak.kind,
          experience, experienceIndex, bullet, bulletIndex, citations, profile,
          explanation: weak.kind === "imprecise_verb"
            ? "The opener is truthful but vague. Name the candidate's actual level of contribution without implying ownership."
            : "The bullet begins with passive or generic wording instead of a specific contribution.",
          suggestion,
        }));
      } else if (!RECOGNIZED_VERBS.has(opening)) {
        issues.push(issueRecord({
          type: "unrecognized_opener",
          experience, experienceIndex, bullet, bulletIndex, citations, profile,
          explanation: `The opener “${opening || "(missing)"}” is not recognized as an action verb for this review. Consider a precise verb such as ${preferredVerbs.slice(0, 4).join(", ")}.`,
          suggestion: "",
        }));
      }

      const tense = detectTense(opening);
      if (!currentRole && tense === "present") {
        issues.push(issueRecord({
          type: "tense",
          experience, experienceIndex, bullet, bulletIndex, citations, profile,
          explanation: "A completed role should normally use past tense.",
          suggestion: revisionForTense(bullet, opening, "past"),
        }));
      } else if (currentRole && tense === "past" && /\b(currently|ongoing|daily|weekly|regularly|each month)\b/i.test(bullet)) {
        issues.push(issueRecord({
          type: "tense",
          experience, experienceIndex, bullet, bulletIndex, citations, profile,
          explanation: "This describes ongoing work in a current role, so present tense is clearer.",
          suggestion: revisionForTense(bullet, opening, "present"),
        }));
      }

      if (candidateCitation?.contribution_level) {
        const allowed = CONTRIBUTION_RANK[candidateCitation.contribution_level] || 1;
        const used = VERB_RANK[opening] || 0;
        if (used > allowed) {
          const safeVerb = candidateCitation.contribution_level === "supported" ? (currentRole ? "Support" : "Supported")
            : candidateCitation.contribution_level === "contributed" ? (currentRole ? "Contribute to" : "Contributed to")
              : candidateCitation.contribution_level === "owned" ? (currentRole ? "Deliver" : "Delivered")
                : (currentRole ? "Lead" : "Led");
          issues.push(issueRecord({
            type: "contribution_level",
            severity: "blocked",
            experience, experienceIndex, bullet, bulletIndex, citations, profile,
            explanation: `The verb implies more ownership than the candidate-confirmed “${candidateCitation.contribution_level}” contribution level.`,
            suggestion: `${safeVerb}${bullet.slice(opening.length)}`,
          }));
        }
      }
    }
  }

  const blocked = issues.filter((issue) => issue.severity === "blocked").length;
  return {
    status: blocked ? "blocked" : issues.length ? "review" : "pass",
    occupation_profile: profile,
    preferred_verbs: preferredVerbs,
    issue_count: issues.length,
    blocking_issue_count: blocked,
    issues,
    note: "Writing suggestions improve clarity and ATS readability; they do not manufacture experience or guarantee an ATS result.",
  };
}
