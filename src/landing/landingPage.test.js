import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { availableResumeDesigns } from "../resumeModel.js";
import { APP_PATH } from "../authRoutes.js";
import {
  buildLandingNavigationState,
  landingAccountActionFromState,
  LANDING_DESTINATIONS,
  LANDING_INTENT_STATE_KEY,
} from "./landingIntents.js";

const source = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const mainSource = source("../main.jsx");
const appSource = source("../App.jsx");
const pageSource = source("./LandingPage.jsx");
const headerSource = source("./LandingHeader.jsx");
const templateSource = source("./LandingTemplates.jsx");
const faqSource = source("./LandingFaq.jsx");
const productTourSource = source("./ProductTour.jsx");
const cssSource = source("./landing.css");
const htmlSource = source("../../index.html");

test("root renders the landing page while /app keeps the existing public product", () => {
  assert.match(mainSource, /<Route path="\/" element=\{<LandingPage \/>\}/);
  assert.match(mainSource, /path=\{`\$\{APP_PATH\}\/\*`\} element=\{<Gigscapes \/>\}/);
  assert.doesNotMatch(mainSource, /path="\/" element=\{<Navigate/);
});

test("landing and app are route-level lazy chunks", () => {
  assert.match(mainSource, /lazy\(\(\) => import\("\.\/landing\/LandingPage\.jsx"\)\)/);
  assert.match(mainSource, /lazy\(\(\) => import\("\.\/App\.jsx"\)\)/);
});

test("browse and all intake CTAs map to the real app and existing account actions", () => {
  assert.deepEqual(LANDING_DESTINATIONS, {
    browse: { path: APP_PATH, action: null },
    postingUrl: { path: APP_PATH, action: "import_posting" },
    postingScreenshots: { path: APP_PATH, action: "upload_posting_screenshots" },
    postingText: { path: APP_PATH, action: "paste_posting" },
  });
});

test("landing navigation state accepts only the three existing intake actions", () => {
  for (const action of ["import_posting", "upload_posting_screenshots", "paste_posting"]) {
    const state = buildLandingNavigationState(action);
    assert.equal(state[LANDING_INTENT_STATE_KEY], action);
    assert.equal(landingAccountActionFromState(state), action);
  }
  for (const action of ["tailor_resume", "download_pdf", "unknown", "", null]) {
    assert.equal(buildLandingNavigationState(action), null);
  }
});

test("invalid or structured router state cannot open a private workflow", () => {
  assert.equal(landingAccountActionFromState(null), null);
  assert.equal(landingAccountActionFromState([]), null);
  assert.equal(landingAccountActionFromState({ [LANDING_INTENT_STATE_KEY]: { action: "paste_posting" } }), null);
  assert.equal(landingAccountActionFromState({ [LANDING_INTENT_STATE_KEY]: "download_pdf" }), null);
});

test("the app consumes the landing intent through the centralized gate and clears history state", () => {
  assert.match(appSource, /landingAccountActionFromState\(location\.state\)/);
  assert.match(appSource, /openCustomJob\(mode\)/);
  assert.match(appSource, /replace: true, state: null/);
  assert.match(appSource, /if \(!landingAccountAction \|\| authLoading/);
});

test("the landing gallery exposes all seven visual designs without presenting strategies as skins", () => {
  const designs = availableResumeDesigns();
  assert.equal(designs.length, 7);
  assert.match(templateSource, /availableResumeDesigns\(\)/);
  assert.match(templateSource, /Seven visual résumé designs/);
  assert.match(templateSource, /content strategy/);
  assert.doesNotMatch(templateSource, /ats-core-v1|sap-functional-v1|creative-design-v1/);
  assert.match(templateSource, /aria-pressed=\{isSelected\}/);
});

test("template examples are explicitly generic and contain no private fixture résumé", () => {
  const thumbnailSource = source("../ResumeDesignSelector.jsx");
  assert.match(thumbnailSource, /ALEX MORGAN/);
  for (const marker of ["Accomplished and versatile", "Deloitte Canada", "John Deere Financial", "resume-bicg0d"]) {
    assert.doesNotMatch(`${pageSource}\n${templateSource}\n${thumbnailSource}`, new RegExp(marker, "i"));
  }
});

test("landing modules do not import export libraries or call private and AI endpoints", () => {
  const landingSource = `${pageSource}\n${headerSource}\n${templateSource}\n${faqSource}\n${productTourSource}`;
  assert.doesNotMatch(landingSource, /resumeDocx|resumePdf|jspdf|\bdocx\b.*from|\/api\/tailor|\/api\/job-intake|fetch\s*\(|supabase\.from/);
  assert.doesNotMatch(pageSource, /localStorage|sessionStorage/);
});

test("the landing page has one H1 and a logical section hierarchy", () => {
  assert.equal((pageSource.match(/<h1\b/g) || []).length, 1);
  assert.match(pageSource, /<main id="landing-main">/);
  assert.match(pageSource, /<section className="landing-hero"/);
  assert.match(pageSource, /<footer className="landing-footer">/);
});

test("named landing groups use supported landmark or group roles", () => {
  assert.match(productTourSource, /landing-product-demo landing-product-tour" role="region" aria-labelledby=/);
  assert.match(pageSource, /landing-intake-options" role="group" aria-label=/);
  assert.match(pageSource, /landing-evidence-strip" role="group" aria-label=/);
  assert.match(pageSource, /landing-hero-trust" role="group" aria-label=/);
  assert.match(templateSource, /landing-template-preview" role="region"/);
});

test("the mobile hero keeps the brand signal without letting the headline dominate", () => {
  assert.match(pageSource, /className="landing-hero-title-accent"/);
  assert.match(pageSource, /Build the résumé that fits/);
  assert.match(pageSource, /<\/span> without inventing experience\./);
  assert.doesNotMatch(pageSource, /—without|landing-hero-title-continuation/);
  assert.match(cssSource, /\.landing-hero-title-accent\s*\{[\s\S]*color:\s*var\(--landing-orange\)/);
  assert.match(cssSource, /\.landing-button--primary\s*\{[\s\S]*background:\s*var\(--landing-orange\)/);
  assert.match(cssSource, /@media \(max-width: 480px\)[\s\S]*\.landing-hero h1\s*\{[\s\S]*font-size:\s*clamp\(34px, 9\.5vw, 40px\)/);
});

test("mobile navigation exposes modal state, focus containment, Escape, and restoration", () => {
  assert.match(headerSource, /aria-expanded=\{menuOpen\}/);
  assert.match(headerSource, /role="dialog"/);
  assert.match(headerSource, /aria-modal="true"/);
  assert.match(headerSource, /event\.key === "Escape"/);
  assert.match(headerSource, /event\.key !== "Tab"/);
  assert.match(headerSource, /menuButtonRef\.current\?\.focus\(\)/);
  assert.ok(
    headerSource.indexOf("</header>") < headerSource.indexOf('className="landing-mobile-backdrop"'),
    "the fixed mobile drawer must not be contained by the backdrop-filtered sticky header",
  );
  assert.match(cssSource, /\.landing-mobile-panel\s*\{[\s\S]*height:\s*100dvh/);
  assert.match(cssSource, /\.landing-mobile-panel\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(cssSource, /\.landing-mobile-panel\s*\{[\s\S]*background:\s*#fffdfa/);
});

test("all hash navigation targets exist in the landing source", () => {
  const combined = `${pageSource}\n${headerSource}\n${templateSource}\n${faqSource}`;
  const hashLinks = [...combined.matchAll(/(?:href=|href:\s*)["'](#[A-Za-z0-9_-]+)["']/g)].map((match) => match[1]);
  assert.ok(hashLinks.length >= 6);
  for (const href of hashLinks) {
    assert.match(combined, new RegExp(`id=["']${href.slice(1)}["']`), `missing target for ${href}`);
  }
});

test("footer avoids unimplemented privacy, terms, and social routes", () => {
  assert.doesNotMatch(pageSource, /to=["']\/(?:privacy|terms)|instagram|linkedin|twitter\.com/i);
  assert.match(pageSource, /new Date\(\)\.getFullYear\(\)/);
});

test("metadata defines the production canonical, sharing image, robots, and truthful WebSite data", () => {
  assert.match(htmlSource, /<link rel="canonical" href="https:\/\/gigscapes\.com\/"/);
  assert.match(htmlSource, /<meta property="og:image" content="https:\/\/gigscapes\.com\/gigscapes-og\.svg"/);
  assert.match(htmlSource, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(htmlSource, /<meta name="robots" content="index,follow,max-image-preview:large"/);
  assert.match(htmlSource, /"@type": "WebSite"/);
  assert.doesNotMatch(htmlSource, /aggregateRating|reviewCount|offers|price/);
});

test("responsive CSS protects mobile width, touch targets, focus, and reduced motion", () => {
  assert.match(cssSource, /overflow-x: clip/);
  assert.match(cssSource, /min-height: 44px/);
  assert.match(cssSource, /@media \(max-width: 700px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /:focus-visible/);
});

test("FAQ covers the required trust, pricing, storage, and product questions", () => {
  assert.equal((faqSource.match(/^  \["/gm) || []).length, 13);
  for (const marker of [
    "browse without an account",
    "Is Gigscapes free",
    "Where is my résumé stored",
    "submit applications for me",
    "preliminary résumé",
    "guarantee ATS",
    "career change",
    "complete job description",
  ]) {
    assert.match(faqSource, new RegExp(marker, "i"));
  }
  assert.match(pageSource, /saved only in this browser on this device/i);
  assert.match(pageSource, /does not auto-apply/i);
  assert.doesNotMatch(pageSource, /stored for your account in this browser/i);
});
