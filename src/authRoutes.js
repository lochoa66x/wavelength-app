export const APP_PATH = "/app";
export const SIGN_IN_PATH = "/sign-in";
export const AUTH_CALLBACK_PATH = "/auth/callback";

export function safeNextPath(value, fallback = APP_PATH) {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim();
  if (
    !candidate.startsWith("/")
    || candidate.startsWith("//")
    || candidate.includes("\\")
    || candidate.length > 500
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://app.invalid");
    if (parsed.origin !== "https://app.invalid") return fallback;

    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (parsed.pathname !== APP_PATH && !parsed.pathname.startsWith(`${APP_PATH}/`)) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

export function resolveAuthCallbackState({ loading, session, callbackError, authError } = {}) {
  if (loading) return { status: "checking", next: null };
  if (session?.user?.id) return { status: "authenticated", next: APP_PATH };
  return {
    status: "failed",
    next: SIGN_IN_PATH,
    reason: callbackError || authError ? "invalid_or_expired" : "missing_session",
  };
}

export function buildAuthRedirectUrl(origin, nextPath = APP_PATH) {
  const redirectUrl = new URL(AUTH_CALLBACK_PATH, origin);
  redirectUrl.searchParams.set("next", safeNextPath(nextPath));
  return redirectUrl.toString();
}
