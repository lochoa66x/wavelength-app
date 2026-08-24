const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { width: 8.5in; min-height: 11in; margin: 0; padding: 0; background: #fff; }
  body { color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  main { width: 8.5in; min-height: 11in; margin: 0 auto; }
  [data-resume-preview] {
    width: 100% !important;
    min-height: 11in;
    margin: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  [data-resume-preview] p,
  [data-resume-preview] li { orphans: 2; widows: 2; }
  [data-resume-preview] li { break-inside: avoid; page-break-inside: avoid; }
  @page { size: Letter; margin: 0; }
  @media print {
    html, body, main { width: 8.5in; }
  }
`;

function escapeHtml(value) {
  return String(value || "Tailored resume")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createResumePrintDocument(previewMarkup, title = "Tailored resume") {
  const markup = String(previewMarkup || "").trim();
  if (!markup) throw new Error("The résumé preview is unavailable for PDF export.");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <main aria-label="ATS-safe résumé">${markup}</main>
  </body>
</html>`;
}

export async function printResumePdf(previewElement, title = "Tailored resume", documentRef = globalThis.document) {
  if (!previewElement?.outerHTML) throw new Error("The résumé preview is unavailable for PDF export.");
  if (!documentRef?.body?.appendChild) throw new Error("PDF export requires a browser window.");

  const frame = documentRef.createElement("iframe");
  frame.title = "Résumé PDF export";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });

  const loaded = new Promise((resolve, reject) => {
    frame.addEventListener("load", resolve, { once: true });
    frame.addEventListener("error", () => reject(new Error("The PDF print preview could not be prepared.")), { once: true });
  });
  frame.srcdoc = createResumePrintDocument(previewElement.outerHTML, title);
  documentRef.body.appendChild(frame);
  await loaded;

  const printWindow = frame.contentWindow;
  if (!printWindow) {
    frame.remove();
    throw new Error("The PDF print preview could not be opened.");
  }

  try {
    await frame.contentDocument?.fonts?.ready;
  } catch {
    // System font fallbacks are intentionally safe for ATS-readable output.
  }

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    frame.remove();
  };
  printWindow.addEventListener("afterprint", cleanup, { once: true });
  globalThis.setTimeout?.(cleanup, 120_000);
  printWindow.focus();
  printWindow.print();
}
