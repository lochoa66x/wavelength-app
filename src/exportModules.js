export function createExportModuleLoader(importer) {
  let modulePromise;

  const load = () => {
    modulePromise ||= Promise.resolve()
      .then(importer)
      .catch((error) => {
        modulePromise = undefined;
        throw error;
      });
    return modulePromise;
  };

  load.preload = async () => {
    try {
      await load();
      return { status: "ready", error: null };
    } catch (error) {
      return { status: "failed", error };
    }
  };

  return load;
}

export const loadResumeDocxExporter = createExportModuleLoader(async () => {
  const module = await import("./resumeDocx.js");
  await module.prepareResumeDocxExport();
  return module;
});

export const loadResumePdfExporter = createExportModuleLoader(async () => {
  const module = await import("./resumePdf.js");
  await module.prepareResumePdfExport();
  return module;
});

export const loadCoverLetterDocxExporter = createExportModuleLoader(async () => {
  const module = await import("./coverLetterDocx.js");
  await module.prepareCoverLetterDocxExport();
  return module;
});

export const loadCoverLetterPdfExporter = createExportModuleLoader(async () => {
  const module = await import("./coverLetterPdf.js");
  await module.prepareCoverLetterPdfExport();
  return module;
});

export function preloadResumeExporters() {
  return Promise.all([
    loadResumeDocxExporter.preload(),
    loadResumePdfExporter.preload(),
  ]);
}

export function preloadCoverLetterExporters() {
  return Promise.all([
    loadCoverLetterDocxExporter.preload(),
    loadCoverLetterPdfExporter.preload(),
  ]);
}
