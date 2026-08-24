import { APP_PATH } from "./authRoutes.js";

export const PUBLIC_APP_CAPABILITIES = Object.freeze([
  "browse_listings",
  "search_listings",
  "filter_country",
  "filter_region",
  "filter_city",
  "filter_workplace",
  "load_more_listings",
  "open_public_listing",
  "read_source_attribution",
  "store_guest_preferences",
]);

export const ACCOUNT_CAPABILITIES = Object.freeze([
  "save_jobs",
  "edit_resume",
  "import_posting",
  "tailor_resume",
  "generate_evidence",
  "download_exports",
  "copy_tailored_text",
  "view_workspace",
]);

export function appRouteAccess(pathname) {
  return pathname === APP_PATH || pathname.startsWith(`${APP_PATH}/`)
    ? "public"
    : "unknown";
}

export function shouldLoadPrivateProfile(session) {
  return Boolean(session?.user?.id);
}

export function stepAfterSignOut() {
  return "digest";
}
