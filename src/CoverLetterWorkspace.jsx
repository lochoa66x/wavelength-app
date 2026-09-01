import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, Download, FileText, Loader2, PenLine, RotateCcw, Sparkles, Trash2, X } from "lucide-react";

import { ExportStatusNotice } from "./ExportStatusNotice.jsx";
import { useAuth } from "./auth.jsx";
import { generateCoverLetter } from "./coverLetterClient.js";
import { loadCoverLetterDocxExporter, loadCoverLetterPdfExporter, preloadCoverLetterExporters } from "./exportModules.js";
import { classifyExportError, createExportErrorNotice } from "./exportRecovery.js";
import {
  COVER_LETTER_LENGTHS,
  COVER_LETTER_VOICES,
  coverLetterToPlainText,
  createCoverLetterExportContext,
  createCoverLetterPlan,
  getCoverLetterReadiness,
  removeCoverLetterParagraph,
  restoreCoverLetterParagraph,
  updateCoverLetterParagraph,
} from "./coverLetterModel.js";
import { loadCoverLetterDraft, removeCoverLetterDraft, saveCoverLetterDraft } from "./coverLetterStorage.js";
import { createApplicationPresentation, validateApplicationPresentation } from "./applicationPresentation.js";

const PURPOSE_LABELS = Object.freeze({ opening: "Opportunity opening", evidence: "Evidence-backed value", transition: "Honest transition boundary", closing: "Restrained closing" });

export function CoverLetterWorkspace({
  baseResume,
  resumeData,
  item,
  atsReview,
  candidateEvidence = [],
  customJob = null,
  requestPrivateProcessing = (_scope, action) => action(),
  requestAccountAction: requestAccountActionOverride,
  applicationPresentation: requestedApplicationPresentation,
  C,
  primaryBtnStyle,
}) {
  const { session, requestAccountAction: authRequestAccountAction } = useAuth();
  const requestAccountAction = requestAccountActionOverride || authRequestAccountAction;
  const userId = session?.user?.id || "";
  const context = useMemo(() => ({ baseResume, resumeData, item, atsReview, candidateEvidence }), [baseResume, resumeData, item, atsReview, candidateEvidence]);
  const applicationPresentation = useMemo(
    () => requestedApplicationPresentation
      ? validateApplicationPresentation(requestedApplicationPresentation)
      : createApplicationPresentation(),
    [requestedApplicationPresentation],
  );
  const letterTokens = applicationPresentation.tokens;
  const [voice, setVoice] = useState("direct");
  const [length, setLength] = useState("standard");
  const [plan, setPlan] = useState(() => loadCoverLetterDraft(userId, item, context));
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [editText, setEditText] = useState("");
  const controllerRef = useRef(null);

  useEffect(() => {
    const storedPlan = loadCoverLetterDraft(userId, item, context);
    setPlan(storedPlan);
    if (storedPlan?.voice) setVoice(storedPlan.voice);
    if (storedPlan?.length) setLength(storedPlan.length);
    setEditingId("");
    setMessage(null);
  }, [userId, item?.id, item?.title, item?.company, context.baseResume, context.resumeData, context.atsReview, context.candidateEvidence]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (!plan) return undefined;
    let active = true;
    void preloadCoverLetterExporters().then((results) => {
      if (!active) return;
      const failure = results.find((result) => result.status === "failed");
      if (failure && classifyExportError(failure.error) === "stale_exporter") {
        setMessage(createExportErrorNotice(failure.error, { artifact: "cover letter", format: "DOCX/PDF" }));
      }
    });
    return () => { active = false; };
  }, [plan]);

  const readiness = useMemo(() => getCoverLetterReadiness(plan, context), [plan, context]);
  const busy = state === "generating" || state === "exporting";
  const persist = (nextPlan) => {
    setPlan(nextPlan);
    saveCoverLetterDraft(userId, item, nextPlan);
  };
  const requestPayload = (extra = {}) => ({
    resume: baseResume,
    ...(customJob ? { customJob } : { listingId: item?.id }),
    candidateEvidence,
    voice,
    length,
    assessment: {
      posting_readiness: atsReview?.posting_readiness || null,
      readiness: atsReview?.readiness || null,
      candidate_fit: atsReview?.candidate_fit || null,
      requirements: atsReview?.requirements || [],
      coverage: atsReview?.coverage || null,
    },
    ...extra,
  });

  const performGenerate = async (regenerateParagraph = "") => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState("generating");
    setMessage(null);
    try {
      const raw = await generateCoverLetter(requestPayload(regenerateParagraph ? {
        regenerateParagraph,
        existingDraft: plan,
      } : {}), { signal: controller.signal });
      if (regenerateParagraph) {
        const replacement = raw.paragraphs?.[0];
        if (!replacement) throw new Error("The regenerated paragraph was incomplete.");
        const combined = { ...plan, paragraphs: plan.paragraphs.map((entry) => entry.id === regenerateParagraph ? replacement : entry), voice, length };
        persist(createCoverLetterPlan(combined, { ...context, voice, length }));
        setMessage({ type: "info", text: "The paragraph was regenerated from the same verified evidence." });
      } else {
        persist(createCoverLetterPlan(raw, { ...context, voice, length }));
        setMessage({ type: "info", text: "Draft ready. Review every paragraph and its evidence before exporting." });
      }
      setEditingId("");
      setState("idle");
    } catch (error) {
      if (error.name === "AbortError") setMessage({ type: "info", text: "Generation cancelled. Your existing draft is unchanged." });
      else setMessage({ type: "error", text: error.message || "The cover letter could not be generated." });
      setState("idle");
    }
  };

  const handleGenerate = () => requestAccountAction("generate_cover_letter", {
    listingId: item?.id,
    continuation: () => requestPrivateProcessing("cover_letter", () => performGenerate()),
  });
  const handleRegenerate = (paragraphId) => requestPrivateProcessing("cover_letter", () => performGenerate(paragraphId));
  const cancel = () => controllerRef.current?.abort();

  const startEdit = (paragraph) => { setEditingId(paragraph.id); setEditText(paragraph.text); setMessage(null); };
  const saveEdit = (paragraph) => {
    const result = updateCoverLetterParagraph(plan, paragraph.id, editText, { baseResume, candidateEvidence, item });
    if (!result.ok) { setMessage({ type: "error", text: result.message }); return; }
    persist(result.plan);
    setEditingId("");
    setMessage({ type: "info", text: "Edit rechecked against the paragraph's cited evidence." });
  };
  const restore = (paragraphId) => { persist(restoreCoverLetterParagraph(plan, paragraphId)); setEditingId(""); setMessage({ type: "info", text: "Verified generated wording restored." }); };
  const remove = (paragraphId) => { persist(removeCoverLetterParagraph(plan, paragraphId)); setEditingId(""); setMessage({ type: "info", text: "Paragraph removed. Export readiness was recalculated." }); };
  const clearDraft = () => { removeCoverLetterDraft(userId, item); setPlan(null); setMessage({ type: "info", text: "This target-specific cover-letter draft was removed from this browser." }); };

  const freshExportContext = () => createCoverLetterExportContext(plan, { ...context, applicationPresentation });
  const handleCopy = () => requestAccountAction("copy_cover_letter_text", { continuation: async () => {
    try { await navigator.clipboard.writeText(coverLetterToPlainText(freshExportContext().plan)); setMessage({ type: "info", text: "Cover-letter text copied." }); }
    catch { setMessage({ type: "error", text: "The cover letter could not be copied. Check this browser's clipboard permission and try again." }); }
  } });
  const handleDocx = () => requestAccountAction("download_cover_letter_docx", { continuation: async () => {
    setState("exporting"); setMessage(null);
    try { const { downloadCoverLetterDocx } = await loadCoverLetterDocxExporter(); await downloadCoverLetterDocx(freshExportContext()); setMessage({ type: "info", text: "Cover-letter DOCX downloaded." }); }
    catch (error) {
      const notice = createExportErrorNotice(error, { artifact: "cover letter", format: "DOCX" });
      console.error(`Cover-letter DOCX export failed (${notice.category}).`);
      setMessage(notice);
    }
    finally { setState("idle"); }
  } });
  const handlePdf = () => requestAccountAction("download_cover_letter_pdf", { continuation: async () => {
    setState("exporting"); setMessage(null);
    try { const { downloadCoverLetterPdf } = await loadCoverLetterPdfExporter(); await downloadCoverLetterPdf(freshExportContext()); setMessage({ type: "info", text: "Selectable cover-letter PDF downloaded." }); }
    catch (error) {
      const notice = createExportErrorNotice(error, { artifact: "cover letter", format: "PDF" });
      console.error(`Cover-letter PDF export failed (${notice.category}).`);
      setMessage(notice);
    }
    finally { setState("idle"); }
  } });

  return (
    <section aria-labelledby="cover-letter-heading" style={{ marginTop: 20, padding: 18, border: `1px solid ${C.border}`, borderRadius: 16, background: C.bgCard }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.green, fontSize: 12, fontWeight: 750, textTransform: "uppercase", letterSpacing: 0.35 }}><PenLine size={14} /> Evidence-first cover letter</div>
          <h3 id="cover-letter-heading" style={{ margin: "6px 0 5px", color: C.text, fontSize: 20 }}>Write the letter from what you can prove.</h3>
          <p style={{ margin: 0, maxWidth: 620, color: C.textSub, fontSize: 13, lineHeight: 1.55 }}>Choose a voice, then review why every paragraph exists. Gigscapes does not invent enthusiasm, relationships, qualifications, or availability.</p>
        </div>
        {plan ? <button type="button" onClick={clearDraft} className="wl-btn" style={{ border: `1px solid ${C.border}`, borderRadius: 980, background: C.bgCard, color: C.textSub, padding: "8px 12px", display: "flex", gap: 6, alignItems: "center" }}><Trash2 size={13} /> Remove draft</button> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6, color: C.textSub, fontSize: 12, fontWeight: 650 }}>Voice
          <select value={voice} onChange={(event) => setVoice(event.target.value)} disabled={busy} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 11px", color: C.text, background: C.bgCard, font: "inherit" }}>{COVER_LETTER_VOICES.map((option) => <option value={option.id} key={option.id}>{option.label} — {option.description}</option>)}</select>
        </label>
        <label style={{ display: "grid", gap: 6, color: C.textSub, fontSize: 12, fontWeight: 650 }}>Length
          <select value={length} onChange={(event) => setLength(event.target.value)} disabled={busy} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 11px", color: C.text, background: C.bgCard, font: "inherit" }}>{COVER_LETTER_LENGTHS.map((option) => <option value={option.id} key={option.id}>{option.label} — {option.description}</option>)}</select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 14 }}>
        <button type="button" onClick={handleGenerate} disabled={busy} className="wl-btn" style={{ ...primaryBtnStyle(busy), fontSize: 13, padding: "9px 15px" }}>{state === "generating" ? <Loader2 size={13} className="wl-spin" /> : <Sparkles size={13} />}{plan ? "Generate a fresh draft" : "Create cover letter"}</button>
        {state === "generating" ? <button type="button" onClick={cancel} className="wl-btn" style={{ border: `1px solid ${C.border}`, borderRadius: 980, background: C.bgCard, color: C.text, padding: "9px 14px" }}><X size={13} /> Cancel</button> : null}
      </div>

      {plan ? (
        <>
          <div role={readiness.state === "blocked" ? "alert" : "status"} data-cover-letter-readiness={readiness.state} style={{ marginTop: 16, padding: "10px 12px", borderRadius: 10, border: `1px solid ${readiness.state === "application_ready" ? (C.greenBorder || C.green) : (C.amberBorder || C.amber)}`, background: readiness.state === "application_ready" ? (C.greenTint || "#f2fbf6") : (C.amberTint || "#fff8eb"), color: readiness.state === "application_ready" ? C.green : C.amber, fontSize: 12.5, lineHeight: 1.5 }}><strong>{readiness.state === "application_ready" ? "Application-ready" : readiness.state === "preliminary" ? "Preliminary" : "Export blocked"}</strong> · {readiness.message} This guidance is not included in the letter file.</div>
          <article data-cover-letter-preview data-application-presentation={applicationPresentation.designId} style={{ marginTop: 14, padding: `clamp(22px, 5vw, ${Math.round(letterTokens.marginTopIn * 72)}px) clamp(20px, 5vw, ${Math.round(letterTokens.marginRightIn * 72)}px)`, border: `1px solid ${C.border}`, borderRadius: 12, background: letterTokens.paper, color: letterTokens.ink, boxShadow: "0 8px 24px rgba(0,0,0,0.05)", fontFamily: letterTokens.bodyFontFamily, fontSize: `${letterTokens.coverLetterBodyFontSizePt}pt`, lineHeight: letterTokens.coverLetterLineHeight }}>
            <header style={{ textAlign: applicationPresentation.headerAlignment, borderTop: ["keyline", "editorial-v2"].includes(letterTokens.headerTreatment) ? `4px solid ${letterTokens.accent}` : 0, borderBottom: letterTokens.headerTreatment === "civic-rule" ? `3px double ${letterTokens.accent}` : `1px solid ${letterTokens.headerTreatment === "editorial-v2" ? letterTokens.rule : letterTokens.ink}`, padding: ["keyline", "editorial-v2"].includes(letterTokens.headerTreatment) ? "10px 0 12px" : "0 0 12px", marginBottom: 24 }}><h4 style={{ margin: "0 0 3px", color: letterTokens.ink, fontFamily: letterTokens.displayFontFamily, fontSize: `${letterTokens.nameFontSizePt}pt` }}>{plan.candidate.fullName}</h4>{plan.candidate.contactLine ? <p style={{ margin: 0, color: letterTokens.muted, fontFamily: letterTokens.bodyFontFamily, fontSize: "9.5pt" }}>{plan.candidate.contactLine}</p> : null}</header>
            <p style={{ margin: "0 0 12px", fontSize: 13 }}>{new Date(plan.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
            {plan.target.company ? <p style={{ margin: "0 0 3px", fontWeight: 700 }}>{plan.target.company}</p> : null}<p style={{ margin: "0 0 18px", fontWeight: 700 }}>Re: {plan.target.jobTitle}</p>
            <p style={{ margin: "0 0 14px" }}>{plan.salutation}</p>
            {plan.paragraphs.map((paragraph) => (
              <section key={paragraph.id} data-cover-letter-paragraph={paragraph.id} style={{ marginBottom: 15 }}>
                {editingId === paragraph.id ? (
                  <div style={{ padding: 12, border: `1px solid ${C.amberBorder || C.amber}`, borderRadius: 10, background: C.amberTint }}>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Edit paragraph<textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={6} style={{ width: "100%", resize: "vertical", border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, font: "inherit", lineHeight: 1.5 }} /></label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}><button type="button" onClick={() => saveEdit(paragraph)} className="wl-btn" style={{ ...primaryBtnStyle(false), padding: "7px 11px", fontSize: 12 }}>Save & recheck</button><button type="button" onClick={() => setEditingId("")} className="wl-btn" style={{ border: `1px solid ${C.border}`, borderRadius: 980, background: C.bgCard, padding: "7px 11px" }}>Cancel</button></div>
                  </div>
                ) : <p style={{ margin: 0 }}>{paragraph.text}</p>}
                <details style={{ marginTop: 7, color: C.textSub, fontSize: 12 }}><summary style={{ cursor: "pointer", fontWeight: 700, color: C.green }}>{PURPOSE_LABELS[paragraph.purpose] || "Evidence explanation"} · Why this paragraph exists</summary><div style={{ marginTop: 7, padding: 10, borderRadius: 9, background: C.bgSoft }}><p style={{ margin: "0 0 6px" }}>{paragraph.explanation}</p>{paragraph.evidenceRefs.length ? <p style={{ margin: "0 0 5px" }}><strong>Candidate evidence:</strong> “{paragraph.evidenceRefs.join("” · “")}”</p> : null}{paragraph.requirementRefs.length ? <p style={{ margin: 0 }}><strong>Posting requirement:</strong> “{paragraph.requirementRefs.join("” · “")}”</p> : null}</div></details>
                <div aria-label={`Actions for ${PURPOSE_LABELS[paragraph.purpose] || "paragraph"}`} style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}><button type="button" onClick={() => startEdit(paragraph)} className="wl-btn" style={{ border: 0, background: "transparent", color: C.textSub, padding: "4px 0", fontSize: 12 }}><PenLine size={12} /> Edit</button><button type="button" onClick={() => handleRegenerate(paragraph.id)} disabled={busy} className="wl-btn" style={{ border: 0, background: "transparent", color: C.textSub, padding: "4px 0", fontSize: 12 }}><RotateCcw size={12} /> Regenerate</button>{paragraph.text !== paragraph.generatedText ? <button type="button" onClick={() => restore(paragraph.id)} className="wl-btn" style={{ border: 0, background: "transparent", color: C.textSub, padding: "4px 0", fontSize: 12 }}><CheckCircle2 size={12} /> Restore verified</button> : null}<button type="button" onClick={() => remove(paragraph.id)} className="wl-btn" style={{ border: 0, background: "transparent", color: C.red, padding: "4px 0", fontSize: 12 }}><Trash2 size={12} /> Remove</button></div>
              </section>
            ))}
            <p style={{ margin: "20px 0 3px" }}>{plan.signoff}</p><p style={{ margin: 0, fontWeight: 700 }}>{plan.candidate.fullName}</p>
          </article>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 14 }}><button type="button" onClick={handleDocx} disabled={!readiness.canExport || busy} className="wl-btn" style={{ ...primaryBtnStyle(!readiness.canExport || busy), fontSize: 13, padding: "9px 15px" }}><Download size={13} /> {readiness.preliminary ? "Download preliminary DOCX" : "Download cover-letter DOCX"}</button><button type="button" onClick={handlePdf} disabled={!readiness.canExport || busy} className="wl-btn" style={{ border: `1px solid ${C.border}`, borderRadius: 980, background: C.bgCard, color: C.text, padding: "9px 15px", opacity: !readiness.canExport || busy ? 0.5 : 1 }}><FileText size={13} /> {readiness.preliminary ? "Download preliminary PDF" : "Download cover-letter PDF"}</button><button type="button" onClick={handleCopy} disabled={!readiness.canExport || busy} className="wl-btn" style={{ border: `1px solid ${C.border}`, borderRadius: 980, background: C.bgCard, color: C.text, padding: "9px 15px", opacity: !readiness.canExport || busy ? 0.5 : 1 }}><Copy size={13} /> Copy letter text</button></div>
        </>
      ) : null}
      <ExportStatusNotice message={message} C={C} />
    </section>
  );
}
