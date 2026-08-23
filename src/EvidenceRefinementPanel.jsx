import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, Sparkles, Trash2 } from "lucide-react";

const CONTRIBUTION_OPTIONS = [
  ["supported", "I supported or advised"],
  ["contributed", "I contributed or coordinated"],
  ["owned", "I owned or delivered it"],
  ["led", "I led or directed it"],
];

function matchedCoverage(coverage = {}) {
  return (coverage.direct || 0) + (coverage.adjacent || 0) + (coverage.transferable || 0);
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

  useEffect(() => {
    const next = {};
    for (const record of initialEvidence || []) next[record.requirement_id] = record;
    setDrafts(next);
  }, [initialEvidence]);

  const completed = useMemo(() => Object.values(drafts).filter((item) => item?.declined || item?.answer?.trim()).length, [drafts]);
  const beforeMatched = matchedCoverage(beforeCoverage);
  const afterMatched = matchedCoverage(afterCoverage);
  if (!questions.length && !initialEvidence.length) return null;

  const update = (question, patch) => {
    const previous = drafts[question.requirement_id] || {};
    setDrafts((current) => ({
      ...current,
      [question.requirement_id]: {
        id: previous.id || `candidate-note-${question.requirement_id}`,
        requirement_id: question.requirement_id,
        source: "candidate_note",
        answer: "",
        context: "",
        approximate_date: "",
        employer_or_project: "",
        contribution_level: "supported",
        declined: false,
        user_confirmed: true,
        created_at: previous.created_at || new Date().toISOString(),
        ...previous,
        ...patch,
      },
    }));
    setMessage("");
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
    const records = Object.values(drafts).filter((item) => item?.declined || item?.answer?.trim());
    if (!records.length) {
      setMessage("Answer at least one question, or choose “I don’t have this experience.”");
      return;
    }
    setMessage("");
    onSaveAndRetailor(records);
  };

  return (
    <section aria-label="Strengthen this tailored résumé" style={{ background: C.bgCard, border: `1px solid ${C.blueBorder}`, borderRadius: 14, padding: "15px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.text, fontWeight: 750, fontSize: 13.5 }}>
            <MessageSquareText size={16} color={C.blue} /> Add evidence only you can confirm
          </div>
          <p style={{ margin: "4px 0 0", color: C.textSub, fontSize: 12, lineHeight: 1.5 }}>
            Your answers stay on this device for this job. We use them only after you confirm them—never to invent experience.
          </p>
        </div>
        <span style={{ color: C.textFaint, fontSize: 11.5, whiteSpace: "nowrap" }}>{completed}/{Math.max(questions.length, completed)} answered</span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {questions.slice(0, 5).map((question) => {
          const record = drafts[question.requirement_id] || {};
          return (
            <div key={question.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 12px" }}>
              <div style={{ color: C.textFaint, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{question.requirement}</div>
              <label style={{ color: C.text, fontSize: 12.5, fontWeight: 650, lineHeight: 1.45 }}>{question.question}</label>
              {record.declined ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 9, padding: "9px 10px", borderRadius: 9, background: C.bgApp, color: C.textSub, fontSize: 12 }}>
                  <span><CheckCircle2 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Marked as not part of your experience.</span>
                  <button type="button" onClick={() => update(question, { declined: false })} style={{ border: 0, background: "transparent", color: C.blue, cursor: "pointer", fontWeight: 650 }}>Edit</button>
                </div>
              ) : (
                <>
                  <textarea
                    value={record.answer || ""}
                    onChange={(event) => update(question, { answer: event.target.value, declined: false })}
                    placeholder="Describe only what you personally did. Include a concrete example when possible."
                    rows={3}
                    style={{ width: "100%", resize: "vertical", marginTop: 8, padding: "9px 10px", borderRadius: 9, border: `1px solid ${C.border}`, color: C.text, background: C.bgCard, font: "inherit", fontSize: 12.5, lineHeight: 1.45 }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 8 }}>
                    <select value={record.contribution_level || "supported"} onChange={(event) => update(question, { contribution_level: event.target.value })} aria-label="Your responsibility level" style={{ padding: "8px 9px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 12 }}>
                      {CONTRIBUTION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input value={record.employer_or_project || ""} onChange={(event) => update(question, { employer_or_project: event.target.value })} placeholder="Employer or project (optional)" style={{ padding: "8px 9px", borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 12 }} />
                    <input value={record.approximate_date || ""} onChange={(event) => update(question, { approximate_date: event.target.value })} placeholder="Approximate date (optional)" style={{ padding: "8px 9px", borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 12 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => update(question, { declined: true, answer: "", context: "", employer_or_project: "", approximate_date: "" })} style={{ border: 0, background: "transparent", color: C.textSub, cursor: "pointer", fontSize: 11.5 }}>I don’t have this experience</button>
                    {record.answer ? <button type="button" onClick={() => remove(question.requirement_id)} aria-label="Remove answer" style={{ border: 0, background: "transparent", color: C.textFaint, cursor: "pointer" }}><Trash2 size={14} /></button> : null}
                  </div>
                </>
              )}
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

