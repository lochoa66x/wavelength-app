export async function migrateCloudResume({
  userId,
  cloudResume,
  loadResume,
  saveResume,
  clearCloudResume,
}) {
  const cloudText = typeof cloudResume === "string" ? cloudResume.trim() : "";
  if (!userId || !cloudText) return { status: "nothing_to_migrate", resume: "" };

  const existingLocal = loadResume(userId).trim();
  if (existingLocal && existingLocal !== cloudText) {
    return { status: "conflict", resume: existingLocal };
  }

  if (!existingLocal && !saveResume(userId, cloudText)) {
    return { status: "local_save_failed", resume: "" };
  }

  try {
    await clearCloudResume();
    return { status: "migrated", resume: existingLocal || cloudText };
  } catch {
    return { status: "cloud_cleanup_failed", resume: existingLocal || cloudText };
  }
}
