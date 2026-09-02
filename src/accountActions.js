import { APP_PATH, buildAuthRedirectUrl, safeNextPath } from "./authRoutes.js";

export const PENDING_ACCOUNT_ACTION_VERSION = 1;
export const PENDING_ACCOUNT_ACTION_TTL_MS = 15 * 60 * 1000;
export const PENDING_ACCOUNT_ACTION_STORAGE_KEY = "gigscapes:pending-account-action:v1";

export const ACCOUNT_ACTIONS = Object.freeze([
  "save_job",
  "unsave_job",
  "edit_resume",
  "import_posting",
  "upload_posting_screenshots",
  "paste_posting",
  "tailor_resume",
  "generate_evidence",
  "add_evidence",
  "download_docx",
  "download_pdf",
  "copy_tailored_text",
  "generate_cover_letter",
  "create_application_package",
  "start_cover_letter_only",
  "open_application_workspace",
  "download_cover_letter_docx",
  "download_cover_letter_pdf",
  "copy_cover_letter_text",
  "view_saved_jobs",
]);

const ACCOUNT_ACTION_SET = new Set(ACCOUNT_ACTIONS);
const LISTING_ACTIONS = new Set([
  "save_job",
  "unsave_job",
  "tailor_resume",
  "generate_evidence",
  "add_evidence",
]);
const MAX_LISTING_ID_LENGTH = 160;

export const ACCOUNT_ACTION_MESSAGES = Object.freeze({
  save_job: "Sign in to save this job.",
  unsave_job: "Sign in to update your saved jobs.",
  edit_resume: "Sign in to keep your résumé and exports private.",
  import_posting: "Sign in to import a posting by URL.",
  upload_posting_screenshots: "Sign in to upload posting screenshots.",
  paste_posting: "Sign in to paste a posting for tailoring.",
  tailor_resume: "Sign in to tailor your résumé.",
  generate_evidence: "Sign in to analyze your private résumé evidence.",
  add_evidence: "Sign in to add private follow-up evidence.",
  download_docx: "Sign in to download this tailored résumé.",
  download_pdf: "Sign in to download this tailored résumé.",
  copy_tailored_text: "Sign in to copy this tailored résumé.",
  generate_cover_letter: "Sign in to create an evidence-first cover letter.",
  create_application_package: "Sign in to prepare private application documents.",
  start_cover_letter_only: "Sign in to create a private evidence-first cover letter.",
  open_application_workspace: "Sign in to open your private application workspace.",
  download_cover_letter_docx: "Sign in to download this private cover letter.",
  download_cover_letter_pdf: "Sign in to download this private cover letter.",
  copy_cover_letter_text: "Sign in to copy this private cover letter.",
  view_saved_jobs: "Sign in to access your private workspace.",
});

function storageOrNull(storage) {
  if (storage) return storage;
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

export function isAccountAction(value) {
  return typeof value === "string" && ACCOUNT_ACTION_SET.has(value);
}

export function actionNeedsListingId(action) {
  return LISTING_ACTIONS.has(action);
}

export function accountActionMessage(action) {
  return ACCOUNT_ACTION_MESSAGES[action] || "Sign in to continue securely.";
}

export function normalizePublicListingId(value) {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const listingId = String(value).trim();
  if (!listingId || listingId.length > MAX_LISTING_ID_LENGTH) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(listingId)) return null;
  return listingId;
}

export function createPendingAccountAction({
  action,
  listingId,
  returnPath = APP_PATH,
  createdAt = Date.now(),
} = {}) {
  if (!isAccountAction(action)) return null;
  const normalizedListingId = normalizePublicListingId(listingId);
  if (normalizedListingId === null) return null;
  if (actionNeedsListingId(action) && !normalizedListingId) return null;

  if (typeof returnPath !== "string") return null;
  const candidateReturnPath = returnPath.trim();
  const normalizedReturnPath = safeNextPath(candidateReturnPath);
  if (normalizedReturnPath !== candidateReturnPath) return null;
  if (!Number.isSafeInteger(createdAt) || createdAt < 0) return null;

  return {
    version: PENDING_ACCOUNT_ACTION_VERSION,
    action,
    ...(normalizedListingId ? { listingId: normalizedListingId } : {}),
    returnPath: normalizedReturnPath,
    createdAt,
  };
}

export function validatePendingAccountAction(value, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.version !== PENDING_ACCOUNT_ACTION_VERSION) return null;
  if (!Number.isSafeInteger(now) || now < 0) return null;

  const allowedKeys = new Set(["version", "action", "listingId", "returnPath", "createdAt"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;

  const pending = createPendingAccountAction(value);
  if (!pending) return null;
  if (pending.createdAt > now + 60_000) return null;
  if (now - pending.createdAt > PENDING_ACCOUNT_ACTION_TTL_MS) return null;
  return pending;
}

export function persistPendingAccountAction(value, storage) {
  const target = storageOrNull(storage);
  const pending = validatePendingAccountAction(value, value?.createdAt);
  if (!target || !pending) return false;
  try {
    target.setItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY, JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingAccountAction(storage) {
  const target = storageOrNull(storage);
  if (!target) return;
  try {
    target.removeItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY);
  } catch {
    // A blocked storage API is equivalent to having no pending action.
  }
}

export function readPendingAccountAction(storage, now = Date.now()) {
  const target = storageOrNull(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY);
    if (!raw) return null;
    const pending = validatePendingAccountAction(JSON.parse(raw), now);
    if (!pending) target.removeItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY);
    return pending;
  } catch {
    clearPendingAccountAction(target);
    return null;
  }
}

export function consumePendingAccountAction(storage, now = Date.now()) {
  const target = storageOrNull(storage);
  if (!target) return null;
  let raw = null;
  try {
    raw = target.getItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY);
    target.removeItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return validatePendingAccountAction(JSON.parse(raw), now);
  } catch {
    return null;
  }
}

export function accountActionGateDecision({ session, action, listingId, returnPath = APP_PATH, now = Date.now() } = {}) {
  const pending = createPendingAccountAction({ action, listingId, returnPath, createdAt: now });
  if (!pending) return { outcome: "rejected", pending: null };
  return session?.user?.id
    ? { outcome: "continue", pending: null }
    : { outcome: "sign_in", pending };
}

// Email clients frequently open magic links in a new tab, where sessionStorage
// is intentionally unavailable. The callback URL therefore carries only the
// same non-sensitive allowlisted instruction and public listing id. It never
// carries résumé/posting text, email, evidence, sessions, or tokens.
export function buildPendingActionAuthRedirectUrl(origin, pending) {
  const validated = validatePendingAccountAction(pending, pending?.createdAt);
  const redirectUrl = new URL(buildAuthRedirectUrl(origin, validated?.returnPath || APP_PATH));
  if (!validated) return redirectUrl.toString();
  redirectUrl.searchParams.set("pa", validated.action);
  if (validated.listingId) redirectUrl.searchParams.set("pl", validated.listingId);
  redirectUrl.searchParams.set("pt", String(validated.createdAt));
  return redirectUrl.toString();
}

export function pendingActionFromAuthCallback(searchParams, now = Date.now()) {
  if (!searchParams?.get) return null;
  const action = searchParams.get("pa");
  const createdAt = Number(searchParams.get("pt"));
  if (!action || !Number.isSafeInteger(createdAt)) return null;
  return validatePendingAccountAction({
    version: PENDING_ACCOUNT_ACTION_VERSION,
    action,
    ...(searchParams.get("pl") ? { listingId: searchParams.get("pl") } : {}),
    returnPath: safeNextPath(searchParams.get("next")),
    createdAt,
  }, now);
}

export function pendingActionDestination(pending) {
  switch (pending?.action) {
    case "edit_resume":
      return { step: "resume" };
    case "import_posting":
      return { step: "custom_job", mode: "url" };
    case "upload_posting_screenshots":
      return { step: "custom_job", mode: "screenshots" };
    case "paste_posting":
      return { step: "custom_job", mode: "paste" };
    case "view_saved_jobs":
      return { step: "digest", viewFilter: "saved" };
    case "create_application_package":
    case "open_application_workspace":
      return { step: "custom_job", mode: "paste", documentIntent: "package" };
    case "start_cover_letter_only":
      return { step: "custom_job", mode: "paste", documentIntent: "cover_letter_only" };
    case "save_job":
    case "unsave_job":
    case "tailor_resume":
    case "generate_evidence":
    case "add_evidence":
      return { step: "digest", listingId: pending.listingId };
    case "download_docx":
    case "download_pdf":
    case "copy_tailored_text":
    case "download_cover_letter_docx":
    case "download_cover_letter_pdf":
    case "copy_cover_letter_text":
      return { step: "digest", notice: "regenerate_export" };
    case "generate_cover_letter":
      return { step: "digest", notice: "regenerate_cover_letter" };
    default:
      return { step: "digest" };
  }
}
