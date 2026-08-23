import { createClient } from "@supabase/supabase-js";

import { runAdzunaIngestion } from "../_lib/adzuna.js";
import { parseAtsBoardConfig, runAtsBoardIngestion } from "../_lib/atsBoards.js";

export function getAdzunaCronConfig(env = process.env) {
  const config = {
    adzunaAppId: env.ADZUNA_APP_ID?.trim(),
    adzunaAppKey: env.ADZUNA_APP_KEY?.trim(),
    cronSecret: env.CRON_SECRET?.trim(),
    supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL)?.trim(),
    supabaseSecretKey: env.SUPABASE_SECRET_KEY?.trim(),
    atsBoards: parseAtsBoardConfig(env.ATS_JOB_BOARDS),
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

    const adzunaConfigured = Boolean(config.adzunaAppId && config.adzunaAppKey);
    const atsConfigured = Boolean(config.atsBoards?.length);
    const [adzunaResult, atsResult] = await Promise.allSettled([
      adzunaConfigured
        ? ingest({
          supabase,
          credentials: {
            appId: config.adzunaAppId,
            appKey: config.adzunaAppKey,
          },
        })
        : Promise.resolve({
          skipped: true,
          reason: "ADZUNA_APP_ID and ADZUNA_APP_KEY are not configured",
          requests: 0,
          received: 0,
          saved: 0,
        }),
      atsConfigured
        ? atsIngest({ supabase, boards: config.atsBoards })
        : Promise.resolve({ skipped: true, boards: 0, received: 0, saved: 0 }),
    ]);

    const sources = {
      adzuna: adzunaResult.status === "fulfilled"
        ? { ok: true, ...adzunaResult.value }
        : { ok: false, error: "Adzuna import failed" },
      employerDirect: atsResult.status === "fulfilled"
        ? { ok: true, ...atsResult.value }
        : { ok: false, error: "Employer-direct ATS import failed" },
    };
    if (adzunaResult.status === "rejected") {
      console.error(`Adzuna cron failed: ${adzunaResult.reason?.message || "Unknown error"}`);
    }
    if (atsResult.status === "rejected") {
      console.error(`Employer-direct ATS import failed: ${atsResult.reason?.message || "Unknown error"}`);
    }

    const attemptedSources = Object.values(sources).filter(({ skipped }) => !skipped).length;
    const successfulSources = Object.values(sources).filter(({ ok, skipped }) => ok && !skipped).length;
    const failedSources = Object.values(sources).filter(({ ok }) => !ok).length;
    const adzunaSummary = adzunaResult.status === "fulfilled" && !adzunaResult.value?.skipped
      ? adzunaResult.value
      : {};
    if (attemptedSources === 0) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        country: "CA",
        sources,
      });
    }
    if (successfulSources === 0) {
      return res.status(502).json({ ok: false, error: "Scheduled imports failed", country: "CA", sources });
    }

    return res.status(200).json({
      ok: true,
      source: adzunaConfigured ? "adzuna" : "employer-direct",
      country: "CA",
      partial: failedSources > 0,
      ...adzunaSummary,
      ats: sources.employerDirect,
      sources,
    });
  };
}

export default createAdzunaCronHandler();
