export function classifyExportError(error) {
  const detail = `${error?.name || ""} ${error?.message || error || ""}`;
  if (/dynamically imported module|importing a module script failed|chunkload|loading chunk|failed to fetch/i.test(detail)) {
    return "stale_exporter";
  }
  if (/candidate name|identity|authorization|content hash|render plan|trusted (?:résumé|resume|cover-letter) export context|schema version/i.test(detail)) {
    return "invalid_content";
  }
  if (/blob|createobjecturl|download|object url/i.test(detail)) return "browser_download";
  if (/serialize|packer|docx|paragraph|textrun|jspdf|unsupported structured/i.test(detail)) return "serialization";
  return "unknown";
}

function staleExporterText(artifact, format) {
  if (artifact === "cover letter") {
    return `Gigscapes was updated while this cover letter was open, so its ${format} exporter is out of date. Your saved résumé and browser-saved cover-letter draft are safe. Refresh Gigscapes, then try the download again.`;
  }
  return `Gigscapes was updated while this tailored résumé was open, so its ${format} exporter is out of date. Your saved base résumé is safe. To preserve this tailored wording, copy it before refreshing. Then refresh Gigscapes, regenerate the draft, and try the download again.`;
}

export function createExportErrorNotice(error, { artifact = "résumé", format = "file" } = {}) {
  const category = classifyExportError(error);
  const normalizedFormat = String(format || "file").toUpperCase();
  let text;

  switch (category) {
    case "stale_exporter":
      text = staleExporterText(artifact, normalizedFormat);
      break;
    case "invalid_content":
      text = `This ${artifact} no longer matches its verified export state. Review the résumé and job posting, regenerate the draft, and try the ${normalizedFormat} download again.`;
      break;
    case "browser_download":
      text = `The ${normalizedFormat} was prepared, but this browser could not start the download. Check its download permissions and try again.`;
      break;
    case "serialization":
      text = `The ${normalizedFormat} generator found content it could not serialize safely. Your draft is unchanged; review it and try again.`;
      break;
    default:
      text = `The ${normalizedFormat} could not be created. Your draft is unchanged; try again or copy the ${artifact} text.`;
  }

  return {
    type: "error",
    category,
    refreshRequired: category === "stale_exporter",
    text,
  };
}
