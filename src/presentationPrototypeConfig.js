export function presentationPrototypesEnabled(env = import.meta.env ?? {}) {
  return String(env?.VITE_PRESENTATION_PROTOTYPES_ENABLED || "").trim().toLowerCase() === "true";
}

export const PRESENTATION_PROTOTYPES_ENABLED = presentationPrototypesEnabled();
