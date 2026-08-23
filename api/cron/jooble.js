import { createClient } from "@supabase/supabase-js";

import { runHimalayasIngestion } from "../_lib/himalayas.js";
import { runJobicyIngestion } from "../_lib/jobicy.js";
import { runJoobleIngestion } from "../_lib/jooble.js";

export function getJoobleCronConfig(env = process.env) {
  const config = {
    joobleApiKey: env.JOOBLE_API_KEY?.trim(),
    cronSecret: env.CRON_SECRET?.trim(),
    supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL)?.trim(),
    supabaseSecretKey: env.SUPABASE_SECRET_KEY?.trim(),
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing server configuration: ${missing.join(", ")}`);
  }
  return config;
}

function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] || "";
}

export function createJoobleCronHandler({
  getConfig = getJoobleCronConfig,
  createClientImpl = createClient,
  ingest = runJoobleIngestion,
  jobicyIngest = runJobicyIngestion,
  himalayasIngest = runHimalayasIngestion,
} = {}) {
  return async function handler(req, res) {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let config;
    try {
      config = getConfig();
    } catch (error) {
      console.error("Jooble cron configuration is incomplete");
      return res.status(500).json({ error: "Jooble importer is not configured" });
    }

    if (!config.cronSecret || bearerToken(req) !== config.cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabase = createClientImpl(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [joobleResult, jobicyResult, himalayasResult] = await Promise.allSettled([
      ingest({
        supabase,
        apiKey: config.joobleApiKey,
      }),
      jobicyIngest({ supabase }),
      himalayasIngest({ supabase }),
    ]);

    const sources = {
      jooble: joobleResult.status === "fulfilled"
        ? { ok: true, ...joobleResult.value }
        : { ok: false, error: "Jooble import failed" },
      jobicy: jobicyResult.status === "fulfilled"
        ? { ok: true, ...jobicyResult.value }
        : { ok: false, error: "Jobicy import failed" },
      himalayas: himalayasResult.status === "fulfilled"
        ? { ok: true, ...himalayasResult.value }
        : { ok: false, error: "Himalayas import failed" },
    };
    const successfulSources = Object.values(sources).filter(({ ok }) => ok).length;

    if (joobleResult.status === "rejected") {
      console.error(`Jooble cron failed: ${joobleResult.reason?.message || "Unknown error"}`);
    }
    if (jobicyResult.status === "rejected") {
      console.error(`Jobicy companion import failed: ${jobicyResult.reason?.message || "Unknown error"}`);
    }
    if (himalayasResult.status === "rejected") {
      console.error(`Himalayas companion import failed: ${himalayasResult.reason?.message || "Unknown error"}`);
    }
    if (successfulSources === 0) {
      return res.status(502).json({ ok: false, error: "Scheduled imports failed", country: "CA", sources });
    }

    return res.status(200).json({
      ok: true,
      partial: successfulSources < Object.keys(sources).length,
      country: "CA",
      sources,
    });
  };
}

export default createJoobleCronHandler();
