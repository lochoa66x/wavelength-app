import { APP_PATH } from "../authRoutes.js";
import { isAccountAction } from "../accountActions.js";

export const LANDING_INTENT_STATE_KEY = "gigscapesAccountAction";

export const LANDING_DESTINATIONS = Object.freeze({
  browse: Object.freeze({ path: APP_PATH, action: null }),
  postingUrl: Object.freeze({ path: APP_PATH, action: "import_posting" }),
  postingScreenshots: Object.freeze({ path: APP_PATH, action: "upload_posting_screenshots" }),
  postingText: Object.freeze({ path: APP_PATH, action: "paste_posting" }),
});

const LANDING_INTAKE_ACTIONS = new Set(
  Object.values(LANDING_DESTINATIONS)
    .map(({ action }) => action)
    .filter(Boolean),
);

export function buildLandingNavigationState(action) {
  if (!LANDING_INTAKE_ACTIONS.has(action) || !isAccountAction(action)) return null;
  return Object.freeze({ [LANDING_INTENT_STATE_KEY]: action });
}

export function landingAccountActionFromState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const action = state[LANDING_INTENT_STATE_KEY];
  return LANDING_INTAKE_ACTIONS.has(action) && isAccountAction(action) ? action : null;
}
