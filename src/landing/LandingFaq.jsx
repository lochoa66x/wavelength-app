import { RESUME_SYNC_ENABLED } from "../resumeSyncConfig.js";

const FAQS = Object.freeze([
  ["Can I browse without an account?", "Yes. Public job and gig discovery, search, location filters, workplace filters, and original provider links are available before sign-in."],
  ["Is Gigscapes free?", "Gigscapes currently has no published paid plan or checkout. If paid features are introduced, the price and terms will be shown before you take a paid action."],
  ["When do I need to sign in?", "Sign in when you want to save work, add your résumé, import private posting content, tailor, or export. Those actions use the existing private workspace gate."],
  ["Where is my résumé stored?", RESUME_SYNC_ENABLED
    ? "Your résumé stays in this browser by default. Signed-in users can explicitly turn on private account sync for the base résumé; Gigscapes never enables it silently. Without sync, clearing this browser's site data can remove the copy, so keep your original résumé."
    : "Your résumé is saved only in this browser on this device. Clearing this browser's site data can remove it, so keep your original résumé."],
  ["Does Gigscapes submit applications for me?", "No. Gigscapes does not auto-apply, contact employers, or submit anything in the background. You review the résumé and decide when and where to apply."],
  ["Can I use a posting from another site?", "Yes. Bring a public link, screenshots, or the full posting text. You review the extracted details before tailoring begins."],
  ["Why can’t Gigscapes always read the full job page?", "Some publishers block automated reading or show only a short aggregator snippet. Screenshots or pasted text are the reliable fallback; Gigscapes does not bypass access controls."],
  ["What is a preliminary résumé?", "It is a clearly labeled draft created when the posting or candidate details are not yet complete enough for an application-ready export."],
  ["Does Gigscapes guarantee ATS success?", "No. Gigscapes produces readable, selectable documents with standard headings, but no product can guarantee an ATS ranking, interview, or hiring decision."],
  ["Can it help me apply beyond my exact previous role?", "Yes. It can surface direct, adjacent, and transferable evidence while keeping missing target requirements visible instead of presenting them as experience."],
  ["Which export formats are available?", "Tailored résumés can be exported as DOCX or a selectable-text PDF after the existing identity, posting, evidence, and readiness checks pass."],
  ["Does Gigscapes invent missing experience?", "No. Employers, dates, credentials, tools, metrics, and skills must come from candidate evidence. A posting requirement never becomes candidate history by itself."],
  ["Why does the complete job description matter?", "A title or short snippet cannot reliably establish responsibilities and qualifications. The complete posting supports a more accurate evidence review and safer final résumé."],
]);

export function LandingFaq() {
  return (
    <section id="faq" className="landing-section landing-section--faq" aria-labelledby="faq-title">
      <div className="landing-section-heading">
        <p className="landing-eyebrow">Questions, answered plainly</p>
        <h2 id="faq-title">What to expect before you start.</h2>
      </div>
      <div className="landing-faq-list">
        {FAQS.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
