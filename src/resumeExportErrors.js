export function classifyDocxExportError(error) {
  const detail = String(error?.message || error || "");
  if (/dynamically imported module|importing a module script failed|chunkload|loading chunk|failed to fetch/i.test(detail)) {
    return "stale_exporter";
  }
  if (/candidate name|identity|authorization|content hash|render plan|trusted résumé export context|schema version/i.test(detail)) {
    return "invalid_content";
  }
  if (/blob|createobjecturl|download|object url/i.test(detail)) return "browser_download";
  if (/serialize|packer|docx|paragraph|textrun|unsupported structured/i.test(detail)) return "serialization";
  return "unknown";
}

export function docxExportErrorMessage(error) {
  switch (classifyDocxExportError(error)) {
    case "stale_exporter":
      return "Gigscapes was updated while this draft was open, so its DOCX exporter is stale. Refresh the page, regenerate the draft, and download it again.";
    case "invalid_content":
      return "This draft no longer matches its verified export state. Review the résumé and posting, then try the download again.";
    case "browser_download":
      return "The DOCX was prepared, but this browser could not start the download. Check download permissions and try again.";
    case "serialization":
      return "The DOCX generator found content it could not serialize safely. Your draft is unchanged; review the résumé and retry.";
    default:
      return "The DOCX could not be created. Your draft is unchanged; try the download again or copy the tailored text.";
  }
}
