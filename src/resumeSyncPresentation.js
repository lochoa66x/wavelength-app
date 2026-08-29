export function resumeSyncWorkspaceStatus(phase, hasLocalResume) {
  if (phase === "synced") return { label: "On", emphasis: "success" };
  if (phase === "pending") return { label: "Sync pending", emphasis: "warning" };
  if (phase === "conflict") return { label: "Review copies", emphasis: "warning" };
  if (phase === "remote_available") {
    return { label: hasLocalResume ? "Review copies" : "Restore", emphasis: "action" };
  }
  if (["offline", "error", "unavailable"].includes(phase)) {
    return { label: "Needs attention", emphasis: "warning" };
  }
  if (["local_only", "sync_ready"].includes(phase)) {
    return { label: hasLocalResume ? "This device only" : "Not activated", emphasis: "action" };
  }
  return { label: "Checking…", emphasis: "neutral" };
}
