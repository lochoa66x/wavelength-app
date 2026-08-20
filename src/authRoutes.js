export const APP_PATH = "/app";
export const SIGN_IN_PATH = "/sign-in";
export const AUTH_CALLBACK_PATH = "/auth/callback";

export function safeNextPath(value, fallback = APP_PATH) {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://app.invalid");
    if (parsed.origin !== "https://app.invalid") return fallback;

    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (parsed.pathname === SIGN_IN_PATH || parsed.pathname === AUTH_CALLBACK_PATH) {
      return fallback;
    }
    return path;
  } catch {
    return fallback;
  }
}

export function buildAuthRedirectUrl(origin, nextPath = APP_PATH) {
  const redirectUrl = new URL(AUTH_CALLBACK_PATH, origin);
  redirectUrl.searchParams.set("next", safeNextPath(nextPath));
  return redirectUrl.toString();
}
