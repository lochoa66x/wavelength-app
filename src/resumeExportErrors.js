import { classifyExportError, createExportErrorNotice } from "./exportRecovery.js";

export const classifyDocxExportError = classifyExportError;

export function docxExportErrorMessage(error) {
  return createExportErrorNotice(error, { artifact: "résumé", format: "DOCX" }).text;
}
