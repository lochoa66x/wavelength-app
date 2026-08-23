import { AlertTriangle, CheckCircle2, FileWarning, ShieldCheck } from "lucide-react";

const READINESS_LABELS = {
  strong_fit: "Strong fit",
  credible_stretch: "Credible stretch",
  significant_gap: "Significant gap",
  needs_full_posting: "Needs full posting",
};

const FIT_LABELS = {
  strong: "Strong evidence fit",
  adjacent: "Adjacent evidence fit",
  transferable: "Transferable evidence",
  gap: "Material evidence gap",
  not_assessed: "Not assessed",
  not_available: "Not available",
};

function RequirementEvidence({ requirements, C }) {
  if (!requirements?.length) return null;
  const counts = requirements.reduce((result, requirement) => {
    const key = requirement.evidence_match || "missing";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});

  return (
    <details style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 9 }}>
      <summary style={{ color: C.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
        Requirement evidence ({counts.direct || 0} direct · {counts.adjacent || 0} adjacent · {counts.transferable || 0} transferable · {counts.missing || 0} missing)
      </summary>
      <div style={{ display: "grid", gap: 8, marginTop: 9 }}>
        {requirements.map((requirement) => {
          const supported = requirement.evidence_match !== "missing";
          const citation = requirement.evidence?.[0];
          return (
            <div key={requirement.id || requirement.requirement} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 10px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: C.text, fontSize: 12.25, lineHeight: 1.4, fontWeight: 650 }}>{requirement.requirement}</span>
                <span style={{ color: supported ? C.blue : C.amber, fontSize: 10.5, fontWeight: 750, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                  {requirement.evidence_match}
                </span>
              </div>
              {citation ? (
                <blockquote style={{ margin: "7px 0 0", paddingLeft: 9, borderLeft: `2px solid ${C.blueBorder}`, color: C.textSub, fontSize: 11.5, lineHeight: 1.45 }}>
                  “{citation.excerpt}”
                  <div style={{ color: C.textFaint, marginTop: 3 }}>
                    Base résumé · {citation.section}{citation.line_index ? ` · line ${citation.line_index}` : ""}
                  </div>
                </blockquote>
              ) : (
                <p style={{ margin: "6px 0 0", color: C.textFaint, fontSize: 11.5 }}>No supporting résumé evidence found.</p>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

function StatusRow({ label, value, detail, ok, C }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 0.75fr) minmax(0, 1.25fr)", gap: 12, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.text, fontSize: 12.5, fontWeight: 650 }}>
        {ok ? <CheckCircle2 size={14} color={C.green} /> : <AlertTriangle size={14} color={C.amber} />}
        {label}
      </span>
      <span style={{ color: C.textSub, fontSize: 12.5, lineHeight: 1.45 }}>
        <strong style={{ color: C.text }}>{value}</strong>{detail ? ` · ${detail}` : ""}
      </span>
    </div>
  );
}

export function AtsReview({ review, C }) {
  if (!review) return null;

  const integrity = review.integrity || { status: review.status === "blocked" ? "blocked" : "pass", issue_count: 0 };
  const posting = review.posting || { status: "complete", reason: "Posting completeness was not assessed." };
  const postingReadiness = review.posting_readiness || {
    status: posting.status === "complete" ? "reviewed_complete" : "needs_full_posting",
    reason: posting.reason,
    fit_allowed: posting.status === "complete",
  };
  const candidateFit = review.candidate_fit || {
    status: postingReadiness.fit_allowed ? "not_available" : "not_assessed",
    confidence: postingReadiness.fit_allowed ? "low" : "unavailable",
    reason: postingReadiness.reason,
  };
  const coverage = review.coverage || { direct: 0, adjacent: 0, transferable: 0, missing: 0, total: 0 };
  const parseability = review.parseability || { status: review.reverse_chronological ? "pass" : "review" };
  const writing = review.writing || { status: "review", issue_count: (review.verb_issues?.length || 0) + (review.tense_issues?.length || 0) };
  const identity = review.identity || { status: "complete", reason: "Candidate name is present." };
  const readiness = review.readiness || { status: "credible_stretch", reason: "Review the tailored draft against the complete posting." };
  const postingComplete = postingReadiness.fit_allowed === true;
  const integrityPass = integrity.status === "pass";
  const safetyFallback = review.safety_fallback;
  const readinessLabel = postingComplete ? READINESS_LABELS[readiness.status] || "Review required" : "Needs full posting";
  const panelColor = !postingComplete ? C.amber : integrityPass ? C.green : C.red;
  const panelBackground = !postingComplete ? C.amberTint : integrityPass ? C.greenTint : (C.redTint || "#FDEBEC");
  const panelBorder = !postingComplete ? C.amberBorder : integrityPass ? C.greenBorder : (C.redBorder || "#F2B8BC");
  const reviewReason = postingComplete ? readiness.reason : postingReadiness.reason;

  return (
    <section aria-label="Tailoring quality review" style={{ background: panelBackground, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 750, color: C.text }}>
            {integrityPass ? <ShieldCheck size={16} color={C.green} /> : <AlertTriangle size={16} color={C.red} />}
            Evidence-first tailoring review
          </div>
          <p style={{ color: C.textSub, fontSize: 12, lineHeight: 1.45, margin: "4px 0 0" }}>{reviewReason}</p>
        </div>
        <span style={{ color: panelColor, border: `1px solid ${panelBorder}`, background: C.bgCard, borderRadius: 999, padding: "5px 9px", fontSize: 11.5, fontWeight: 750, whiteSpace: "nowrap" }}>
          {readinessLabel}
        </span>
      </div>

      <StatusRow label="Evidence integrity" value={integrityPass ? "Pass" : "Blocked"} detail={integrity.issue_count ? `${integrity.issue_count} unsupported claim${integrity.issue_count === 1 ? "" : "s"}` : "No unsupported history, numbers, skills, projects, training, or positioning detected"} ok={integrityPass} C={C} />
      <StatusRow label="Candidate identity" value={identity.status === "complete" ? "Complete" : "Missing"} detail={identity.reason} ok={identity.status === "complete"} C={C} />
      {safetyFallback?.applied ? (
        <div role="status" style={{ margin: "12px 0 4px", padding: "10px 12px", borderRadius: 10, background: C.amberTint, border: `1px solid ${C.amberBorder}`, color: C.textSub, fontSize: 12, lineHeight: 1.5 }}>
          Gigscapes removed the final unverified content instead of failing your whole résumé. Review the output: {safetyFallback.omitted_experience_count || 0} experience entr{(safetyFallback.omitted_experience_count || 0) === 1 ? "y" : "ies"} and {safetyFallback.removed_numeric_claim_count || 0} unsupported number{(safetyFallback.removed_numeric_claim_count || 0) === 1 ? "" : "s"} were omitted.
        </div>
      ) : null}
      <StatusRow label="Posting readiness" value={postingComplete ? "Reviewed complete" : postingReadiness.status === "preliminary" ? "Preliminary" : "Needs full posting"} detail={postingReadiness.reason} ok={postingComplete} C={C} />
      <StatusRow label="Candidate fit" value={FIT_LABELS[candidateFit.status] || "Review required"} detail={postingComplete ? `${candidateFit.confidence || "low"} confidence · ${candidateFit.reason || "Evidence comparison completed."}` : "Unavailable until responsibilities and qualifications are present"} ok={postingComplete && !["gap", "not_assessed", "not_available"].includes(candidateFit.status)} C={C} />
      <StatusRow label="Requirement coverage" value={coverage.total ? `${coverage.total} requirements analyzed` : "Limited by posting data"} detail={`${coverage.direct || 0} direct · ${coverage.adjacent || 0} adjacent · ${coverage.transferable || 0} transferable · ${coverage.missing || 0} missing`} ok={Boolean(coverage.total) && (coverage.missing || 0) === 0} C={C} />
      <StatusRow label="ATS-readable structure" value={parseability.status === "pass" ? "Pass" : "Review"} detail="Single column, standard headings, chronological history" ok={parseability.status === "pass"} C={C} />
      <StatusRow label="Writing quality" value={writing.status === "pass" ? "Pass" : "Review"} detail={writing.issue_count ? `${writing.issue_count} verb or tense item${writing.issue_count === 1 ? "" : "s"}` : "Action-led bullets and consistent tense"} ok={writing.status === "pass"} C={C} />
      <StatusRow label="Application-ready export" value={review.application_ready ? "Enabled" : "Preliminary only"} detail={review.application_ready ? "Posting and truth checks passed" : "Final export stays locked until posting readiness, identity, and truth checks pass"} ok={review.application_ready === true} C={C} />

      <RequirementEvidence requirements={review.requirements} C={C} />

      {!postingComplete && (
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", color: C.amber, background: C.amberTint, border: `1px solid ${C.amberBorder}`, borderRadius: 10, padding: "9px 10px", marginTop: 9, fontSize: 12, lineHeight: 1.45 }}>
          <FileWarning size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          This is a conservative preliminary version. Paste, link, or upload the complete posting through “Bring your own posting” before treating it as application-ready.
        </div>
      )}

      {review.missing_evidence?.length > 0 && (
        <div style={{ marginTop: 10, color: C.textSub, fontSize: 12, lineHeight: 1.5 }}>
          <strong style={{ color: C.text }}>Important evidence still missing:</strong> {review.missing_evidence.slice(0, 6).join(" · ")}
        </div>
      )}
      {review.candidate_questions?.length > 0 && (
        <details style={{ marginTop: 8, color: C.textSub, fontSize: 12 }}>
          <summary style={{ color: C.text, fontWeight: 650, cursor: "pointer" }}>Questions that could strengthen this version</summary>
          <ul style={{ margin: "7px 0 0", paddingLeft: 18, lineHeight: 1.5 }}>
            {review.candidate_questions.map((question) => <li key={question}>{question}</li>)}
          </ul>
        </details>
      )}
      <p style={{ fontSize: 11.5, color: C.textFaint, margin: "9px 0 0" }}>{review.disclaimer}</p>
    </section>
  );
}
