export function resumeSyncEnabled(env = import.meta.env ?? {}) {
  return env.VITE_RESUME_SYNC_ENABLED === "true";
}

export const RESUME_SYNC_ENABLED = resumeSyncEnabled();
