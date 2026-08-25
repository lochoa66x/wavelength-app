import { createClient } from "@supabase/supabase-js";

import { runAdzunaIngestion } from "../_lib/adzuna.js";
import { parseAtsBoardConfig, runAtsBoardIngestion } from "../_lib/atsBoards.js";
import {
  filterEligibleAtsBoards,
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

export function getAdzunaCronConfig(env = process.env) {
  const config = {
    adzunaAppId: env.ADZUNA_APP_ID?.trim(),
    adzunaAppKey: env.ADZUNA_APP_KEY?.trim(),
    cronSecret: env.CRON_SECRET?.trim(),
    supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL)?.trim(),
    supabaseSecretKey: env.SUPABASE_SECRET_KEY?.trim(),
    atsBoards: parseAtsBoardConfig(env.ATS_JOB_BOARDS),
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

export function createAdzunaCronHandler({
  getConfig = getAdzunaCronConfig,
  createClientImpl = createClient,
  ingest = runAdzunaIngestion,
  atsIngest = runAtsBoardIngestion,
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
    const adzunaConfigured = Boolean(config.adzunaAppId && config.adzunaAppKey);
    const adzunaDecision = sourceImportDecision({
      source: "adzuna",
      configured: adzunaConfigured,
      disabledSources,
    });
    const configuredAtsBoards = config.atsBoards || [];
    const eligibleAtsBoards = filterEligibleAtsBoards(configuredAtsBoards, disabledSources);
    const atsDecision = {
      enabled: eligibleAtsBoards.length > 0,
      skipCategory: configuredAtsBoards.length > 0 ? "disabled_by_policy" : "configuration",
    };
    const [adzunaResult, atsResult] = await Promise.all([
      runSourceImport(() => adzunaDecision.enabled
        ? ingest({
          supabase,
          credentials: {
            appId: config.adzunaAppId,
            appKey: config.adzunaAppKey,
          },
        })
        : Promise.resolve(skippedSourceImport(adzunaDecision))),
      runSourceImport(() => atsDecision.enabled
        ? atsIngest({ supabase, boards: eligibleAtsBoards })
        : Promise.resolve(skippedSourceImport(atsDecision, { boards: configuredAtsBoards.length }))),
    ]);

    const sources = {
      adzuna: summarizeSourceOutcome(adzunaResult, "Adzuna import failed"),
      employerDirect: summarizeSourceOutcome(atsResult, "Employer-direct ATS import failed"),
    };
    const health = summarizeCronHealth(sources);
    const adzunaSummary = sources.adzuna.ok && !sources.adzuna.skipped ? sources.adzuna : {};
    logCronHealth(console.info, "scheduled_feed_refresh", health, sources);
    if (health.attempted === 0) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        country: "CA",
        health,
        sources,
      });
    }
    if (health.succeeded === 0) {
      return res.status(502).json({ ok: false, error: "Scheduled imports failed", country: "CA", health, sources });
    }

    return res.status(200).json({
      ok: true,
      source: adzunaConfigured ? "adzuna" : "employer-direct",
      country: "CA",
      partial: health.state === "partial",
      health,
      ...adzunaSummary,
      ats: sources.employerDirect,
      sources,
    });
  };
}

export default createAdzunaCronHandler();
