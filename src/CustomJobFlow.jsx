import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, FileImage, Link2, Loader2, Pencil, Sparkles, Text, Upload, X } from "lucide-react";

import { AtsReview } from "./AtsReview.jsx";
import { EvidenceRefinementPanel } from "./EvidenceRefinementPanel.jsx";
import { PositioningSummary } from "./PositioningSummary.jsx";
import { ResumeExperience } from "./ResumeExperience.jsx";
import { ApplicationPackageSummary } from "./ApplicationPackageSummary.jsx";
import { ApplicationWorkflowChooser } from "./ApplicationWorkflowChooser.jsx";
import { CoverLetterWorkspace } from "./CoverLetterWorkspace.jsx";
import { createApplicationPresentation } from "./applicationPresentation.js";
import { createApplicationPackageState } from "./applicationPackageModel.js";
import { saveApplicationPackageState } from "./applicationPackageStorage.js";
import { resumeIdentityFromText } from "./resumeIdentity.js";
import { analyzeResumeForApplication, extractCustomJob, tailorResume } from "./tailorClient.js";
import {
  appendScreenshotFiles,
  customJobSourceReviewState,
  MAX_SCREENSHOTS,
  mergeExtractedJobBriefs,
  screenshotBatches,
  sourceConflictFieldLabel,
} from "./customJobIntake.js";
import {
  candidateEvidenceForRequest,
  customEvidenceTargetKey,
  loadCandidateEvidence,
  loadReusableCandidateEvidence,
  mergeReusableCandidateEvidence,
  saveCandidateEvidence,
  saveReusableCandidateEvidence,
} from "./candidateEvidenceStorage.js";
import { submittableCandidateEvidence } from "./evidenceRefinement.js";
import { createCustomJobRequestCoordinator } from "./customJobSession.js";
import { buildQualitySignal } from "./qualitySignalContract.js";
import { durationBand, emitQualitySignal, emitResumeQualitySignal, postingSourceForMode } from "./qualitySignals.js";
import { applyTailoringChangeDecision, reviewAfterTailoringChange } from "./tailoringChanges.js";

const CATEGORY_OPTIONS = [
  ["tech", "Technology & IT"], ["design", "Design"], ["writing", "Writing & content"],
  ["marketing", "Marketing"], ["sales", "Sales"], ["admin", "Administration"],
  ["customer_service", "Customer service"], ["business", "Business & management"],
  ["finance", "Finance & accounting"], ["trades", "Skilled trades"],
  ["home_services", "Home & outdoor services"], ["logistics", "Logistics & labour"],
  ["hospitality", "Hospitality & retail"], ["care", "Care & education"], ["other", "Other"],
];

const MODES = [
  { id: "url", label: "Job URL", icon: Link2, hint: "Public HTTPS page" },
  { id: "screenshots", label: "Screenshots", icon: FileImage, hint: `Up to ${MAX_SCREENSHOTS} pages` },
  { id: "paste", label: "Paste posting", icon: Text, hint: "Most reliable" },
];

const MODE_IDS = new Set(MODES.map(({ id }) => id));

function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function compressScreenshot(file) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > 10_000_000) throw new Error(`${file.name} is larger than 10 MB.`);

  const originalUrl = await imageToDataUrl(file);
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error(`Could not decode ${file.name}.`));
    element.src = originalUrl;
  });
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error(`Could not prepare ${file.name}.`);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.74);
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6, color: "#6E6E73", fontSize: 12, fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}

export function CustomJobFlow({
  resume,
  userId,
  C,
  primaryBtnStyle,
  glassBtnStyle,
  onBack,
  onEditResume,
  initialMode = "url",
  initialUrl = "",
  initialDocumentIntent = "resume_only",
  extractPosting = extractCustomJob,
  tailorPosting = tailorResume,
  requestAccountAction,
  requestPrivateProcessing = (_scope, action) => action(),
}) {
  const requestCoordinatorRef = useRef(null);
  requestCoordinatorRef.current ||= createCustomJobRequestCoordinator(initialMode);
  const requestCoordinator = requestCoordinatorRef.current;
  const [mode, setMode] = useState(() => MODE_IDS.has(initialMode) ? initialMode : "url");
  const [documentIntent, setDocumentIntent] = useState(initialDocumentIntent);
  const [postingText, setPostingText] = useState("");
  const [jobUrl, setJobUrl] = useState(initialUrl);
  const [files, setFiles] = useState([]);
  const [brief, setBrief] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [tailored, setTailored] = useState(null);
  const [evidenceTargetKey, setEvidenceTargetKey] = useState(null);
  const [evidenceRecords, setEvidenceRecords] = useState([]);
  const [evidenceStorageError, setEvidenceStorageError] = useState("");
  const [sourceSession, setSourceSession] = useState(() => requestCoordinator.snapshot());
  const [coverLetterStatus, setCoverLetterStatus] = useState("not_created");
  const coverLetterRef = useRef(null);
  const applicationPresentation = useMemo(() => createApplicationPresentation(), []);
  const sourceReview = brief?.source_review;
  const {
    conflicts: sourceConflicts,
    isScreenshotReview,
    needsScreenshotConfirmation,
    showSourceReviewPanel,
    blocked: sourceReviewBlocked,
    blockingMessage: sourceReviewBlockingMessage,
  } = customJobSourceReviewState(sourceReview);

  const fieldStyle = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 11, padding: "10px 12px",
    background: C.bgCard, color: C.text, fontSize: 14, fontFamily: "inherit",
  };

  const backButtonStyle = {
    ...glassBtnStyle(),
    display: "inline-flex",
    justifyContent: "center",
    gap: 7,
    minHeight: 40,
    padding: "9px 13px 9px 11px",
    marginBottom: 20,
    border: `1px solid ${C.border}`,
    background: C.bgCard,
    color: C.textSub,
    fontSize: 13,
    lineHeight: 1,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
  };

  useEffect(() => () => requestCoordinator.dispose(), [requestCoordinator]);

  const resetSourceState = (nextMode = mode, nextUrl = "") => {
    setSourceSession(requestCoordinator.beginSource(nextMode));
    setMode(nextMode);
    setPostingText("");
    setJobUrl(nextUrl);
    setFiles([]);
    setBrief(null);
    setTailored(null);
    setEvidenceTargetKey(null);
    setEvidenceRecords([]);
    setEvidenceStorageError("");
    setCoverLetterStatus("not_created");
    setError("");
    setStatus("idle");
  };

  const leaveFlow = () => {
    requestCoordinator.beginSource(mode);
    onBack();
  };

  const performExtract = async () => {
    const startedAt = Date.now();
    const request = requestCoordinator.beginRequest("extract");
    setStatus("extracting");
    setError("");
    try {
      let extracted;
      if (mode === "screenshots") {
        const batches = screenshotBatches(files);
        const batchBriefs = await Promise.all(batches.map(async (batch) => extractPosting({
          mode,
          images: await Promise.all(batch.map(compressScreenshot)),
        }, { signal: request.signal })));
        extracted = mergeExtractedJobBriefs(batchBriefs, { pageCount: files.length });
      } else {
        const payload = mode === "paste" ? { mode, text: postingText } : { mode, url: jobUrl };
        extracted = await extractPosting(payload, { signal: request.signal });
      }
      if (!requestCoordinator.isCurrent(request)) return;
      requestCoordinator.finish(request);
      setBrief(extracted);
      const targetKey = customEvidenceTargetKey(extracted);
      setEvidenceTargetKey(targetKey);
      setEvidenceRecords(loadCandidateEvidence(userId, targetKey));
      setEvidenceStorageError("");
      setStatus("review");
      void emitQualitySignal(buildQualitySignal("posting_review_completed", {
        route: "custom_job",
        postingSource: postingSourceForMode(mode),
        outcome: "completed",
        durationBand: durationBand(Date.now() - startedAt),
      }));
    } catch (extractError) {
      if (!requestCoordinator.isCurrent(request) || request.signal.aborted) return;
      requestCoordinator.finish(request);
      setError(extractError.message);
      setStatus("idle");
    }
  };

  const updateBrief = (patch) => setBrief((current) => ({ ...current, ...patch }));
  const updateSourceReview = (patch) => setBrief((current) => ({
    ...current,
    source_review: { ...current.source_review, ...patch },
  }));
  const handleScreenshotSelection = (event) => {
    const selected = Array.from(event.target.files || []);
    const next = appendScreenshotFiles(files, selected);
    if (next.length < files.length + selected.length) {
      setError(`Gigscapes kept ${next.length} unique pages. The limit is ${MAX_SCREENSHOTS}; duplicate files are ignored.`);
    } else {
      setError("");
    }
    setFiles(next);
    event.target.value = "";
  };

  const handleExtract = () => requestPrivateProcessing("intake", performExtract);
  const listValue = (key) => (brief?.[key] || []).join("\n");
  const updateList = (key, value) => updateBrief({ [key]: value.split("\n").map((item) => item.trim()).filter(Boolean) });

  const performTailor = async (evidenceOverride = evidenceRecords, requestedIntent = documentIntent) => {
    if (!resume) {
      setError("Add your base résumé before tailoring this posting.");
      return;
    }
    const request = requestCoordinator.beginRequest("tailor");
    const startedAt = Date.now();
    const activeBrief = brief;
    setStatus("tailoring");
    setError("");
    const previous = tailored;
    try {
      const candidateEvidence = candidateEvidenceForRequest(
        submittableCandidateEvidence(evidenceOverride),
        submittableCandidateEvidence(loadReusableCandidateEvidence(userId)),
      );
      const target = { customJob: activeBrief, candidateEvidence };
      const result = requestedIntent === "cover_letter_only"
        ? await analyzeResumeForApplication(resume, target, { signal: request.signal })
        : await tailorPosting(resume, target, { signal: request.signal });
      if (!requestCoordinator.isCurrent(request)) return;
      requestCoordinator.finish(request);
      setTailored({
        ...result,
        documentIntent: requestedIntent,
        baselineAtsReview: result.atsReview,
        baselineCoverage: previous?.baselineCoverage || previous?.atsReview?.coverage || result.atsReview?.coverage,
        previousCoverage: previous?.atsReview?.coverage || null,
      });
      setStatus("done");
      if (requestedIntent !== "cover_letter_only") {
        void emitResumeQualitySignal("tailoring_completed", {
          resumeData: result.resume,
          item: customItem,
          atsReview: result.atsReview,
          route: "custom_job",
          postingSource: postingSourceForMode(mode),
          outcome: "completed",
          durationMs: Date.now() - startedAt,
        });
      }
    } catch (tailorError) {
      if (!requestCoordinator.isCurrent(request) || request.signal.aborted) return;
      requestCoordinator.finish(request);
      setError(tailorError.message);
      setStatus("review");
      void emitQualitySignal(buildQualitySignal("tailoring_blocked", {
        route: "custom_job",
        postingSource: postingSourceForMode(mode),
        outcome: "failed",
        errorCategory: "unknown",
        durationBand: durationBand(Date.now() - startedAt),
      }));
    }
  };

  const handleTailor = (evidenceOverride = evidenceRecords, requestedIntent = documentIntent) => requestPrivateProcessing(
    "tailor",
    () => performTailor(evidenceOverride, requestedIntent),
  );

  const handleCoverLetterStatus = useCallback(({ status: nextStatus }) => {
    setCoverLetterStatus((current) => current === nextStatus ? current : nextStatus);
  }, []);

  const addTailoredResume = () => {
    setDocumentIntent("package");
    handleTailor(evidenceRecords, "package");
  };

  const cancelActiveWork = () => {
    setSourceSession(requestCoordinator.cancelActiveRequest());
    setStatus(brief ? (tailored ? "done" : "review") : "idle");
    setError("Cancelled. Your current posting input is still available.");
  };

  const handleTailoringChangeDecision = (change, decision) => {
    setTailored((current) => {
      if (!current?.resume) return current;
      const resumeResult = applyTailoringChangeDecision(current.resume, change, decision);
      const baselineAtsReview = current.baselineAtsReview || current.atsReview;
      return {
        ...current,
        resume: resumeResult,
        baselineAtsReview,
        atsReview: reviewAfterTailoringChange(baselineAtsReview, resumeResult),
      };
    });
  };

  const handleEvidenceRetailor = async ({ records, candidateEvidence }) => {
    const applicationSaved = saveCandidateEvidence(userId, evidenceTargetKey, records);
    const answeredIds = new Set(records.map((record) => record?.id).filter(Boolean));
    const retainedReusable = loadReusableCandidateEvidence(userId)
      .filter((record) => !answeredIds.has(record?.id));
    const reusableSaved = saveReusableCandidateEvidence(userId, mergeReusableCandidateEvidence(
      retainedReusable,
      candidateEvidence.filter((record) => record.scope === "profile"),
    ));
    const storageMessage = applicationSaved && reusableSaved
      ? ""
      : "These answers will be used for this run, but your browser blocked saving one or more of them locally.";

    setEvidenceRecords(records);
    setEvidenceStorageError("");
    await handleTailor(records);
    setEvidenceStorageError(storageMessage);
  };

  const customItem = useMemo(() => brief ? {
    title: brief.title,
    company: brief.company || "Candidate-provided posting",
    location: brief.location || "",
    category: brief.category,
    url: brief.source_url || "",
  } : null, [brief]);
  const coverLetterOnlyPackage = useMemo(() => tailored?.documentIntent === "cover_letter_only" && customItem
    ? createApplicationPackageState({
        item: customItem,
        intent: "cover_letter_only",
        resumeStatus: "not_created",
        coverLetterStatus,
        sourceFingerprint: tailored.tailoringAnalysis?.requirement_consistency?.canonical_hash || "",
      })
    : null, [coverLetterStatus, customItem, tailored]);

  useEffect(() => {
    if (userId && coverLetterOnlyPackage) saveApplicationPackageState(userId, coverLetterOnlyPackage);
  }, [coverLetterOnlyPackage, userId]);
  if (!resume) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button type="button" onClick={onBack} aria-label="Back to job matches" className="wl-btn" style={backButtonStyle}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to matches</span>
        </button>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: C.green, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 5 }}>Bring your own job</div>
          <h2 style={{ color: C.text, fontSize: 26, margin: "0 0 8px" }}>Add your base résumé first</h2>
          <p style={{ color: C.textSub, fontSize: 14, lineHeight: 1.55, margin: 0 }}>It stays in this browser. Once it is saved, you can paste a posting, share a public job link, or upload screenshots.</p>
        </div>
        <button type="button" onClick={onEditResume} className="wl-btn" style={primaryBtnStyle(false)}><Pencil size={14} /> Add my résumé</button>
      </div>
    );
  }

  return (
    <div data-custom-job-source={sourceSession.sourceId} data-custom-job-mode={sourceSession.mode} data-custom-job-status={status} style={{ maxWidth: 760, margin: "0 auto" }}>
      <button type="button" onClick={leaveFlow} aria-label="Back to job matches" className="wl-btn" style={backButtonStyle}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to matches</span>
      </button>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.green, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 5 }}>Bring your own job</div>
        <h2 style={{ color: C.text, fontSize: 26, margin: "0 0 8px" }}>Prepare documents for a posting you found</h2>
        <p style={{ color: C.textSub, fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          Choose the documents you need, then paste the posting, share its public link, or upload screenshots. You review the extracted facts before Gigscapes prepares anything.
        </p>
      </div>

      {!brief ? (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
          <ApplicationWorkflowChooser value={documentIntent} onChange={setDocumentIntent} disabled={status === "extracting"} C={C} />
        </div>
      ) : null}

      {!brief && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
          <div role="tablist" aria-label="Posting input method" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
            {MODES.map(({ id, label, icon: Icon, hint }) => {
              const active = mode === id;
              return (
                <button key={id} type="button" role="tab" aria-selected={active} onClick={() => { if (!active) resetSourceState(id); else setError(""); }} className="wl-btn" style={{ border: `1px solid ${active ? C.text : C.border}`, background: active ? "#F0EFEE" : C.bgCard, borderRadius: 12, padding: "10px 8px", color: C.text, cursor: "pointer", display: "grid", justifyItems: "center", gap: 3 }}>
                  <Icon size={16} color={active ? C.green : C.textSub} />
                  <span style={{ fontSize: 12.5, fontWeight: 650 }}>{label}</span>
                  <span style={{ color: C.textFaint, fontSize: 10.5 }}>{hint}</span>
                </button>
              );
            })}
          </div>

          {mode === "paste" && (
            <Field label="Full job posting">
              <textarea value={postingText} onChange={(event) => setPostingText(event.target.value)} rows={14} placeholder="Paste the title, responsibilities, requirements, and company details…" style={{ ...fieldStyle, resize: "vertical" }} />
            </Field>
          )}
          {mode === "url" && (
            <>
              <Field label="Public HTTPS job URL">
                <input type="url" value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="https://company.com/careers/job" style={fieldStyle} />
              </Field>
              <p style={{ color: C.textFaint, fontSize: 12, lineHeight: 1.5, margin: "10px 0 0" }}>Some career sites block automated reading. If that happens, paste the posting or use screenshots.</p>
            </>
          )}
          {mode === "screenshots" && (
            <div>
              <label style={{ display: "grid", justifyItems: "center", gap: 8, border: `1px dashed ${C.border}`, borderRadius: 14, padding: "28px 16px", color: C.textSub, cursor: "pointer" }}>
                <Upload size={22} color={C.green} />
                <strong style={{ color: C.text, fontSize: 14 }}>Add up to {MAX_SCREENSHOTS} posting pages</strong>
                <span style={{ fontSize: 12 }}>Include the final responsibilities and qualifications page · images are compressed before upload</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={handleScreenshotSelection} />
              </label>
              {files.length > 0 && (
                <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
                  <div style={{ color: C.textSub, fontSize: 12 }}>{files.length} / {MAX_SCREENSHOTS} pages selected</div>
                  {files.map((file, index) => (
                    <div key={`${file.name}-${file.size}-${file.lastModified}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 9px" }}>
                      <span style={{ color: C.textSub, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{index + 1}. {file.name}</span>
                      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="wl-btn" style={{ border: 0, background: "transparent", color: C.textSub, padding: 3, minHeight: 28 }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <>
              <p role="alert" style={{ color: C.red, fontSize: 13, margin: "12px 0 0" }}>{error}</p>
              {mode === "url" && (
                <div role="group" aria-label="Alternative posting inputs" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  <button type="button" onClick={() => resetSourceState("paste")} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, padding: "8px 11px" }}>
                    <Text size={14} /> Paste posting
                  </button>
                  <button type="button" onClick={() => resetSourceState("screenshots")} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, padding: "8px 11px" }}>
                    <FileImage size={14} /> Upload screenshots
                  </button>
                </div>
              )}
            </>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            <button type="button" onClick={handleExtract} disabled={status === "extracting" || (mode === "paste" ? postingText.trim().length < 80 : mode === "url" ? !jobUrl.trim() : files.length === 0)} className="wl-btn" style={primaryBtnStyle(status === "extracting")}>
              {status === "extracting" ? <Loader2 size={15} className="wl-spin" /> : <Sparkles size={15} />}
              {status === "extracting" ? "Reading the posting…" : "Extract posting details"}
            </button>
            {status === "extracting" ? <button type="button" onClick={cancelActiveWork} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, padding: "8px 11px" }}><X size={14} /> Cancel</button> : null}
          </div>
          <p style={{ color: C.textFaint, fontSize: 11.5, lineHeight: 1.45, margin: "12px 0 0" }}>Posting inputs are processed for this request and are not saved to your Gigscapes profile.</p>
        </div>
      )}

      {brief && status !== "done" && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ color: C.text, fontSize: 18, margin: "0 0 3px" }}>Review the extracted job</h3>
              <p style={{ color: C.textSub, fontSize: 12.5, margin: 0 }}>Correct anything the page reader or screenshot OCR misunderstood.</p>
            </div>
            <button type="button" onClick={() => resetSourceState(mode)} className="wl-btn" style={{ ...glassBtnStyle(), padding: "7px 10px", border: `1px solid ${C.border}` }}><Pencil size={12} /> Change source</button>
          </div>
          {showSourceReviewPanel && (
            <div style={{ border: `1px solid ${sourceReviewBlocked ? "#E5B567" : C.border}`, borderRadius: 13, background: sourceReviewBlocked ? "#FFF8EC" : C.bgCard, padding: 13, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <AlertTriangle size={17} color={sourceReviewBlocked ? "#B86A00" : C.green} style={{ flex: "0 0 auto", marginTop: 1 }} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: C.text, fontSize: 13 }}>{isScreenshotReview ? "Verify screenshot coverage" : "Review conflicting source details"}</strong>
                  <p style={{ color: C.textSub, fontSize: 12, lineHeight: 1.45, margin: "4px 0 0" }}>
                    {isScreenshotReview
                      ? <>{sourceReview.page_count || files.length} pages were reviewed. {sourceReview.completeness_notes || "Confirm that the final posting page was included before tailoring."}</>
                      : "The page reader found different values for the same posting detail. Review the source values, choose the accurate value below, then confirm it."}
                  </p>
                </div>
              </div>
              {sourceConflicts.length > 0 && (
                <div style={{ color: C.textSub, fontSize: 12, lineHeight: 1.45, margin: "10px 0 0 26px" }}>
                  {sourceConflicts.map((conflict) => <div key={conflict.field}><strong style={{ color: C.text }}>{sourceConflictFieldLabel(conflict.field)}:</strong> {conflict.values.join(" / ")}</div>)}
                </div>
              )}
              {isScreenshotReview && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: C.text, fontSize: 12.5, lineHeight: 1.45, margin: "11px 0 0 26px", cursor: "pointer" }}>
                  <input type="checkbox" checked={!needsScreenshotConfirmation} onChange={(event) => updateSourceReview({ user_confirmed_complete: event.target.checked })} style={{ marginTop: 2 }} />
                  I included the final page and reviewed the responsibilities and qualifications below.
                </label>
              )}
              {sourceConflicts.length > 0 && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: C.text, fontSize: 12.5, lineHeight: 1.45, margin: "8px 0 0 26px", cursor: "pointer" }}>
                  <input type="checkbox" checked={Boolean(sourceReview.conflicts_resolved)} onChange={(event) => updateSourceReview({ conflicts_resolved: event.target.checked })} style={{ marginTop: 2 }} />
                  I reviewed the source values and confirmed the editable fields.
                </label>
              )}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Field label="Job title"><input value={brief.title} onChange={(event) => updateBrief({ title: event.target.value })} style={fieldStyle} /></Field>
            <Field label="Company"><input value={brief.company} onChange={(event) => updateBrief({ company: event.target.value })} style={fieldStyle} /></Field>
            <Field label="Location"><input value={brief.location} onChange={(event) => updateBrief({ location: event.target.value })} style={fieldStyle} /></Field>
            <Field label="Employment type"><input value={brief.type} onChange={(event) => updateBrief({ type: event.target.value })} style={fieldStyle} /></Field>
            <Field label="Category">
              <select value={brief.category} onChange={(event) => updateBrief({ category: event.target.value })} style={fieldStyle}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </Field>
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <Field label="Role description"><textarea value={brief.description} onChange={(event) => updateBrief({ description: event.target.value })} rows={7} style={{ ...fieldStyle, resize: "vertical" }} /></Field>
            <Field label="Responsibilities · one per line"><textarea value={listValue("responsibilities")} onChange={(event) => updateList("responsibilities", event.target.value)} rows={5} style={{ ...fieldStyle, resize: "vertical" }} /></Field>
            <Field label="Required qualifications · one per line"><textarea value={listValue("required_qualifications")} onChange={(event) => updateList("required_qualifications", event.target.value)} rows={5} style={{ ...fieldStyle, resize: "vertical" }} /></Field>
            <Field label="Preferred qualifications · one per line"><textarea value={listValue("preferred_qualifications")} onChange={(event) => updateList("preferred_qualifications", event.target.value)} rows={4} style={{ ...fieldStyle, resize: "vertical" }} /></Field>
            <Field label="High-signal keywords · one per line"><textarea value={listValue("keywords")} onChange={(event) => updateList("keywords", event.target.value)} rows={4} style={{ ...fieldStyle, resize: "vertical" }} /></Field>
          </div>

          {error && <p role="alert" style={{ color: C.red, fontSize: 13, margin: "12px 0 0" }}>{error}</p>}
          {sourceReviewBlocked && <p style={{ color: "#9A5B00", fontSize: 12, lineHeight: 1.45, margin: "12px 0 0" }}>{sourceReviewBlockingMessage}</p>}
          <button type="button" onClick={() => handleTailor()} disabled={status === "tailoring" || sourceReviewBlocked || !brief.title.trim() || !brief.description.trim()} className="wl-btn" style={{ ...primaryBtnStyle(status === "tailoring" || sourceReviewBlocked), marginTop: 16 }}>
            {status === "tailoring" ? <Loader2 size={15} className="wl-spin" /> : <Sparkles size={15} />}
            {status === "tailoring"
              ? documentIntent === "cover_letter_only" ? "Analyzing evidence for your letter…" : "Tailoring and checking evidence…"
              : documentIntent === "cover_letter_only" ? "Analyze evidence for my letter" : documentIntent === "package" ? "Build my résumé first" : "Tailor my résumé"}
          </button>
          {status === "tailoring" ? <button type="button" onClick={cancelActiveWork} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, marginLeft: 8, marginTop: 16, padding: "8px 11px" }}><X size={14} /> Cancel</button> : null}
        </div>
      )}

      {brief && tailored && status === "done" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <div><h3 style={{ color: C.text, fontSize: 20, margin: "0 0 3px" }}>{tailored.documentIntent === "cover_letter_only" ? "Cover letter" : tailored.documentIntent === "package" ? "Application package" : "Tailored résumé"} for {brief.title}</h3><p style={{ color: C.textSub, fontSize: 13, margin: 0 }}>{brief.company || "Candidate-provided posting"}</p></div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => { setTailored(null); setStatus("review"); }} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, padding: "8px 11px" }}><Pencil size={12} /> Review posting</button>
              <button type="button" onClick={() => resetSourceState("paste")} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, padding: "8px 11px" }}><Text size={12} /> Use another posting</button>
            </div>
          </div>
          {tailored.documentIntent === "cover_letter_only" ? (() => {
            const candidateIdentity = resumeIdentityFromText(resume);
            const identityResumeData = { name: candidateIdentity.name, contact: candidateIdentity.contact };
            return (
              <>
                <ApplicationPackageSummary
                  item={customItem}
                  packageStatus={coverLetterOnlyPackage.packageStatus}
                  resumeStatus="not_created"
                  coverLetterStatus={coverLetterStatus}
                  onReviewResume={addTailoredResume}
                  resumeActionLabel="Add tailored résumé"
                  onOpenCoverLetter={() => coverLetterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  C={C}
                />
                <CoverLetterWorkspace
                  baseResume={resume}
                  resumeData={identityResumeData}
                  candidateIdentity={candidateIdentity}
                  item={customItem}
                  atsReview={tailored.atsReview}
                  candidateEvidence={tailored.candidateEvidence || []}
                  customJob={brief}
                  requestPrivateProcessing={requestPrivateProcessing}
                  requestAccountAction={requestAccountAction}
                  applicationPresentation={applicationPresentation}
                  workspaceRef={coverLetterRef}
                  onStatusChange={handleCoverLetterStatus}
                  onAddResume={addTailoredResume}
                  C={C}
                  primaryBtnStyle={primaryBtnStyle}
                />
                <div style={{ marginTop: 18 }}><AtsReview review={tailored.atsReview} C={C} /></div>
              </>
            );
          })() : (
            <>
              <PositioningSummary assessment={tailored.resume.fit_assessment} C={C} />
              <AtsReview review={tailored.atsReview} C={C} />
            </>
          )}
          {evidenceStorageError ? <p role="alert" style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{evidenceStorageError}</p> : null}
          {tailored.documentIntent !== "cover_letter_only" ? <EvidenceRefinementPanel
            questions={tailored.evidenceQuestions || tailored.atsReview?.evidence_questions || []}
            initialEvidence={evidenceRecords}
            beforeCoverage={tailored.baselineCoverage}
            afterCoverage={tailored.atsReview?.coverage}
            loading={status === "tailoring"}
            onSaveAndRetailor={handleEvidenceRetailor}
            requestPrivateProcessing={requestPrivateProcessing}
            C={C}
          /> : null}
          {tailored.documentIntent !== "cover_letter_only" ? <ResumeExperience baseResume={resume} resumeData={tailored.resume} item={customItem} hasLink={Boolean(brief.source_url)} atsReview={tailored.atsReview} candidateEvidence={tailored.candidateEvidence || []} customJob={brief} applicationIntent={tailored.documentIntent} initialCoverLetterOpen={tailored.documentIntent === "package"} requestPrivateProcessing={requestPrivateProcessing} onEditResume={onEditResume} onTailoringChangeDecision={handleTailoringChangeDecision} requestAccountAction={requestAccountAction} qualityRoute="custom_job" qualityPostingSource={postingSourceForMode(mode)} C={C} primaryBtnStyle={primaryBtnStyle} /> : null}
        </div>
      )}
    </div>
  );
}
