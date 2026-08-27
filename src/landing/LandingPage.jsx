import {
  ArrowRight,
  Check,
  Download,
  FileImage,
  FileText,
  Link2,
  LockKeyhole,
  MapPin,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

import { BrandMark } from "../BrandMark.jsx";
import { APP_PATH } from "../authRoutes.js";
import { RESUME_SYNC_ENABLED } from "../resumeSyncConfig.js";
import { LandingFaq } from "./LandingFaq.jsx";
import { LandingHeader } from "./LandingHeader.jsx";
import { LandingTemplates } from "./LandingTemplates.jsx";
import { ProductTour } from "./ProductTour.jsx";
import { buildLandingNavigationState, LANDING_DESTINATIONS } from "./landingIntents.js";
import "./landing.css";

const PROCESS_STEPS = Object.freeze([
  { number: "01", title: "Choose or import a posting", copy: "Search public Canadian listings, paste a public link, upload screenshots, or paste the complete posting." },
  { number: "02", title: "Review the evidence", copy: "Confirm the posting, then see what your résumé supports directly, adjacently, transferably, or not yet." },
  { number: "03", title: "Tailor, review, and export", copy: "Choose a job-aware structure and export a DOCX or selectable-text PDF only when the readiness checks allow it." },
]);

const EVIDENCE_TYPES = Object.freeze([
  ["Direct evidence", "Your history explicitly shows the requested work."],
  ["Adjacent experience", "Your verified work is closely related, with a real boundary."],
  ["Transferable skills", "Relevant capabilities carry over without rewriting your history."],
  ["Missing requirements", "Unverified qualifications stay visible as gaps, not résumé claims."],
]);

const WARM_GLASS_PREVIEW_PARAM = "warm-glass";

function warmGlassPreviewEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("surface") === WARM_GLASS_PREVIEW_PARAM;
}

function IntakeButton({ action, children, className = "landing-button landing-button--secondary" }) {
  const navigate = useNavigate();
  const state = buildLandingNavigationState(action);

  return (
    <button
      type="button"
      className={className}
      data-landing-intent={action}
      onClick={() => navigate(APP_PATH, { state })}
    >
      {children}
    </button>
  );
}

function StartPaths() {
  return (
    <section id="start" className="landing-section" aria-labelledby="start-title">
      <div className="landing-section-heading landing-section-heading--split">
        <div>
          <p className="landing-eyebrow">Two ways to start</p>
          <h2 id="start-title">Begin with the opportunity you have.</h2>
        </div>
        <p>Search Gigscapes or bring a posting from elsewhere. Both routes meet in the same evidence-first tailoring workflow.</p>
      </div>

      <div className="landing-path-grid">
        <article className="landing-path-card landing-path-card--dark">
          <div className="landing-path-icon"><Search aria-hidden="true" /></div>
          <p className="landing-card-kicker">Path A</p>
          <h3>Search Gigscapes</h3>
          <p>Browse public jobs and gigs, then narrow the feed by province, city, workplace, and work type.</p>
          <ul>
            <li><Check aria-hidden="true" /> Canada-first discovery</li>
            <li><Check aria-hidden="true" /> Visible provider attribution</li>
            <li><Check aria-hidden="true" /> Public browsing before sign-in</li>
          </ul>
          <Link className="landing-button landing-button--light" to={LANDING_DESTINATIONS.browse.path}>
            Browse jobs &amp; gigs <ArrowRight aria-hidden="true" />
          </Link>
        </article>

        <article className="landing-path-card landing-path-card--warm">
          <div className="landing-path-icon"><Sparkles aria-hidden="true" /></div>
          <p className="landing-card-kicker">Path B</p>
          <h3>Bring your own posting</h3>
          <p>Use the format that preserves the full responsibilities and qualifications. You review the result before tailoring.</p>
          <div className="landing-intake-options" role="group" aria-label="Posting intake choices">
            <IntakeButton action={LANDING_DESTINATIONS.postingUrl.action}><Link2 aria-hidden="true" /> Public job link</IntakeButton>
            <IntakeButton action={LANDING_DESTINATIONS.postingScreenshots.action}><FileImage aria-hidden="true" /> Screenshots</IntakeButton>
            <IntakeButton action={LANDING_DESTINATIONS.postingText.action}><FileText aria-hidden="true" /> Pasted text</IntakeButton>
          </div>
          <p className="landing-path-note">If a publisher blocks automated reading, screenshots or pasted text are the dependable fallback.</p>
        </article>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section landing-section--process" aria-labelledby="process-title">
      <div className="landing-section-heading">
        <p className="landing-eyebrow">How it works</p>
        <h2 id="process-title">From posting to a résumé you can defend.</h2>
      </div>
      <ol className="landing-process-list">
        {PROCESS_STEPS.map((step) => (
          <li key={step.number}>
            <span>{step.number}</span>
            <div><h3>{step.title}</h3><p>{step.copy}</p></div>
          </li>
        ))}
      </ol>
      <div className="landing-evidence-strip" role="group" aria-label="Evidence classifications">
        {EVIDENCE_TYPES.map(([title, copy]) => (
          <div key={title}><strong>{title}</strong><span>{copy}</span></div>
        ))}
      </div>
    </section>
  );
}

function TruthFirstSection() {
  return (
    <section id="evidence-first" className="landing-section landing-truth-grid" aria-labelledby="truth-title">
      <div className="landing-truth-copy">
        <p className="landing-eyebrow"><ShieldCheck size={16} aria-hidden="true" /> Evidence first</p>
        <h2 id="truth-title">Better positioning starts with an honest boundary.</h2>
        <p>Gigscapes can sharpen wording, prioritize relevant work, and make transferable skills clear. It cannot manufacture qualifications that are not in your evidence.</p>
        <ul className="landing-check-list">
          <li><Check aria-hidden="true" /> Candidate history is never invented.</li>
          <li><Check aria-hidden="true" /> Credentials and regulated qualifications are never inferred.</li>
          <li><Check aria-hidden="true" /> Posting requirements remain separate from candidate evidence.</li>
          <li><Check aria-hidden="true" /> Job-specific wording appears only when the evidence supports it.</li>
        </ul>
      </div>
      <div className="landing-ats-card">
        <span className="landing-ats-label">ATS-readable, not ATS-guaranteed</span>
        <h3>Standard structure. Selectable text. No magic score.</h3>
        <p>Exports use conventional headings, a readable single-column flow, and parser-friendly text. No résumé builder can promise a ranking or interview.</p>
        <div className="landing-document-specs">
          <span><ScanSearch aria-hidden="true" /> Standard headings</span>
          <span><FileText aria-hidden="true" /> Selectable text</span>
          <span><Download aria-hidden="true" /> DOCX + PDF</span>
        </div>
      </div>
    </section>
  );
}

function DiscoveryAndPrivacy() {
  return (
    <section className="landing-section landing-control-grid" aria-label="Discovery and privacy">
      <article id="canada-first" className="landing-control-card">
        <div className="landing-control-icon"><MapPin aria-hidden="true" /></div>
        <p className="landing-card-kicker">Canada-first discovery</p>
        <h2>Search here—or bring the listing with you.</h2>
        <p>Gigscapes currently focuses on Canadian work. Source coverage varies, provider attribution stays visible, and original listing links remain available.</p>
        <p>When a public page uses anti-bot protection or exposes only a short snippet, screenshots or pasted text can preserve the complete posting without bypassing that protection.</p>
      </article>
      <article id="privacy" className="landing-control-card landing-control-card--orange">
        <div className="landing-control-icon"><LockKeyhole aria-hidden="true" /></div>
        <p className="landing-card-kicker">Review and control</p>
        <h2>You decide when private work begins.</h2>
        <p>Public browsing does not require an account. Sign-in gates saved work, résumé editing, posting intake, tailoring, and export.</p>
        <p>{RESUME_SYNC_ENABLED
          ? "Your résumé stays in this browser by default. Signed-in users can explicitly enable private account sync for the base résumé; it is never switched on silently. When you request tailoring, the selected résumé, reviewed posting, and confirmed evidence are sent for that private request."
          : "Your résumé is saved only in this browser on this device. Clearing site data can remove it, so keep your original résumé. When you request tailoring, the selected résumé, reviewed posting, and confirmed evidence are sent for that private request."}</p>
        <p>Gigscapes does not auto-apply or contact employers. Preliminary and application-ready exports remain distinct, and you decide what to submit.</p>
      </article>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="landing-final-cta" aria-labelledby="final-cta-title">
      <BrandMark size={42} />
      <p className="landing-eyebrow">Start with real evidence</p>
      <h2 id="final-cta-title">Find the work. Build the résumé that fits.</h2>
      <p>Choose the path that matches where you are now.</p>
      <div className="landing-cta-row">
        <Link className="landing-button landing-button--primary" to={APP_PATH}>Browse jobs &amp; gigs <ArrowRight aria-hidden="true" /></Link>
        <IntakeButton action={LANDING_DESTINATIONS.postingUrl.action}>Tailor a posting I found <ArrowRight aria-hidden="true" /></IntakeButton>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-brand"><BrandMark size={24} /><strong>Gigscapes</strong><span>© {new Date().getFullYear()}</span></div>
      <nav aria-label="Footer navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#resume-templates">Résumé templates</a>
        <Link to={APP_PATH}>Browse jobs</Link>
        <a href="#faq">FAQ</a>
        <Link to="/privacy">Privacy</Link>
      </nav>
      <p>
        Discovery sources may include <a href="https://www.adzuna.ca/" target="_blank" rel="noreferrer">Adzuna</a>, <a href="https://ca.jooble.org/" target="_blank" rel="noreferrer">Jooble</a>, <a href="https://jobicy.com/" target="_blank" rel="noreferrer">Jobicy</a>, <a href="https://himalayas.app/jobs" target="_blank" rel="noreferrer">Himalayas</a>, and We Work Remotely. Availability varies.
      </p>
    </footer>
  );
}

export default function LandingPage() {
  const landingClassName = warmGlassPreviewEnabled()
    ? "landing-page landing-page--warm-glass-preview"
    : "landing-page";

  return (
    <div className={landingClassName}>
      <a className="landing-skip-link" href="#landing-main">Skip to main content</a>
      <LandingHeader />
      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow"><Sparkles size={16} aria-hidden="true" /> Job discovery + evidence-first tailoring</p>
            <h1 id="landing-title">
              Find the work. <span className="landing-hero-title-accent">Build the résumé that fits</span> without inventing experience.
            </h1>
            <p className="landing-hero-lede">Search jobs and gigs across Canada, or bring a posting you found elsewhere. Gigscapes helps you position real evidence clearly, choose a job-aware template, and export an ATS-readable résumé.</p>
            <div className="landing-cta-row">
              <Link className="landing-button landing-button--primary" to={APP_PATH}>Browse jobs &amp; gigs <ArrowRight aria-hidden="true" /></Link>
              <IntakeButton action={LANDING_DESTINATIONS.postingUrl.action}>Tailor a posting I found <ArrowRight aria-hidden="true" /></IntakeButton>
            </div>
            <div className="landing-hero-trust" role="group" aria-label="Product safeguards">
              <span><ShieldCheck aria-hidden="true" /> No invented qualifications</span>
              <span><FileText aria-hidden="true" /> DOCX + selectable PDF</span>
            </div>
          </div>
          <ProductTour />
        </section>

        <StartPaths />
        <HowItWorks />
        <TruthFirstSection />
        <LandingTemplates />
        <DiscoveryAndPrivacy />
        <LandingFaq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
