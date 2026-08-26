import { createServerSupabaseClient } from "./_lib/serverSupabase.js";
import {
  QUALITY_SIGNAL_MAX_BYTES,
  qualitySignalJsonBytes,
  validateQualitySignal,
} from "../src/qualitySignalContract.js";

function requestHeader(req, name) {
  const value = req?.headers?.[name] ?? req?.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : String(value || "");
}

export function allowedQualitySignalOrigins(env = process.env) {
  const origins = new Set(["https://gigscapes.com", "https://www.gigscapes.com"]);
  for (const key of ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) {
    const host = String(env[key] || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
    if (host) origins.add(`https://${host}`);
  }
  return origins;
}

export function isAllowedQualitySignalOrigin(origin, env = process.env) {
  if (allowedQualitySignalOrigins(env).has(origin)) return true;
  if (env.VERCEL_ENV === "production") return false;
  return /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
}

function parseRequestBody(body) {
  if (typeof body === "string") return JSON.parse(body);
  return body;
}

function requestBodyBytes(body) {
  if (typeof body === "string") return Buffer.byteLength(body, "utf8");
  return qualitySignalJsonBytes(body);
}

function rpcParameters(signal) {
  return {
    p_schema_version: signal.schemaVersion,
    p_event_name: signal.eventName,
    p_route: signal.route,
    p_posting_source: signal.postingSource,
    p_occupation_family: signal.occupationFamily,
    p_candidate_path: signal.candidatePath,
    p_posting_readiness: signal.postingReadiness,
    p_export_readiness: signal.exportReadiness,
    p_integrity_status: signal.integrityStatus,
    p_template_id: signal.templateId,
    p_export_format: signal.exportFormat,
    p_outcome: signal.outcome,
    p_error_category: signal.errorCategory,
    p_coverage_band: signal.coverageBand,
    p_duration_band: signal.durationBand,
    p_feedback: signal.feedback,
    p_feedback_reason: signal.feedbackReason,
  };
}

async function recordQualitySignal(signal) {
  const client = createServerSupabaseClient();
  const { error } = await client.rpc("record_quality_signal", rpcParameters(signal));
  if (error) throw new Error("Quality signal storage failed");
}

function noStore(res) {
  res.setHeader?.("Cache-Control", "no-store, max-age=0");
  res.setHeader?.("Referrer-Policy", "no-referrer");
}

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

export function createQualitySignalHandler({
  record = recordQualitySignal,
  env = process.env,
  logger = console,
} = {}) {
  return async function qualitySignalHandler(req, res) {
    noStore(res);
    if (req.method !== "POST") {
      res.setHeader?.("Allow", "POST");
      return jsonError(res, 405, "Method not allowed");
    }
    if (requestHeader(req, "x-gigscapes-quality-signal") !== "1") {
      return jsonError(res, 400, "Invalid quality signal");
    }
    if (!isAllowedQualitySignalOrigin(requestHeader(req, "origin"), env)) {
      return jsonError(res, 403, "Origin not allowed");
    }
    if (!/^application\/json(?:\s*;|$)/i.test(requestHeader(req, "content-type"))) {
      return jsonError(res, 415, "JSON content type required");
    }
    const declaredLength = Number(requestHeader(req, "content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > QUALITY_SIGNAL_MAX_BYTES) {
      return jsonError(res, 413, "Payload too large");
    }

    if (requestBodyBytes(req.body) > QUALITY_SIGNAL_MAX_BYTES) {
      return jsonError(res, 413, "Payload too large");
    }
    let signal;
    try {
      signal = parseRequestBody(req.body);
    } catch {
      return jsonError(res, 400, "Invalid quality signal");
    }
    const validation = validateQualitySignal(signal);
    if (!validation.ok) return jsonError(res, 400, "Invalid quality signal");

    const startedAt = Date.now();
    try {
      await record(validation.value);
      logger.info?.({ event: "quality_signal", status: "accepted", durationMs: Date.now() - startedAt });
      if (typeof res.status(204).end === "function") return res.status(204).end();
      return res.status(204).json(null);
    } catch {
      logger.error?.({ event: "quality_signal", status: "failed", errorCategory: "storage", durationMs: Date.now() - startedAt });
      return jsonError(res, 503, "Quality signal unavailable");
    }
  };
}

export default createQualitySignalHandler();
