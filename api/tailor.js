// api/tailor.js — Vercel serverless function
// Proxies to the Anthropic API and returns a STRUCTURED tailored résumé
// (not free text) via a forced tool call, so the frontend can render/export it.
//
// Contract returned to the client:  { resume: TailoredResume }
// where TailoredResume matches RESUME_TOOL.input_schema below.

const RESUME_TOOL = {
  name: "return_tailored_resume",
  description:
    "Return the candidate's résumé, reorganized and re-emphasized for a specific gig. " +
    "Only reorganize, rephrase, and prioritize what is already true in the base résumé. " +
    "Never invent employers, titles, dates, degrees, skills, or achievements that are not " +
    "present in the base résumé.",
  input_schema: {
    type: "object",
    properties: {
      profile: {
        type: "object",
        description: "Header block and tailored summary.",
        properties: {
          name: { type: "string" },
          title: {
            type: "string",
            description:
              "A short professional headline aligned to this gig, drawn from the candidate's real background.",
          },
          location: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          summary: {
            type: "string",
            description:
              "2–3 sentence summary tailored to this gig, using only true information from the base résumé.",
          },
        },
        required: ["name", "title", "summary"],
      },
      experience: {
        type: "array",
        description: "Work history, most relevant first.",
        items: {
          type: "object",
          properties: {
            role: { type: "string" },
            company: { type: "string" },
            dates: { type: "string" },
            bullets: {
              type: "array",
              description:
                "3–5 bullets that re-emphasize real accomplishments toward this gig.",
              items: { type: "string" },
            },
          },
          required: ["role", "company", "bullets"],
        },
      },
      skills: {
        type: "array",
        description: "Skills relevant to this gig, ordered by relevance.",
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
          required: ["degree", "institution"],
        },
      },
      languages: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["profile", "experience", "skills"],
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "Server not configured" });
  }

  const { item, resume } = req.body || {};
  if (!item || !item.title || !resume) {
    return res
      .status(400)
      .json({ error: "Missing required fields: item.title and resume" });
  }

  const prompt =
    `You are tailoring a candidate's résumé to one specific gig. ` +
    `Reorganize, rephrase, and prioritize ONLY what is already true in the base résumé below. ` +
    `Never invent experience, employers, dates, education, skills, or claims that are not in the base résumé. ` +
    `Return the result by calling the return_tailored_resume tool.\n\n` +
    `Gig: "${item.title}" at ${item.company || "an employer"}. ` +
    `Type: ${item.type || "unspecified"}. ` +
    `Why it matched their search: ${item.reason || "n/a"}.\n\n` +
    `Base résumé:\n${resume}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: [RESUME_TOOL],
        tool_choice: { type: "tool", name: "return_tailored_resume" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Anthropic API error ${response.status}: ${errText}`);
      return res.status(502).json({ error: "Tailoring request failed upstream" });
    }

    const data = await response.json();
    if (data.stop_reason === "max_tokens") {
      console.error(
        `Tailor response hit max_tokens and was truncated for gig "${item.title}"`
      );
    }

    const toolUse = (data.content || []).find(
      (b) => b.type === "tool_use" && b.name === "return_tailored_resume"
    );
    if (!toolUse || !toolUse.input) {
      console.error(
        `No tool_use block for gig "${item.title}": ${JSON.stringify(data.content)}`
      );
      return res
        .status(502)
        .json({ error: "Model did not return structured resume data" });
    }

    const resumeData = toolUse.input;
    if (
      !resumeData.profile ||
      !Array.isArray(resumeData.experience) ||
      resumeData.experience.length === 0
    ) {
      console.error(
        `Incomplete structured resume for gig "${item.title}": ${JSON.stringify(resumeData)}`
      );
      return res
        .status(502)
        .json({ error: "Model returned incomplete resume data" });
    }

    return res.status(200).json({ resume: resumeData });
  } catch (err) {
    console.error("Tailor proxy failed:", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
