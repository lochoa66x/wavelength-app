import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Download,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { BrandMark } from "../BrandMark.jsx";
import { EvidenceMap } from "../EvidenceMap.jsx";
import { ResumeDesignThumbnail } from "../ResumeDesignSelector.jsx";
import { ResumeDocumentPreview } from "../ResumeDocumentPreview.jsx";
import {
  PRODUCT_TOUR_VERSION,
  productTourCandidate,
  productTourDesigns,
  productTourPosting,
  productTourRenderPlan,
  productTourReview,
} from "./productTourFixtures.js";
import "./productTourCapture.css";

const TOUR_COLORS = Object.freeze({
  bg: "#fffdfa",
  bgCard: "#ffffff",
  bgSubtle: "#f7f4ef",
  text: "#1c1917",
  textSub: "#5f5953",
  textFaint: "#766e66",
  border: "#ded7ce",
  green: "#235a42",
  greenTint: "#eaf3ee",
  greenBorder: "#bcd6c7",
  blue: "#174e72",
  blueTint: "#edf3f7",
  blueBorder: "#c8dae5",
  amber: "#a85d00",
  amberTint: "#fff0e6",
  amberBorder: "#f0bd97",
  red: "#b42318",
  redTint: "#fff1ef",
  redBorder: "#f4b4ad",
});

const SCENES = Object.freeze([
  { id: "search", step: "01", eyebrow: "Choose the opportunity", title: "Find a job—or bring one you found.", copy: "Start from a Canadian listing or import the complete posting." },
  { id: "review", step: "02", eyebrow: "Review the posting", title: "Confirm what the employer actually requires.", copy: "Responsibilities and qualifications stay editable before tailoring." },
  { id: "tailor", step: "03", eyebrow: "Tailor from evidence", title: "Use confirmed experience, not posting keywords.", copy: "Gigscapes keeps employer requirements separate from candidate facts." },
  { id: "evidence", step: "04", eyebrow: "See the Evidence Map", title: "Understand what fits—and what is missing.", copy: "Direct, adjacent, transferable, and missing evidence remain distinct." },
  { id: "gap", step: "05", eyebrow: "Assess application risk", title: "A truthful résumé can still have a material gap.", copy: "Unsupported PLC programming stays visible instead of becoming a claim." },
  { id: "design", step: "06", eyebrow: "Choose the presentation", title: "Strategy and visual design are separate choices.", copy: "Changing the look never changes the evidence or readiness decision." },
  { id: "export", step: "07", eyebrow: "Review and export", title: "Download DOCX or selectable PDF.", copy: "You decide what to submit. Gigscapes never auto-applies." },
]);

function SearchScene() {
  return (
    <div className="tour-search-scene">
      <div className="tour-search-box"><Search aria-hidden="true" /><span>Facilities electrician</span><button type="button">Search <ArrowRight aria-hidden="true" /></button></div>
      <article className="tour-job-card">
        <div className="tour-job-icon"><BriefcaseBusiness aria-hidden="true" /></div>
        <div><strong>{productTourPosting.title}</strong><span>{productTourPosting.company}</span><small>{productTourPosting.location}</small></div>
        <span className="tour-badge">Title match</span>
        <footer><span>View listing</span><strong><Sparkles aria-hidden="true" /> Tailor résumé &amp; apply</strong></footer>
      </article>
    </div>
  );
}
function ReviewScene() {
  return (
    <div className="tour-review-scene">
      <header><div><span>Review the extracted job</span><small>Correct anything the page reader misunderstood.</small></div><button type="button">Change source</button></header>
      <div className="tour-field-grid"><label>Job title<strong>{productTourPosting.title}</strong></label><label>Company<strong>{productTourPosting.company}</strong></label></div>
      <label className="tour-long-field">Responsibilities · one per line
        <span>{productTourPosting.responsibilities.map((item) => <i key={item}>{item}</i>)}</span>
      </label>
      <button type="button" className="tour-primary-button"><Sparkles aria-hidden="true" /> Tailor my résumé</button>
    </div>
  );
}

function TailorScene() {
  return (
    <div className="tour-tailor-scene">
      <div className="tour-tailor-orbit" aria-hidden="true"><Sparkles /><span /><span /></div>
      <span>Checking verified evidence</span>
      <strong>{productTourCandidate.name}</strong>
      <p>Posting requirements are never copied into candidate history.</p>
      <div className="tour-tailor-checks"><span><Check aria-hidden="true" /> Identity confirmed</span><span><Check aria-hidden="true" /> Posting reviewed</span><span><ShieldCheck aria-hidden="true" /> Truth checks active</span></div>
    </div>
  );
}

function EvidenceScene({ showGap = false }) {
  return (
    <div className={`tour-evidence-scene${showGap ? " tour-evidence-scene--gap" : ""}`}>
      <EvidenceMap review={productTourReview} C={TOUR_COLORS} />
      {showGap ? (
        <div className="tour-gap-callout"><strong>Material gap</strong><span>Advanced PLC programming is not supported by the résumé evidence.</span><small>Keep it visible. Do not add it as a skill.</small></div>
      ) : null}
    </div>
  );
}

function DesignScene() {
  return (
    <div className="tour-design-scene">
      <div className="tour-strategy-note"><ShieldCheck aria-hidden="true" /><div><strong>Recommended content strategy: Skilled Trades / Field Services</strong><span>Evidence emphasis and section order</span></div></div>
      <h2>Choose the look</h2>
      <p>All designs keep searchable, selectable, single-column text.</p>
      <div className="tour-design-grid">
        {productTourDesigns.map((design, index) => (
          <div key={design.id} className={index === 1 ? "is-selected" : ""}>
            <ResumeDesignThumbnail design={design} selected={index === 1} compact />
            <strong>{design.displayName}</strong>
            <span>{index === 1 ? "Selected" : "Application-safe"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportScene() {
  return (
    <div className="tour-export-scene">
      <div className="tour-resume-scale"><ResumeDocumentPreview renderPlan={productTourRenderPlan} /></div>
      <div className="tour-export-panel">
        <span>Review every detail before applying.</span>
        <strong>Application-ready export</strong>
        <button type="button" className="tour-primary-button"><Download aria-hidden="true" /> Download DOCX</button>
        <button type="button"><FileText aria-hidden="true" /> Download selectable PDF</button>
        <small>Nothing is submitted automatically.</small>
      </div>
    </div>
  );
}

function SceneContent({ scene }) {
  if (scene.id === "search") return <SearchScene />;
  if (scene.id === "review") return <ReviewScene />;
  if (scene.id === "tailor") return <TailorScene />;
  if (scene.id === "evidence") return <EvidenceScene />;
  if (scene.id === "gap") return <EvidenceScene showGap />;
  if (scene.id === "design") return <DesignScene />;
  return <ExportScene />;
}

export default function ProductTourCapture() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const guideMode = params.get("mode") === "guide";
  const autoplay = params.get("autoplay") !== "0";
  const requestedScene = Math.max(0, Math.min(SCENES.length - 1, Number(params.get("scene") || 0)));
  const [sceneIndex, setSceneIndex] = useState(requestedScene);
  const duration = guideMode ? 10_500 : 4_500;

  useEffect(() => {
    if (!autoplay) return undefined;
    const interval = window.setInterval(() => setSceneIndex((current) => (current + 1) % SCENES.length), duration);
    return () => window.clearInterval(interval);
  }, [autoplay, duration]);

  const scene = SCENES[sceneIndex];
  return (
    <main className="product-tour-capture" data-product-tour-version={PRODUCT_TOUR_VERSION} data-tour-mode={guideMode ? "guide" : "loop"}>
      <div className="product-tour-frame">
        <header className="product-tour-brand"><span><BrandMark size={34} /><strong>Gigscapes</strong></span><em>Evidence-first résumé tailoring</em></header>
        <section className="product-tour-stage" key={scene.id}>
          <aside className="product-tour-caption">
            <span>{scene.step} · {scene.eyebrow}</span>
            <h1>{scene.title}</h1>
            <p>{scene.copy}</p>
            <div className="product-tour-progress" aria-hidden="true">{SCENES.map((item, index) => <i key={item.id} className={index === sceneIndex ? "is-active" : index < sceneIndex ? "is-complete" : ""} />)}</div>
          </aside>
          <div className="product-tour-window">
            <div className="product-tour-window-bar"><span /><span /><span /><strong>{scene.eyebrow}</strong></div>
            <div className="product-tour-window-body"><SceneContent scene={scene} /></div>
          </div>
        </section>
        <footer className="product-tour-footer"><ShieldCheck aria-hidden="true" /> Apply with evidence—not invention.</footer>
      </div>
    </main>
  );
}
