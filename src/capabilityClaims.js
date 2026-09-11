export const CAPABILITY_LEVELS = Object.freeze([
  { id: "knowledge", label: "I understand this area" },
  { id: "applied", label: "I have applied it in practice" },
  { id: "led", label: "I have led or owned this work" },
]);

export function capabilityLevel(record = {}) {
  return CAPABILITY_LEVELS.some(({ id }) => id === record.capability_level) ? record.capability_level : "unspecified";
}

export function capabilityStatement(record = {}) {
  const requirement = String(record.requirement || "").replace(/\s+/g, " ").replace(/[.!]+$/, "").trim();
  if (!requirement) return "";
  // An imperative posting phrase stays quoted as the subject of the confirmation,
  // not a first-person assertion that the candidate completed the entire project.
  const prefix = { knowledge: "I have knowledge of this area", applied: "I have hands-on experience in this area", led: "I have led or owned work in this area", unspecified: "I have a capability in this area; my experience level is not specified" }[capabilityLevel(record)];
  return `${prefix}: ${requirement}.`;
}

export function isGeneratedCapabilityStatement(answer, record = {}) {
  const text = String(answer || "").replace(/\s+/g, " ").trim();
  return ["knowledge", "applied", "led", "unspecified"]
    .some((capability_level) => text === capabilityStatement({ ...record, capability_level }))
    || text === `I have this capability: ${String(record.requirement || "").replace(/\s+/g, " ").replace(/[.!]+$/, "").trim()}.`;
}
