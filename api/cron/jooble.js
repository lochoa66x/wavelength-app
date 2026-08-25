import { createClient } from "@supabase/supabase-js";

import { runHimalayasIngestion } from "../_lib/himalayas.js";
import { runJobicyIngestion } from "../_lib/jobicy.js";
import { runJoobleIngestion } from "../_lib/jooble.js";
import {
  parseDisabledJobSources,
  skippedSourceImport,
  sourceImportDecision,
} from "../_lib/sourcePolicy.js";
import {
  logCronHealth,
  runSourceImport,
  summarizeCronHealth,
  summarizeSourceOutcome,
} from "../_lib/sourceHealth.js";

export function getJoobleCronConfig(env = process.env) {
  const config = {
    joobleApiKey: env.JOOBLE_API_KEY?.trim(),
    cronSecret: env.CRON_SECRET?.trim(),
    supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL)?.trim(),
    supabaseSecretKey: env.SUPABASE_SECRET_KEY?.trim(),
    disabledSources: parseDisabledJobSources(env.JOB_SOURCE_DISABLED),
  };
  const required = {
    cronSecret: config.cronSecret,
    supabaseUrl: config.supabaseUrl,
    supabaseSecretKey: config.supabaseSecretKey,
  };
  const missing = Object.entries(required)
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
      console.error(`Scheduled feed configuration is incomplete: ${error?.message || "Unknown error"}`);
      return res.status(500).json({ error: "Scheduled importer is not configured" });
    }

    if (!config.cronSecret || bearerToken(req) !== config.cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabase = createClientImpl(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const disabledSources = config.disabledSources || new Set();
    const decisions = {
      jooble: sourceImportDecision({
        source: "jooble",
        configured: Boolean(config.joobleApiKey),
        disabledSources,
      }),
      jobicy: sourceImportDecision({ source: "jobicy", disabledSources }),
      himalayas: sourceImportDecision({ source: "himalayas", disabledSources }),
    };
    const [joobleResult, jobicyResult, himalayasResult] = await Promise.all([
      runSourceImport(() => decisions.jooble.enabled
        ? ingest({
          supabase,
          apiKey: config.joobleApiKey,
        })
        : Promise.resolve(skippedSourceImport(decisions.jooble))),
      runSourceImport(() => decisions.jobicy.enabled
        ? jobicyIngest({ supabase })
        : Promise.resolve(skippedSourceImport(decisions.jobicy))),
      runSourceImport(() => decisions.himalayas.enabled
        ? himalayasIngest({ supabase })
        : Promise.resolve(skippedSourceImport(decisions.himalayas))),
    ]);

    const sources = {
      jooble: summarizeSourceOutcome(joobleResult, "Jooble import failed"),
      jobicy: summarizeSourceOutcome(jobicyResult, "Jobicy import failed"),
      himalayas: summarizeSourceOutcome(himalayasResult, "Himalayas import failed"),
    };
    const health = summarizeCronHealth(sources);
    logCronHealth(console.info, "scheduled_feed_refresh", health, sources);
    if (health.succeeded === 0) {
      return res.status(502).json({ ok: false, error: "Scheduled imports failed", country: "CA", health, sources });
    }

    return res.status(200).json({
      ok: true,
      partial: health.state === "partial",
      country: "CA",
      health,
      sources,
    });
  };
}

export default createJoobleCronHandler();
