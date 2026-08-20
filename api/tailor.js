import { createClient } from "@supabase/supabase-js";
import { isTradesLikeCategory, normalizeListingCategory } from "../src/listingCategories.js";
import { getSupabaseConfig } from "../src/supabaseConfig.js";

// ----------------------------------------------------------------------------
// Tool schemas
// ----------------------------------------------------------------------------

// Professional tool — used for all non-trades categories. Same shape as before,
// no certifications / safety fields.
const PROFESSIONAL_TOOL = {
  name: "return_tailored_resume",
  description: "Return the tailored resume as structured data.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Candidate's full name, taken from the base resume. Empty string if not present.",
      },
      title: {
        type: "string",
        description: "Short professional title tailored to this specific gig (e.g. 'Web Developer', 'Solution Architect'). Use transferable-skill framing when the candidate is pivoting. Under 6 words.",
      },
      contact: {
        type: "string",
        description: "One-line contact info from the base resume (email, phone, city). Empty string if not present. Format like: 'email@example.com · 555-123-4567 · City, State'.",
      },
      profile: {
        type: "string",
        description: "2-4 sentence profile/summary tailored to this specific gig, using transferable-skill language where the candidate's background differs from the target role's specific domain.",
      },
      fit_assessment: {
        type: "object",
        description: "Honest comparison between the candidate's evidence and the target role.",
        properties: {
          path: { type: "string", enum: ["direct", "adjacent", "career_change"] },
          recommended_level: { type: "string", description: "The honest level to present, such as Senior, Intermediate, Entry-level, Helper, or Apprentice candidate." },
          note: { type: "string", description: "One short candidate-facing explanation of the positioning. Do not discourage applying or invent missing qualifications." },
        },
        required: ["path", "recommended_level", "note"],
      },
      experience: {
        type: "array",
        description: "Work experience entries in relevance order (most relevant to this gig first, not necessarily chronological).",
        items: {
          type: "object",
          properties: {
            role: { type: "string" },
            company: { type: "string" },
            dates: { type: "string", description: "e.g. '2022–2024'. Omit field if not in base resume." },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["role", "bullets"],
        },
      },
      skills: {
        type: "array",
        description: "Compact list of skills/tools/technologies, including specific tool names (e.g. SAP, specific languages) even when de-emphasized in the prose above.",
        items: { type: "string" },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            degree: { type: "string" },
            institution: { type: "string" },
            dates: { type: "string" },
          },
        },
      },
      languages: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["profile", "experience", "skills", "fit_assessment"],
  },
};

// Trades tool — adds certifications, safety_record, safety_certifications.
// The template renders these prominently (certs above experience, dedicated
// safety section). Empty arrays are fine; the frontend gracefully omits
// missing sections.
const TRADES_TOOL = {
  name: "return_trades_resume",
  description: "Return the tailored resume as structured data for a skilled-trades gig, with certifications and safety training as first-class sections.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Candidate's full name, taken from the base resume. Empty string if not present.",
      },
      title: {
        type: "string",
        description: "Truthful trade target and level. For qualified candidates, use specialty + supported credential. For career changers without trade credentials, use 'Entry-Level [Trade] Candidate' or '[Trade] Helper Candidate'. Use Apprentice only when registration or enrolment is in the base resume. Under 8 words.",
      },
      contact: {
        type: "string",
        description: "One-line contact info from the base resume (email, phone, city). Format like: 'email@example.com · 555-123-4567 · City, Province'. No portfolio URL — trades don't need one.",
      },
      profile: {
        type: "string",
        description: "2-3 sentence profile. For direct trade candidates, lead with supported credentials, years, and specialty. For career changers, lead with an honest entry-level target and proven transferable skills while avoiding irrelevant domain jargon. Never invent trade experience or credentials.",
      },
      fit_assessment: {
        type: "object",
        description: "Honest comparison between the candidate's evidence and the target trade role.",
        properties: {
          path: { type: "string", enum: ["direct", "adjacent", "career_change"] },
          recommended_level: { type: "string", description: "The honest level to present. Use Apprentice only when supported; otherwise use Entry-level or Helper candidate." },
          note: { type: "string", description: "One short candidate-facing explanation of the positioning and any required credential gap stated in the posting." },
        },
        required: ["path", "recommended_level", "note"],
      },
      certifications: {
        type: "array",
        description: "Trade certifications, licenses, and endorsements from the base resume. Red Seal endorsement, provincial journeyman certification, master trade licenses, apprenticeship completion, trade-specific tickets. Empty array if none in the base resume — never invent.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "The credential name, e.g. 'Red Seal Journeyman Plumber' or 'Certificate of Qualification – Electrician'." },
            issuer: { type: "string", description: "Issuing body (e.g. 'Canadian Council of Directors of Apprenticeship', 'Ordre des plombiers du Québec', 'Skilled Trades Ontario'). Omit if not in base resume." },
            year: { type: "string", description: "Year obtained. Omit if not in base resume." },
          },
          required: ["name"],
        },
      },
      safety_record: {
        type: "string",
        description: "One-sentence safety achievement, ONLY if the base resume explicitly states verifiable safety information (e.g. '12 years incident-free across residential and commercial sites' or 'Maintained zero-incident record across 8,000+ service hours'). Empty string if not in base resume. Never invent.",
      },
      safety_certifications: {
        type: "array",
        description: "Safety training and certifications from the base resume: WHMIS 2015, Working at Heights, Confined Space Entry, First Aid & CPR, Fall Protection, Lockout/Tagout, H2S Alive, TDG, etc. Empty array if none in base resume — never invent.",
        items: { type: "string" },
      },
      experience: {
        type: "array",
        description: "Work experience in relevance order. Bullets should lead with work context (residential / commercial / industrial) and name specific systems, codes, or equipment where present in the base resume.",
        items: {
          type: "object",
          properties: {
            role: { type: "string" },
            company: { type: "string" },
            dates: { type: "string", description: "e.g. '2022–2024'. Omit field if not in base resume." },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["role", "bullets"],
        },
      },
      skills: {
        type: "array",
        description: "Trade skills plus equipment/tools proficiency. Include specific systems, equipment models, and specialized techniques when present in the base resume.",
        items: { type: "string" },
      },
      education: {
        type: "array",
        description: "Trade school, apprenticeship program, or formal training. Include only what's in the base resume.",
        items: {
          type: "object",
          properties: {
            degree: { type: "string" },
            institution: { type: "string" },
            dates: { type: "string" },
          },
        },
      },
    },
    required: ["profile", "experience", "skills", "certifications", "safety_certifications", "fit_assessment"],
  },
};

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] || null;
}

async function authenticateSupabaseRequest(token) {
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { user, supabase };
}

async function loadTrustedListing(supabase, listingId) {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (error || !data) return null;
  return {
    ...data,
    type: data.job_type || "Unlabeled",
    category: normalizeListingCategory(data.title, data.category),
  };
}

export function createTailorHandler({
  authenticate = authenticateSupabaseRequest,
  loadListing = loadTrustedListing,
  fetchImpl = globalThis.fetch,
  getApiKey = () => process.env.ANTHROPIC_API_KEY,
} = {}) {
  return async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const auth = await authenticate(token).catch(() => null);
  if (!auth?.user || !auth.supabase) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set in this deployment's environment");
    return res.status(500).json({ error: "Server not configured with an Anthropic API key" });
  }

  const { resume, listingId, extraContext } = req.body || {};
  const validListingId = typeof listingId === "string" || typeof listingId === "number";
  if (typeof resume !== "string" || !resume.trim() || !validListingId) {
    return res.status(400).json({ error: "Missing resume or listingId" });
  }

  const item = await loadListing(auth.supabase, listingId);
  if (!item?.title) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const cappedResume = resume.trim().slice(0, 8000);
  const cappedExtraContext = typeof extraContext === "string" ? extraContext.slice(0, 3000) : "";

  const storedPosting = item.description?.trim().slice(0, 8000);
  const jobContext = storedPosting
    ? `Structured description saved with the listing:\n${storedPosting}`
    : `No full posting text available — only this short match reason: "${item.reason}". Work with what's here; don't invent requirements that aren't stated.`;

  const extraContextBlock = cappedExtraContext.trim()
    ? `\n\nADDITIONAL CONTEXT FROM THE CANDIDATE\n${cappedExtraContext.trim()}`
    : "";

  // Pick the right tool + prompt appendix based on listing category.
  const isTradesGig = isTradesLikeCategory(item.category);
  const tool = isTradesGig ? TRADES_TOOL : PROFESSIONAL_TOOL;
  const toolName = tool.name;

  // Category-specific prompt appendix. Only trades gets extra structured
  // guidance today; other categories can be added when we build their
  // templates in a follow-up.
  const categoryAppendix = isTradesGig
    ? `

CATEGORY: SKILLED TRADES
- First classify the application as direct, adjacent, or career_change in \`fit_assessment\` by comparing the base résumé with the full posting requirements.
- For a career change into a regulated trade, do NOT present the candidate as a qualified tradesperson. If the base résumé does not prove registration, use an honest title such as "Entry-Level Plumbing Candidate" or "Plumbing Helper Candidate". Use "Apprentice" only if the base résumé says the candidate is registered or enrolled as one.
- If the posting requires a license, journeyperson status, or direct trade experience the candidate does not have, say so briefly in \`fit_assessment.note\` and recommend the closest entry-level path. Still produce a useful transferable-skills résumé.
- Populate the \`certifications\` array with any trade certifications, licenses, or endorsements in the base resume — Red Seal, provincial journeyman certification, master trade licenses, apprenticeship completion, etc. If none are in the base resume, return an empty array — do NOT invent.
- Populate \`safety_certifications\` with any safety training in the base resume — WHMIS, Working at Heights, Confined Space, First Aid, Fall Protection, etc. Empty array if none.
- Populate \`safety_record\` with a one-sentence achievement ONLY if the base resume contains verifiable safety information (e.g. "12 years incident-free" or "OSHA-compliant across N job sites"). Leave empty if not in base resume.
- For a direct trade candidate, the profile should lead with credential + years of experience. For a career changer, lead with the honest entry-level target and the strongest proven transferable evidence: reliability, perseverance, safety-minded work, team leadership, project coordination, client service, or problem solving. Include only qualities supported by the base résumé.
- Experience bullets should lead with work context (residential / commercial / industrial) and name specific systems, codes, or equipment where present in the base resume.
- Do NOT include a "portfolio" field — trades don't have portfolios.`
    : "";

  const prompt = `You're a resume editor helping a candidate apply to ONE specific gig. Produce a tailored version of their resume via the ${toolName} tool — the kind that's 1-2 pages when formatted normally (roughly 450-900 words of actual content across all bullets combined). This must read as a resume with real substance, not a short summary, and not an unbounded reproduction of their entire career either.

TARGET GIG
Title: "${item.title}"
Company: ${item.company}
Type: ${item.type}
Category: ${item.category || "unspecified"}
${jobContext}${extraContextBlock}

CANDIDATE'S BASE RESUME
${cappedResume}

INSTRUCTIONS
- Compare the candidate's evidence against the FULL posting text before writing. Populate \`fit_assessment.path\` as direct, adjacent, or career_change and recommend a truthful level.
- When the gap is large, position the candidate for the nearest realistic entry-level path rather than pretending they meet a senior posting. In regulated work, do not call someone licensed, certified, journeyperson, or registered apprentice unless the base résumé proves it.
- Preserve every historical employer and job title exactly. You may reorder entries and translate bullet language, but never rename a past role to make it resemble the target job.
- Identify the skills/requirements this specific posting cares about most (from the posting text above), and restructure the resume so that experience leads — reorder roles/bullets, don't delete relevant ones, unless something is genuinely filler.
- If the candidate's background is in a different specific technology/domain than the target role (e.g. their real experience is enterprise SAP systems work but the target role is general web development), this is a TRANSLATION job, not just a reordering job: identify the underlying transferable capability behind each domain-specific achievement (e.g. "SAP PI/PO integration work" is fundamentally "systems integration and interface design"; "SAP MDG configuration" is fundamentally "data architecture and governance"; "leading UAT and regression cycles" is fundamentally "quality assurance and release management") and lead with that transferable framing in the profile and bullets. Keep specific tool names (SAP, etc.) in the skills list for technical credibility, but don't make them the headline language of every bullet. This is honest reframing of real experience, not invention.
- If the candidate is pivoting careers, NEVER apologize for the pivot ("although I lack direct experience...") — frame the past as a deliberate advantage ("12 years in enterprise systems architecture gives me depth in..."). Follow the 4-part summary formula: (1) target role identity, (2) prior domain as foundation, (3) transferable skills mapped explicitly, (4) proof-of-transition (recent projects, courses, certifications) — but only include #4 if it's actually present in the base resume.
- Never state a skill, tool, employer, achievement, date, or credential that isn't already in the base resume above, and never claim experience with a specific technology (e.g. React, a specific language, a specific framework) that isn't in the base resume — describe the underlying capability honestly instead of borrowing the posting's specific tool names for something the candidate hasn't done.
- For a major career change (for example SAP manager to a plumbing helper/apprentice path), emphasize only proven transferable capabilities such as perseverance, leading teams, safety awareness, planning, dependable execution, customer communication, and solving practical problems. De-emphasize domain-specific technical details that do not help the target role; retain only enough to keep the work history truthful.
- If the candidate's real career is long (many roles, decades), use real editorial judgment: keep the roles and bullets most relevant to THIS gig in full detail, and compress the least relevant older/unrelated roles to one or two bullets each — the way a human resume writer would for a 1-2 page document. Don't just cut off the oldest roles entirely unless truly irrelevant.
- Only include the education/languages fields if the base resume actually contains that information — omit them entirely rather than guessing.
- ATS OPTIMIZATION (critical — modern applicant screeners like Greenhouse AI, Workday, and iCIMS parse bullets looking for these signals):
  * Every experience bullet must START with a strong action verb. Past tense for prior roles, present tense for the current role. Prefer verbs like: architected, led, delivered, launched, optimized, streamlined, reduced, increased, established, coordinated, mentored, migrated, deployed, negotiated, implemented, designed, built, scaled, drove, spearheaded, transformed. AVOID weak openers: "was responsible for", "helped with", "worked on", "assisted in", "participated in", "involved in", "duties included".
  * Include quantifiable outcomes whenever the base resume honestly supports them — dollar amounts ($2M budget), team sizes (8-person team), percentages (35% cost reduction), volumes (500+ transactions/day), timeframes (2-week turnaround), scope (12 countries, 40 sites). NEVER invent numbers. If the base resume says "led a team", don't fabricate "led a team of 12". If no metric is present in the base resume for a bullet, write a strong verb + specific-scope bullet without a number.
  * Mirror keywords from the target posting where they honestly describe the candidate's underlying capability. If the posting says "cross-functional collaboration" and the candidate has genuinely worked across teams, use that exact phrase. Same for "stakeholder management", "agile delivery", etc. Do NOT force keywords for capabilities the candidate doesn't actually have.
  * Prefer specific over generic. "Configured HVAC systems across 40+ commercial installations" beats "Handled HVAC work". "Migrated 12 legacy interfaces to REST APIs" beats "Worked on API projects". Specificity is what makes an ATS score a bullet as high-signal.
  * Structure bullets as: [action verb] + [what you did] + [scope/scale] + [outcome, when supported by the base resume]. Not every bullet needs all four — but every bullet must have at least verb + what + one of scope-or-outcome.${categoryAppendix}`;

  try {
    const anthropicController = new AbortController();
    const anthropicTimeout = setTimeout(() => anthropicController.abort(), 50000);

    const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: [tool],
        tool_choice: { type: "tool", name: toolName },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: anthropicController.signal,
    });
    clearTimeout(anthropicTimeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Anthropic API error ${response.status}: ${errText}`);
      return res.status(502).json({ error: "Tailoring request failed upstream" });
    }

    const data = await response.json();
    if (data.stop_reason === "max_tokens") {
      console.error(`Tailor response hit max_tokens and was truncated for gig "${item.title}"`);
    }

    const toolUse = (data.content || []).find((b) => b.type === "tool_use" && b.name === toolName);
    if (!toolUse || !toolUse.input) {
      console.error(`No tool_use block in response for gig "${item.title}" (tool ${toolName}): ${JSON.stringify(data.content)}`);
      return res.status(502).json({ error: "Model did not return structured resume data" });
    }

    const resumeData = toolUse.input;
    if (!resumeData.profile || !Array.isArray(resumeData.experience) || resumeData.experience.length === 0) {
      console.error(`Incomplete structured resume for gig "${item.title}": ${JSON.stringify(resumeData)}`);
      return res.status(502).json({ error: "Model returned incomplete resume data" });
    }

    return res.status(200).json({ resume: resumeData });
  } catch (err) {
    console.error("Tailor proxy failed:", err.message);
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Tailoring took too long. Try again — often faster the second time." });
    }
    return res.status(500).json({ error: "Internal error" });
  }
  };
}

export default createTailorHandler();
