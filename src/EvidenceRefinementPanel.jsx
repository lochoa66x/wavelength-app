import { CAPABILITY_LEVELS, capabilityExamplePrompt } from "./capabilityClaims.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquareText, Sparkles, X } from "lucide-react";
import {
  candidateEvidencePreview,
  evidenceAnswerState,
  normalizeEvidenceDraft,
  prepareCandidateEvidenceForSubmission,
  submittableCandidateEvidence,
} from "./evidenceRefinement.js";
import { clarifyCandidateEvidence } from "./tailorClient.js";
import {
  approveEvidenceCoachProposal,
  attachEvidenceCoachProposal,
  editEvidenceCoachProposal,
  evidenceCoachRequest,
  rejectEvidenceCoachProposal,
} from "./evidenceCoachModel.js";
import { evidenceCoachEvent } from "./evidenceCoachTelemetry.js";
import { MAX_REQUEST_EVIDENCE } from "./candidateEvidenceStorage.js";

const CONTRIBUTION_OPTIONS = [
  ["supported", "I supported or advised"],
  ["contributed", "I contributed or coordinated"],
  ["owned", "I owned or delivered it"],
  ["led", "I led or directed it"],
];

function matchedCoverage(coverage = {}) {
  return (coverage.direct || 0) + (coverage.adjacent || 0) + (coverage.transferable || 0);
}

function evidenceId(requirementId) {
  return `candidate-note-${String(requirementId || "requirement").replace(/[^a-z0-9_-]+/gi, "-")}`;
}

export function EvidenceRefinementPanel({
  questions = [],
  initialEvidence = [],
  beforeCoverage,
  afterCoverage,
  loading = false,
  onSaveAndRetailor,
  requestPrivateProcessing = (_scope, action) => action(),
  C,
}) {
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [coachRequests, setCoachRequests] = useState({});
  const coachControllers = useRef(new Map());
  const coachRequestSequence = useRef(0);
  const initialEvidenceSignature = JSON.stringify(initialEvidence || []);

  useEffect(() => {
    const next = {};
    for (const record of JSON.parse(initialEvidenceSignature)) {
      if (!record?.requirement_id || evidenceAnswerState(record) !== "yes") continue;
      next[record.requirement_id] = normalizeEvidenceDraft(record);
    }
    setDrafts(next);
  }, [initialEvidenceSignature]);

  useEffect(() => () => {
    for (const controller of coachControllers.current.values()) controller.abort();
    coachControllers.current.clear();
  }, []);

  const visibleQuestions = useMemo(() => {
    const merged = new Map();
    for (const question of questions || []) {
      if (question?.requirement_id) merged.set(question.requirement_id, question);
    }
    for (const record of Object.values(drafts)) {
      if (!record?.requirement_id || merged.has(record.requirement_id)) continue;
      merged.set(record.requirement_id, {
        id: `saved-${record.requirement_id}`,
        requirement_id: record.requirement_id,
        requirement: record.requirement || "Previously reviewed requirement",
        question: record.question || "Would you like to keep or update this evidence?",
      });
    }
    return Array.from(merged.values()).slice(0, MAX_REQUEST_EVIDENCE);
  }, [drafts, questions]);

  const answered = useMemo(
    () => Object.values(drafts).filter((record) => evidenceAnswerState(record)).length,
    [drafts],
  );
  const beforeMatched = matchedCoverage(beforeCoverage);
  const afterMatched = matchedCoverage(afterCoverage);
  if (!visibleQuestions.length) return null;

  const update = (question, patch, { preserveCoach = false } = {}) => {
    setDrafts((current) => {
      const previous = normalizeEvidenceDraft(current[question.requirement_id] || {});
      const sourceChanged = ["answer", "context", "employer_or_project", "approximate_date", "contribution_level", "capability_level"]
        .some((field) => Object.hasOwn(patch, field) && patch[field] !== previous[field]);
      const coachReset = !preserveCoach && sourceChanged ? {
        coach_proposal: null,
        coach_edit: "",
        coach_editing: false,
        coach_follow_up_answer: "",
        coach_status: "",
        approval_status: "",
        evidence_hash: "",
        raw_answer: "",
      } : {};
      return {
        ...current,
        [question.requirement_id]: normalizeEvidenceDraft({
          id: previous.id || evidenceId(question.requirement_id),
          requirement_id: question.requirement_id,
          requirement: question.requirement,
          question: question.question,
          source: "candidate_note",
          answer: "",
          context: "",
          approximate_date: "",
          employer_or_project: "",
          contribution_level: "supported",
          answer_status: "",
          scope: "application",
          declined: false,
          user_confirmed: false,
          created_at: previous.created_at || new Date().toISOString(),
          ...previous,
          ...coachReset,
          ...patch,
        }),
      };
    });
    setMessage("");
  };

  const selectCapability = (question, selected) => {
    if (!selected) {
      remove(question.requirement_id);
      return;
    }
    update(question, {
      answer_status: "yes",
      evidence_kind: "self_attested_capability",
      declined: false,
      user_confirmed: false,
    });
  };

  const remove = (requirementId) => {
    coachControllers.current.get(requirementId)?.abort();
    coachControllers.current.delete(requirementId);
    setDrafts((current) => {
      const next = { ...current };
      delete next[requirementId];
      return next;
    });
    setMessage("");
  };

  const setCoachRequest = (requirementId, patch) => {
    setCoachRequests((current) => ({
      ...current,
      [requirementId]: { ...(current[requirementId] || {}), ...patch },
    }));
  };

  const performClarification = async (question) => {
    const requirementId = question.requirement_id;
    const record = normalizeEvidenceDraft(drafts[requirementId] || {});
    if (record.answer_status !== "yes" || String(record.raw_answer || record.answer || "").trim().length < 3) {
      setMessage("Add at least one factual sentence in your own words before asking for clarification.");
      return;
    }
    coachControllers.current.get(requirementId)?.abort();
    const controller = new AbortController();
    const requestId = ++coachRequestSequence.current;
    coachControllers.current.set(requirementId, controller);
    setCoachRequest(requirementId, { status: "loading", error: "", requestId });
    evidenceCoachEvent("started");
    try {
      const proposal = await clarifyCandidateEvidence(evidenceCoachRequest(record, question), { signal: controller.signal });
      if (controller.signal.aborted || coachControllers.current.get(requirementId) !== controller) return;
      update(question, attachEvidenceCoachProposal(record, proposal), { preserveCoach: true });
      setCoachRequest(requirementId, { status: "ready", error: "", requestId });
      evidenceCoachEvent(proposal.disposition === "follow_up" ? "follow_up" : "proposed", proposal);
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError") {
        setCoachRequest(requirementId, { status: "cancelled", error: "", requestId });
        evidenceCoachEvent("cancelled");
        return;
      }
      setCoachRequest(requirementId, {
        status: "error",
        error: error?.message || "Evidence clarification failed safely. Your words are unchanged.",
        requestId,
      });
      evidenceCoachEvent("failed");
    } finally {
      if (coachControllers.current.get(requirementId) === controller) coachControllers.current.delete(requirementId);
    }
  };

  const clarify = (question) => {
    setMessage("");
    requestPrivateProcessing("evidence_coach", () => performClarification(question)).catch(() => {
      setCoachRequest(question.requirement_id, { status: "error", error: "Evidence clarification did not start. Your words are unchanged." });
      evidenceCoachEvent("failed");
    });
  };

  const cancelClarification = (requirementId) => {
    coachControllers.current.get(requirementId)?.abort();
  };

  const approveProposal = (question, record) => {
    update(question, approveEvidenceCoachProposal(record), { preserveCoach: true });
    setCoachRequest(question.requirement_id, { status: "approved", error: "" });
    evidenceCoachEvent("approved", record.coach_proposal || {});
  };

  const useEditedProposal = (question, record) => {
    if (String(record.coach_edit || "").trim().length < 3) {
      setCoachRequest(question.requirement_id, { error: "Keep at least one factual sentence, or reject the proposal." });
      return;
    }
    update(question, editEvidenceCoachProposal(record), { preserveCoach: true });
    setCoachRequest(question.requirement_id, { status: "edited", error: "" });
    evidenceCoachEvent("edited");
  };

  const rejectProposal = (question, record) => {
    update(question, rejectEvidenceCoachProposal(record), { preserveCoach: true });
    setCoachRequest(question.requirement_id, { status: "rejected", error: "" });
    evidenceCoachEvent("rejected");
  };

  const submit = () => {
    const records = prepareCandidateEvidenceForSubmission(Object.values(drafts)
      .map(normalizeEvidenceDraft)
      .filter((record) => evidenceAnswerState(record)));
    if (!records.length) {
      setMessage("Select at least one capability, or leave this optional section alone.");
      return;
    }
    const candidateEvidence = submittableCandidateEvidence(records);
    if (!candidateEvidence.length) {
      setMessage("Select at least one capability before using these answers.");
      return;
    }
    setMessage("");
    onSaveAndRetailor({ records, candidateEvidence });
  };

  return (
    <details defaultOpen={answered > 0} aria-label="Strengthen this tailored résumé" style={{ background: C.bgCard, border: `1px solid ${C.blueBorder}`, borderRadius: 14, marginBottom: 14 }}>
      <summary style={{ alignItems: "center", cursor: "pointer", display: "flex", gap: 8, justifyContent: "space-between", listStyle: "none", padding: "14px 16px" }}>
        <span style={{ alignItems: "center", color: C.text, display: "inline-flex", fontSize: 13.5, fontWeight: 750, gap: 7 }}>
          <MessageSquareText size={16} color={C.blue} /> Strengthen this draft <span style={{ color: C.blue, fontSize: 10.5, textTransform: "uppercase" }}>Optional</span>
        </span>
        <span style={{ color: C.textFaint, fontSize: 11.5 }}>{answered ? `${answered} answered` : `Up to ${visibleQuestions.length} short question${visibleQuestions.length === 1 ? '' : 's'}`}</span>
      </summary>
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px 15px" }}>
        <p style={{ margin: "0 0 10px", color: C.textSub, fontSize: 12, lineHeight: 1.5 }}>
          Select only capabilities that accurately describe you. Choose the level that describes your experience. Examples and project details are optional. Your saved résumé is never changed.
        </p>

      <div style={{ display: "grid", gap: 10 }}>
        {visibleQuestions.map((question) => {
          const record = normalizeEvidenceDraft(drafts[question.requirement_id] || {});
          const answerStatus = evidenceAnswerState(record);
          const coachRequest = coachRequests[question.requirement_id] || {};
          const proposal = record.coach_proposal;
          return (
            <div key={question.id || question.requirement_id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 12px" }}>
              <label style={{ alignItems: "flex-start", cursor: "pointer", display: "flex", gap: 9 }}>
                <input
                  type="checkbox"
                  checked={answerStatus === "yes"}
                  onChange={(event) => selectCapability(question, event.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <span style={{ color: C.textFaint, display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{question.requirement}</span>
                  <span style={{ color: C.text, display: "block", fontSize: 12.5, fontWeight: 650, lineHeight: 1.45 }}>Include this area in my application.</span>
                </span>
              </label>

              {answerStatus === "yes" ? (
                <>
                  <label style={{ display: "grid", gap: 5, marginTop: 10, fontSize: 12 }}>
                    My experience in this area
                    <select aria-label={`Experience level for ${question.requirement}`} value={record.capability_level || "unspecified"} onChange={(event) => update(question, { capability_level: event.target.value, user_confirmed: false })} style={{ padding: 9, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text }}>
                      <option value="unspecified">Experience level not specified</option>
                      {CAPABILITY_LEVELS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "block", marginTop: 12, fontSize: 12, fontWeight: 650 }}>
                    {capabilityExamplePrompt(record)} <span style={{ fontWeight: 400, color: C.textFaint }}>(optional)</span>
                  <textarea
                    aria-label={`Optional example for ${question.requirement}`}
                    value={record.answer || ""}
                    onChange={(event) => update(question, { answer: event.target.value, user_confirmed: false })}
                    placeholder="Use your own words. Include a result only if you know it."
                    rows={2}
                    style={{ width: "100%", resize: "vertical", marginTop: 8, padding: "9px 10px", borderRadius: 9, border: `1px solid ${C.border}`, color: C.text, background: C.bgCard, font: "inherit", fontSize: 12.5, lineHeight: 1.45 }}
                  />
                  </label>
                  <p style={{ color: C.textFaint, fontSize: 11, lineHeight: 1.4, margin: "5px 2px 0" }}>Examples are optional. Your selected level controls the wording; project details can make it more specific.</p>
                  <details style={{ borderTop: `1px solid ${C.border}`, marginTop: 9, paddingTop: 8 }}>
                    <summary style={{ color: C.textSub, cursor: "pointer", fontSize: 11.5, fontWeight: 700 }}>Add project details or polish this answer (optional)</summary>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 8 }}>
                    <select value={record.contribution_level || "supported"} onChange={(event) => update(question, { contribution_level: event.target.value, user_confirmed: false })} aria-label="Your responsibility level" style={{ padding: "8px 9px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 12 }}>
                      {CONTRIBUTION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input value={record.employer_or_project || ""} onChange={(event) => update(question, { employer_or_project: event.target.value, user_confirmed: false })} placeholder="Employer or project" style={{ padding: "8px 9px", borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 12 }} />
                    <input value={record.approximate_date || ""} onChange={(event) => update(question, { approximate_date: event.target.value, user_confirmed: false })} placeholder="Approximate date" style={{ padding: "8px 9px", borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 12 }} />
                  </div>
                  <textarea
                    value={record.context || ""}
                    onChange={(event) => update(question, { context: event.target.value, user_confirmed: false })}
                    placeholder="Result or context (optional; do not estimate numbers)"
                    rows={2}
                    style={{ width: "100%", resize: "vertical", marginTop: 8, padding: "9px 10px", borderRadius: 9, border: `1px solid ${C.border}`, color: C.text, background: C.bgCard, font: "inherit", fontSize: 12, lineHeight: 1.45 }}
                  />
                  <div style={{ marginTop: 8, padding: "9px 10px", border: `1px solid ${C.border}`, background: C.bgApp, borderRadius: 9 }}>
                    <div style={{ color: C.textFaint, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Literal evidence preview</div>
                    <div style={{ color: C.textSub, fontSize: 11.5, lineHeight: 1.45 }}>{candidateEvidencePreview(record)}</div>
                  </div>
                  <div style={{ marginTop: 9, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "10px", background: C.blueTint }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color: C.text, fontSize: 12, fontWeight: 750 }}>Optional Evidence Coach</div>
                        <div style={{ color: C.textSub, fontSize: 11.5, lineHeight: 1.45, marginTop: 2 }}>Clarifies only the facts you entered. It cannot approve itself or change your base résumé.</div>
                      </div>
                      {coachRequest.status === "loading" ? (
                        <button type="button" onClick={() => cancelClarification(question.requirement_id)} className="wl-btn" style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${C.border}`, borderRadius: 999, padding: "7px 10px", background: C.bgCard, color: C.textSub, fontWeight: 700, fontSize: 11.5 }}><X size={13} /> Cancel</button>
                      ) : (
                        <button type="button" onClick={() => clarify(question)} className="wl-btn" style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${C.blueBorder}`, borderRadius: 999, padding: "7px 10px", background: C.bgCard, color: C.blue, fontWeight: 750, fontSize: 11.5 }}><Sparkles size={13} /> {proposal ? "Clarify again" : "Clarify my evidence"}</button>
                      )}
                    </div>

                    <div aria-live="polite" style={{ marginTop: coachRequest.status || proposal ? 8 : 0 }}>
                      {coachRequest.status === "loading" ? <div style={{ color: C.textSub, fontSize: 11.5 }}><Loader2 size={13} className="wl-spin" style={{ verticalAlign: "-2px", marginRight: 5 }} />Checking only this answer against the requirement…</div> : null}
                      {coachRequest.status === "cancelled" ? <div style={{ color: C.textSub, fontSize: 11.5 }}>Cancelled. Your source words were preserved.</div> : null}
                      {coachRequest.error ? <div role="alert" style={{ color: C.red, fontSize: 11.5 }}>{coachRequest.error}</div> : null}
                    </div>

                    {proposal ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 9 }}>
                        <div style={{ padding: "8px 9px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.textFaint, fontSize: 10, fontWeight: 750, textTransform: "uppercase", marginBottom: 3 }}>Your source words</div>
                          <div style={{ color: C.textSub, fontSize: 11.5, lineHeight: 1.45 }}>{record.raw_answer || record.answer}</div>
                          {record.coach_follow_up_answer ? <div style={{ color: C.textSub, fontSize: 11.5, lineHeight: 1.45, marginTop: 4 }}><strong>Follow-up:</strong> {record.coach_follow_up_answer}</div> : null}
                        </div>

                        {proposal.disposition === "follow_up" ? (
                          <div style={{ padding: "9px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
                            <div style={{ color: C.text, fontSize: 11.5, fontWeight: 750, lineHeight: 1.45 }}>{proposal.follow_up_question}</div>
                            {proposal.unresolved_details?.length ? <ul style={{ margin: "6px 0 0 18px", padding: 0, color: C.textSub, fontSize: 11, lineHeight: 1.45 }}>{proposal.unresolved_details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}
                            <textarea value={record.coach_follow_up_answer || ""} onChange={(event) => update(question, { coach_follow_up_answer: event.target.value, user_confirmed: false }, { preserveCoach: true })} placeholder="Answer in your own factual words. Say “I don't know” rather than estimating." rows={2} style={{ width: "100%", resize: "vertical", marginTop: 8, padding: "8px 9px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, font: "inherit", fontSize: 11.5 }} />
                            <button type="button" onClick={() => clarify(question)} disabled={coachRequest.status === "loading" || String(record.coach_follow_up_answer || "").trim().length < 2} className="wl-btn" style={{ marginTop: 7, border: 0, borderRadius: 999, padding: "7px 11px", color: "#fff", background: C.blue, fontWeight: 750, fontSize: 11.5 }}>Answer follow-up</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ padding: "9px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
                              <div style={{ color: C.textFaint, fontSize: 10, fontWeight: 750, textTransform: "uppercase", marginBottom: 3 }}>Proposed evidence statement</div>
                              {record.coach_editing ? (
                                <textarea value={record.coach_edit || ""} onChange={(event) => update(question, { coach_edit: event.target.value }, { preserveCoach: true })} rows={3} style={{ width: "100%", resize: "vertical", padding: "8px 9px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, font: "inherit", fontSize: 11.5, lineHeight: 1.45 }} />
                              ) : <div style={{ color: C.text, fontSize: 11.5, lineHeight: 1.5 }}>{proposal.proposed_wording}</div>}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
                              <div style={{ padding: "8px 9px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
                                <div style={{ color: C.textFaint, fontSize: 10, fontWeight: 750, textTransform: "uppercase", marginBottom: 3 }}>Exact facts used</div>
                                <ul style={{ margin: "0 0 0 16px", padding: 0, color: C.textSub, fontSize: 11, lineHeight: 1.45 }}>{proposal.facts_used.map((fact, index) => <li key={`${fact.source_field}-${index}`}>“{fact.source_excerpt}” <span style={{ color: C.textFaint }}>({fact.source_field.replaceAll("_", " ")})</span></li>)}</ul>
                              </div>
                              <div style={{ padding: "8px 9px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
                                <div style={{ color: C.textFaint, fontSize: 10, fontWeight: 750, textTransform: "uppercase", marginBottom: 3 }}>Unresolved details</div>
                                <div style={{ color: C.textSub, fontSize: 11, lineHeight: 1.45 }}>{proposal.unresolved_details?.length ? proposal.unresolved_details.join(" · ") : "None identified. Still review every word before approval."}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                              {record.coach_editing ? (
                                <>
                                  <button type="button" onClick={() => useEditedProposal(question, record)} className="wl-btn" style={{ border: 0, borderRadius: 999, padding: "7px 11px", color: "#fff", background: C.blue, fontWeight: 750, fontSize: 11.5 }}>Use edited wording</button>
                                  <button type="button" onClick={() => update(question, { coach_editing: false, coach_edit: proposal.proposed_wording }, { preserveCoach: true })} className="wl-btn" style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: "7px 11px", background: C.bgCard, color: C.textSub, fontWeight: 700, fontSize: 11.5 }}>Cancel edit</button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={() => approveProposal(question, record)} className="wl-btn" style={{ border: 0, borderRadius: 999, padding: "7px 11px", color: "#fff", background: C.blue, fontWeight: 750, fontSize: 11.5 }}>Approve proposal</button>
                                  <button type="button" onClick={() => update(question, { coach_editing: true }, { preserveCoach: true })} className="wl-btn" style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: "7px 11px", background: C.bgCard, color: C.text, fontWeight: 700, fontSize: 11.5 }}>Edit proposal</button>
                                  <button type="button" onClick={() => rejectProposal(question, record)} className="wl-btn" style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: "7px 11px", background: C.bgCard, color: C.textSub, fontWeight: 700, fontSize: 11.5 }}>Reject</button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 9, color: C.textSub, fontSize: 11.5, lineHeight: 1.4 }}>
                    <input type="checkbox" checked={record.scope === "profile"} onChange={(event) => update(question, { scope: event.target.checked ? "profile" : "application" })} />
                    Remember this answer on this browser for future applications.
                  </label>
                  </details>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {beforeCoverage && afterCoverage && afterMatched !== beforeMatched ? (
        <div role="status" style={{ marginTop: 10, color: C.textSub, fontSize: 12 }}>
          Evidence coverage changed from <strong style={{ color: C.text }}>{beforeMatched}/{beforeCoverage.total || 0}</strong> to <strong style={{ color: C.text }}>{afterMatched}/{afterCoverage.total || 0}</strong> matched requirements.
        </div>
      ) : null}
      {message ? <p role="alert" style={{ color: C.red, margin: "9px 0 0", fontSize: 12 }}>{message}</p> : null}
      <button type="button" onClick={submit} disabled={loading} className="wl-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 11, border: 0, borderRadius: 999, padding: "10px 15px", color: "#fff", background: loading ? "#FDD5B8" : C.green, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
        {loading ? <Loader2 size={14} className="wl-spin" /> : <Sparkles size={14} />}
        {loading ? "Re-tailoring…" : "Use these answers"}
      </button>
      </div>
    </details>
  );
}
