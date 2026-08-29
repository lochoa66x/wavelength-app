export const RESUME_IMPORT_MAX_BYTES = 12_000_000;
export const RESUME_IMPORT_MAX_IMAGES = 8;
export const RESUME_IMPORT_MAX_TEXT_CHARS = 60_000;

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_TYPE = "application/pdf";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function resumeImportKind(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  if (type === DOCX_TYPE || name.endsWith(".docx")) return "docx";
  if (type === PDF_TYPE || name.endsWith(".pdf")) return "pdf";
  if (IMAGE_TYPES.has(type) || /\.(jpe?g|png|webp)$/.test(name)) return "photo";
  return "unsupported";
}

export function validateResumeImportFile(file) {
  if (!file) return { ok: false, error: "Choose a résumé file or photo." };
  if (file.size > RESUME_IMPORT_MAX_BYTES) return { ok: false, error: "Keep each résumé file under 12 MB." };
  const kind = resumeImportKind(file);
  if (kind === "unsupported") return { ok: false, error: "Use a DOCX, PDF, JPG, PNG, or WebP file." };
  return { ok: true, kind };
}

export function normalizeExtractedResumeText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, RESUME_IMPORT_MAX_TEXT_CHARS);
}

export async function extractDocxResume(file, { mammothLoader = () => import("mammoth") } = {}) {
  const validation = validateResumeImportFile(file);
  if (!validation.ok || validation.kind !== "docx") throw new Error(validation.error || "Choose a DOCX file.");
  const mammoth = await mammothLoader();
  const arrayBuffer = await file.arrayBuffer();
  const input = typeof window === "undefined" && typeof globalThis.Buffer?.from === "function"
    ? { buffer: globalThis.Buffer.from(arrayBuffer) }
    : { arrayBuffer };
  const result = await mammoth.extractRawText(input);
  const text = normalizeExtractedResumeText(result.value);
  if (text.length < 40) throw new Error("Gigscapes could not find enough résumé text in that DOCX file.");
  return {
    text,
    source: "docx",
    warnings: (result.messages || []).map((message) => String(message.message || "")).filter(Boolean).slice(0, 3),
  };
}

export async function extractPdfResume(file, { pdfLoader = () => import("pdfjs-dist/legacy/build/pdf.mjs") } = {}) {
  const validation = validateResumeImportFile(file);
  if (!validation.ok || validation.kind !== "pdf") throw new Error(validation.error || "Choose a PDF file.");
  const pdfjs = await pdfLoader();
  if (typeof window !== "undefined" && pdfjs.GlobalWorkerOptions) {
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  }
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useWorkerFetch: false, isEvalSupported: false }).promise;
  const pages = [];
  const pageDocuments = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    pageDocuments.push(page);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => String(item.str || "")).join(" "));
  }
  const text = normalizeExtractedResumeText(pages.join("\n\n"));
  const needsOcr = text.length < Math.max(40, pdf.numPages * 20);
  const ocrImages = [];
  if (needsOcr && typeof document !== "undefined") {
    if (pdf.numPages > RESUME_IMPORT_MAX_IMAGES) throw new Error(`Scanned PDFs can contain up to ${RESUME_IMPORT_MAX_IMAGES} pages.`);
    for (const page of pageDocuments) {
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 1800 / Math.max(baseViewport.width, baseViewport.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      ocrImages.push(canvas.toDataURL("image/jpeg", 0.84));
    }
  }
  return {
    text,
    source: "pdf",
    pageCount: pdf.numPages,
    needsOcr,
    ocrImages,
    warnings: needsOcr
      ? ["This PDF appears scanned or image-based. Gigscapes can read its rendered pages after the privacy notice."]
      : [],
  };
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("One of the résumé images could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("One of the résumé images is not a readable image."));
      image.onload = () => resolve(image);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function compressResumeImage(file) {
  const validation = validateResumeImportFile(file);
  if (!validation.ok || validation.kind !== "photo") throw new Error(validation.error || "Choose a résumé photo.");
  const image = await readImage(file);
  const scale = Math.min(1, 1500 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.76);
}

export function resumeImportStatusCopy({ source, savedValue, draftValue }) {
  if (!source) return "Paste or import a résumé. Nothing is saved until you review it and press Save résumé.";
  const replacing = Boolean(String(savedValue || "").trim()) && String(savedValue || "").trim() !== String(draftValue || "").trim();
  return `${source.toUpperCase()} extraction ready for review. ${replacing ? "Your currently saved résumé is unchanged until you save this replacement." : "Review the text before saving."}`;
}
