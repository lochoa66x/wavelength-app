import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, Sparkles, Trash2 } from "lucide-react";
import {
  candidateEvidencePreview,
  evidenceAnswerState,
  normalizeEvidenceDraft,
  submittableCandidateEvidence,
} from "./evidenceRefinement.js";

const CONTRIBUTION_OPTIONS = [
  ["supported", "I supported or advised"],
  ["contributed", "I contributed or coordinated"],
  ["owned", "I owned or delivered it"],
  ["led", "I led or directed it"],
];

const ANSWER_OPTIONS = [
  ["yes", "Yes"],
  ["no", "No"],
  ["unsure", "Not sure"],
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
  C,
}) {
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState("");
  const initialEvidenceSignature = JSON.stringify(initialEvidence || []);

  useEffect(() => {
    const next = {};
    for (const record of JSON.parse(initialEvidenceSignature)) {
      if (!record?.requirement_id) continue;
      next[record.requirement_id] = normalizeEvidenceDraft(record);
    }
    setDrafts(next);
  }, [initialEvidenceSignature]);

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
    return Array.from(merged.values()).slice(0, 5);
  }, [drafts, questions]);

  const answered = useMemo(
    () => Object.values(drafts).filter((record) => evidenceAnswerState(record)).length,
    [drafts],
  );
  const beforeMatched = matchedCoverage(beforeCoverage);
  const afterMatched = matchedCoverage(afterCoverage);
  if (!visibleQuestions.length) return null;

  const update = (question, patch) => {
    setDrafts((current) => {
      const previous = normalizeEvidenceDraft(current[question.requirement_id] || {});
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
          ...patch,
        }),
      };
    });
    setMessage("");
  };

  const selectAnswer = (question, answerStatus) => {
    if (answerStatus === "yes") {
      update(question, { answer_status: "yes", declined: false, user_confirmed: false });
      return;
    }
    update(question, {
      answer_status: answerStatus,
      answer: "",
      context: "",
      employer_or_project: "",
      approximate_date: "",
      declined: answerStatus === "no",
      user_confirmed: answerStatus === "no",
    });
  };

  const remove = (requirementId) => {
    setDrafts((current) => {
      const next = { ...current };
      delete next[requirementId];
      return next;
    });
    setMessage("");
  };

  const submit = () => {
    const records = Object.values(drafts)
      .map(normalizeEvidenceDraft)
      .filter((record) => evidenceAnswerState(record));
    if (!records.length) {
      setMessage("Answer at least one question with Yes, No, or Not sure.");
      return;
    }
    const incomplete = records.find((record) => record.answer_status === "yes" && (
      !String(record.answer || "").trim() || record.user_confirmed !== true
    ));
    if (incomplete) {
      setMessage("For each Yes answer, add a factual example and confirm the preview before re-tailoring.");
      return;
    }
    setMessage("");
    onSaveAndRetailor({ records, candidateEvidence: submittableCandidateEvidence(records) });
  };

  return (
    <section aria-label="Strengthen this tailored résumé" style={{ background: C.bgCard, border: `1px solid ${C.blueBorder}`, borderRadius: 14, padding: "15px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.text, fontWeight: 750, fontSize: 13.5 }}>
            <MessageSquareText size={16} color={C.blue} /> Add evidence only you can confirm
          </div>
          <p style={{ margin: "4px 0 0", color: C.textSub, fontSize: 12, lineHeight: 1.5 }}>
            Answer plainly. “Not sure” stays local and is never used as evidence. Your saved résumé is never changed by this step.
          </p>
        </div>
        <span style={{ color: C.textFaint, fontSize: 11.5, whiteSpace: "nowrap" }}>{answered}/{visibleQuestions.length} answered</span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {visibleQuestions.map((question) => {
          const record = normalizeEvidenceDraft(drafts[question.requirement_id] || {});
          const answerStatus = evidenceAnswerState(record);
          return (
            <div key={question.id || question.requirement_id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 12px" }}>
              <div style={{ color: C.textFaint, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{question.requirement}</div>
              <div style={{ color: C.text, fontSize: 12.5, fontWeight: 650, lineHeight: 1.45 }}>{question.question}</div>
              <div role="group" aria-label="Your answer" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 9 }}>
                {ANSWER_OPTIONS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={answerStatus === value}
                    onClick={() => selectAnswer(question, value)}
                    style={{ border: `1px solid ${answerStatus === value ? C.blue : C.border}`, background: answerStatus === value ? C.blueTint : C.bgCard, color: answerStatus === value ? C.blue : C.textSub, borderRadius: 999, padding: "7px 11px", cursor: "pointer", fontWeight: 700, fontSize: 11.5 }}
                  >
                    {label}
                  </button>
                ))}
                {answerStatus ? (
                  <button type="button" onClick={() => remove(question.requirement_id)} aria-label="Clear this answer" style={{ marginLeft: "auto", border: 0, background: "transparent", color: C.textFaint, cursor: "pointer" }}><Trash2 size={14} /></button>
                ) : null}
              </div>

              {answerStatus === "no" ? (
                <div style={{ marginTop: 9, padding: "9px 10px", borderRadius: 9, background: C.bgApp, color: C.textSub, fontSize: 12 }}>
                  <CheckCircle2 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Recorded as not part of your experience. This prevents the résumé from implying it.
                </div>
              ) : null}

              {answerStatus === "unsure" ? (
                <div style={{ marginTop: 9, padding: "9px 10px", borderRadius: 9, background: C.bgApp, color: C.textSub, fontSize: 12 }}>
                  Saved only as a reminder on this device. It will not be sent to the tailoring model.
                </div>
              ) : null}

              {answerStatus === "yes" ? (
                <>
                  <textarea
                    value={record.answer || ""}
                    onChange={(event) => update(question, { answer: event.target.value, user_confirmed: false })}
                    placeholder="What did you personally do? Use your own factual words."
                    rows={3}
                    style={{ width: "100%", resize: "vertical", marginTop: 8, padding: "9px 10px", borderRadius: 9, border: `1px solid ${C.border}`, color: C.text, background: C.bgCard, font: "inherit", fontSize: 12.5, lineHeight: 1.45 }}
                  />
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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 9, color: C.textSub, fontSize: 11.5 }}>
                    <label><input type="radio" name={`scope-${question.requirement_id}`} checked={record.scope !== "profile"} onChange={() => update(question, { scope: "application" })} /> This application only</label>
                    <label><input type="radio" name={`scope-${question.requirement_id}`} checked={record.scope === "profile"} onChange={() => update(question, { scope: "profile" })} /> Reuse for future applications</label>
                  </div>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 9, color: C.text, fontSize: 11.5, lineHeight: 1.4 }}>
                    <input type="checkbox" checked={record.user_confirmed === true} onChange={(event) => update(question, { user_confirmed: event.target.checked })} />
                    I confirm this preview is accurate and based on my real experience.
                  </label>
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
        {loading ? "Re-tailoring…" : "Save answers & re-tailor"}
      </button>
    </section>
  );
}
