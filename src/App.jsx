import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { MapPin, Clock, ExternalLink, Check, ArrowRight, ArrowLeft, Pencil, Sparkles, Loader2, CheckCircle2, Circle, Search, Bookmark, X, RotateCcw, LogOut, ChevronDown, Link2, FileImage, Text, Building2 } from "lucide-react";
import { BrandMark } from "./BrandMark.jsx";
import { AtsReview } from "./AtsReview.jsx";
import { EvidenceRefinementPanel } from "./EvidenceRefinementPanel.jsx";
import { CustomJobFlow } from "./CustomJobFlow.jsx";
import { PrivateProcessingDialog } from "./PrivateProcessingDialog.jsx";
import { PositioningSummary } from "./PositioningSummary.jsx";
import { ResumeExperience } from "./ResumeExperience.jsx";
import { ResumeSyncControls } from "./ResumeSyncControls.jsx";
import { RESUME_SYNC_ENABLED } from "./resumeSyncConfig.js";
import { loadLocalResume, saveLocalResume } from "./resumeStorage.js";
import {
  candidateEvidenceForRequest,
  loadCandidateEvidence,
  loadReusableCandidateEvidence,
  mergeReusableCandidateEvidence,
  saveCandidateEvidence,
  saveReusableCandidateEvidence,
} from "./candidateEvidenceStorage.js";
import { submittableCandidateEvidence } from "./evidenceRefinement.js";
import { listingLocationSummary, listingStateKey } from "./listingIdentity.js";
import {
  nextExpandedTailoringState,
  scheduleTailoringPanelReveal,
  tailoringPanelDomIds,
} from "./listingTailoringTransition.js";
import { getMatchPresentation } from "./matchPresentation.js";
import { migrateCloudResume } from "./resumeMigration.js";
import { supabase } from "./supabase.js";
import { isFutureJwtError, runWithFutureJwtRecovery } from "./supabaseRecovery.js";
import { enrichListing, tailorResume } from "./tailorClient.js";
import { useAuth } from "./auth.jsx";
import {
  COUNTRY_OPTIONS,
  LOCATION_OPTIONS,
  formatLocationSearchValue,
  formatLocationPreference,
  hasStructuredLocationFilter,
  locationMatches,
  normalizeLocationCriteria,
  regionOptionsForCountry,
} from "./listingLocations.js";
import { useLiveListings } from "./useLiveListings.js";
import { readPendingAccountAction } from "./accountActions.js";
import { shouldLoadPrivateProfile, stepAfterSignOut } from "./appAccess.js";
import { loadGuestPreferences, normalizeGuestPreferences, saveGuestPreferences } from "./guestPreferences.js";
import {
  CATEGORY_FIELDS,
  WORK_ARRANGEMENT_OPTIONS,
  categoriesForField,
  compareListingDiscoveryOrder,
  inferKeywordIntent,
  isListingFreshForDiscovery,
  isTradesLikeCategory,
  normalizeFieldLabel,
  scoreListingRelevance,
  titleMatchesSearchQuery,
} from "./listingCategories.js";
import { diagnoseSearchResults } from "./searchDiagnostics.js";
import { landingAccountActionFromState } from "./landing/landingIntents.js";
import { QualitySignalSettings } from "./QualitySignalSettings.jsx";
import { buildQualitySignal } from "./qualitySignalContract.js";
import { durationBand, emitQualitySignal, emitResumeQualitySignal } from "./qualitySignals.js";
import { applyTailoringChangeDecision, reviewAfterTailoringChange } from "./tailoringChanges.js";
import { usePrivateProcessingGate } from "./privateProcessing.js";
import { clearPrivateBrowserData } from "./privacyStorage.js";
import { useResumeVault } from "./useResumeVault.js";

const SYS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif";
const ADZUNA_ATTRIBUTION_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 116,
  minHeight: 23,
};
const ADZUNA_LINK_STYLE = { color: "inherit", textDecoration: "none" };
const ADZUNA_NAME_LINK_STYLE = { ...ADZUNA_LINK_STYLE, fontWeight: 700 };
const SOURCE_LINK_STYLE = { color: "inherit" };
const MANUAL_SOURCE_LINK_STYLE = {
  alignItems: "center",
  color: "inherit",
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 500,
  gap: 4,
  width: "fit-content",
};

const STYLE_TAG = `
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { min-height: 100%; background: #F5F5F7; }
.wl-shell { min-height: 100vh; min-height: 100dvh; }
.wl-brand-link {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 4px;
  color: #1D1D1F;
  text-decoration: none;
}
.wl-chip { transition: all 0.15s cubic-bezier(.2,.8,.2,1); }
.wl-chip:hover { border-color: #1D1D1F !important; background: #FAFAF9 !important; }
.wl-chip.active:hover { background: #E8E6E4 !important; }
.wl-btn { transition: opacity 0.15s, transform 0.12s cubic-bezier(.2,.8,.2,1); }
.wl-btn:hover:not(:disabled) { opacity: 0.88; }
.wl-btn:active:not(:disabled) { transform: scale(0.97); }
.wl-btn:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, a:focus-visible { outline: 3px solid rgba(254,94,3,0.32); outline-offset: 2px; }
.wl-tailoring-panel:focus-visible { outline: 3px solid rgba(254,94,3,0.32); outline-offset: 4px; }
.wl-card { transition: box-shadow 0.2s, transform 0.15s; }
.wl-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.07) !important; }
.wl-digest-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
.wl-digest-side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 20px; }
.wl-primary-search-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: end; }
.wl-location-editor-grid { display: grid; grid-template-columns: minmax(180px, 0.85fr) minmax(220px, 1.15fr); gap: 12px; align-items: end; }
.wl-sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
.wl-spin { animation: wl-spin 0.9s linear infinite; }
@keyframes wl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes wl-pulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.18); opacity: 0.35; } }
.wl-glass {
  background: rgba(255,255,255,0.62);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
}
.privacy-gate-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(28,25,23,.55); backdrop-filter: blur(8px); }
.privacy-gate-dialog { position: relative; width: min(520px, 100%); border: 1px solid #DED8D1; border-radius: 24px; background: #FFFCF8; padding: 30px; box-shadow: 0 30px 100px rgba(28,25,23,.25); }
.privacy-gate-dialog h2 { margin: 15px 44px 10px 0; color: #1D1D1F; font-size: 24px; letter-spacing: -.025em; }
.privacy-gate-dialog p { color: #625B55; font-size: 14px; line-height: 1.6; }
.privacy-gate-detail { padding: 12px 14px; border: 1px solid #D7E8E0; border-radius: 12px; background: #F2F9F5; }
.privacy-gate-close { position: absolute; top: 18px; right: 18px; border: 1px solid #DED8D1; border-radius: 999px; background: white; width: 40px; height: 40px; display: grid; place-items: center; cursor: pointer; }
.privacy-gate-link { color: #A93600; font-size: 14px; font-weight: 750; text-underline-offset: 3px; }
.privacy-gate-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.privacy-gate-secondary, .privacy-gate-primary { min-height: 44px; border-radius: 999px; padding: 10px 18px; font: inherit; font-weight: 750; cursor: pointer; }
.privacy-gate-secondary { border: 1px solid #DED8D1; background: white; color: #1D1D1F; }
.privacy-gate-primary { border: 1px solid #D34500; background: #D34500; color: white; }
@media (max-width: 900px) {
  .wl-digest-grid { grid-template-columns: 1fr; }
  .wl-digest-side { position: static; order: -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .wl-digest-side { grid-template-columns: 1fr; }
  .wl-location-editor-grid { grid-template-columns: 1fr; }
}
@media (max-width: 460px) {
  .wl-primary-search-row { grid-template-columns: 1fr; }
  .wl-primary-search-row > button { width: 100%; justify-content: center; }
  .wl-searchrow { flex-wrap: wrap; }
  .wl-searchrow > button { width: 100%; justify-content: center; }
  .wl-filterrow { flex-wrap: wrap; row-gap: 8px; }
  .wl-filterrow > button:last-child { margin-left: 0 !important; }
  .wl-cardhead { flex-wrap: wrap; row-gap: 12px; }
  .wl-cardhead > div:last-child { flex-direction: row !important; align-items: center !important; width: 100%; justify-content: space-between; }
  .wl-actionrow { flex-wrap: wrap; row-gap: 10px; }
  h1.wl-hero { font-size: 26px !important; }
}
`;

const FIELDS = CATEGORY_FIELDS.map(({ label }) => label);
const STRICTNESS = [
  { id: "strict", label: "Strict", hint: "only clearly labeled work types" },
  { id: "loose", label: "Flexible", hint: "include otherwise relevant unlabeled listings" },
];

const DEFAULT_CRITERIA = {
  keyword: "",
  field: null,
  location: "either",
  countryCode: "CA",
  region: "",
  city: "",
  workTypes: [],
  strictness: null,
};

// ============================================================================
// Profile hook
// ============================================================================

function useProfile(session) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [writeError, setWriteError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!shouldLoadPrivateProfile(session)) {
      setProfile(null);
      setLoading(false);
      setError(null);
      setWriteError("");
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await runWithFutureJwtRecovery(
        () => supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single(),
        { refreshSession: () => supabase.auth.refreshSession() },
      );
      if (!mounted) return;
      if (fetchError) {
        console.error("Failed to load profile:", fetchError.message);
        setError(isFutureJwtError(fetchError)
          ? "The secure session is briefly out of sync with the database. Wait a few seconds and try again."
          : fetchError.message || "Couldn't load your profile.");
        setProfile(null);
      } else {
        setProfile(data);
        setError(null);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [session?.user?.id, reloadKey]);

  const reloadProfile = () => setReloadKey((k) => k + 1);

  // Optimistically update, then verify that exactly this user's row changed.
  // Roll back only fields that still contain this patch, preserving any newer
  // optimistic update that may have been made while the request was in flight.
  const updateProfile = async (patch) => {
    if (!session || !profile) throw new Error("Profile is not available");
    const previousProfile = profile;
    setWriteError("");
    setProfile((p) => (p ? { ...p, ...patch } : p));
    const { data, error: updateError } = await runWithFutureJwtRecovery(
      () => supabase
        .from("profiles")
        .update(patch)
        .eq("id", session.user.id)
        .select("id")
        .single(),
      { refreshSession: () => supabase.auth.refreshSession() },
    );

    if (updateError || data?.id !== session.user.id) {
      setProfile((current) => {
        if (!current) return current;
        const rollback = {};
        for (const key of Object.keys(patch)) {
          if (current[key] === patch[key]) rollback[key] = previousProfile[key];
        }
        return { ...current, ...rollback };
      });
      const message = updateError?.message || "The profile update was not confirmed.";
      setWriteError("We couldn't save that account change. Please try again.");
      throw new Error(message);
    }

    return data;
  };

  return { profile, loading, error, writeError, updateProfile, reloadProfile };
}

function itemKey(item) {
  return `${item.company}::${item.title}`;
}

// ============================================================================
// Styling helpers
// ============================================================================

const C = {
  bgApp: "#F5F5F7",
  bgCard: "#FFFFFF",
  text: "#1D1D1F",
  textSub: "#6E6E73",
  textFaint: "#6E6E73",
  border: "#E5E5EA",
  // Primary CTA orange — the identity/action moment. Used rarely: only for
  // filled buttons and small semantic accents. Chip/filter active states use
  // dark neutrals inline (not this) so orange stays powerful when it appears.
  green: "#B83800",
  // Warm peach — semantic positive tint. Used for confirmation cards and
  // evidence-backed direct résumé fit after tailoring.
  greenTint: "#FEE1CE",
  greenBorder: "#FBC4A0",
  blue: "#005BBB",
  blueTint: "#E8F1FC",
  blueBorder: "#C7DFF8",
  amber: "#B9791A",
  amberTint: "#FFF6E9",
  amberBorder: "#F5D9A8",
  red: "#C0392B",
};

const AVATAR_PALETTE = [
  { bg: "#E5F4F0", color: "#0F8B73" },
  { bg: "#E8F1FC", color: "#0071E3" },
  { bg: "#FFF1E6", color: "#C2703D" },
  { bg: "#F1EAFB", color: "#7A4FC9" },
];

function avatarStyle(name) {
  const sum = (name || "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function primaryBtnStyle(disabled) {
  return {
    display: "flex", alignItems: "center", gap: 6,
    fontFamily: SYS_FONT, fontSize: 15, fontWeight: 600,
    padding: "12px 22px", borderRadius: 980, border: "none",
    background: disabled ? "#FDD5B8" : C.green,
    color: "#FFFFFF",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function glassBtnStyle() {
  return {
    display: "flex", alignItems: "center", gap: 6,
    fontFamily: SYS_FONT, fontSize: 15, fontWeight: 600,
    padding: "12px 22px", borderRadius: 980, color: C.text, cursor: "pointer",
  };
}

// ============================================================================
// Small reusable components
// ============================================================================

function ProgressBars({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < current ? C.text : C.border, transition: "background 0.25s" }} />
      ))}
    </div>
  );
}

function Chip({ active, onClick, children, sub }) {
  return (
    <button
      onClick={onClick}
      className={`wl-chip${active ? " active" : ""}`}
      style={{
        fontFamily: SYS_FONT, fontSize: 15, fontWeight: active ? 600 : 500,
        padding: "13px 16px", borderRadius: 14,
        border: `1.5px solid ${active ? C.text : C.border}`,
        background: active ? "#F0EFEE" : C.bgCard,
        color: active ? C.text : C.text,
        cursor: "pointer", textAlign: "left",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%",
        boxShadow: active ? "none" : "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <span>
        {children}
        {sub && <div style={{ fontSize: 12.5, color: active ? C.textSub : C.textSub, marginTop: 2, fontWeight: 400 }}>{sub}</div>}
      </span>
      {active && <CheckCircle2 size={18} color={C.green} style={{ flexShrink: 0 }} />}
    </button>
  );
}

function NavRow({ onBack, onNext, nextLabel = "Next", nextDisabled }) {
  return (
    <div className="wl-glass wl-btn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, borderRadius: 980, padding: "8px" }}>
      {onBack ? (
        <button onClick={onBack} className="wl-btn" style={glassBtnStyle()}>
          <ArrowLeft size={15} /> Back
        </button>
      ) : <span style={{ width: 1 }} />}
      <button onClick={onNext} disabled={nextDisabled} className="wl-btn" style={primaryBtnStyle(nextDisabled)}>
        {nextLabel} <ArrowRight size={15} />
      </button>
    </div>
  );
}

function MatchBadge({ listing, keyword, fitAssessment, postingReadiness }) {
  const presentation = getMatchPresentation({ listing, keyword, fitAssessment, postingReadiness });
  const isDirect = presentation.tone === "direct";
  const isCareerChange = ["career-change", "needs-posting"].includes(presentation.tone);
  const background = isDirect ? C.greenTint : isCareerChange ? C.amberTint : C.blueTint;
  const border = isDirect ? C.greenBorder : isCareerChange ? C.amberBorder : C.blueBorder;
  const color = isDirect ? C.green : isCareerChange ? C.amber : C.blue;
  return (
    <div
      title={presentation.kind === "fit" ? "Based on evidence in your résumé and this posting" : presentation.kind === "readiness" ? "Candidate fit is unavailable until the full posting is loaded" : "Based on your search, not your résumé"}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 980, background, border: `1px solid ${border}` }}
    >
      {isDirect ? <CheckCircle2 size={13} color={color} /> : <Circle size={11} color={color} />}
      <span style={{ fontFamily: SYS_FONT, fontSize: 11.5, fontWeight: 600, color }}>
        {presentation.label}
      </span>
    </div>
  );
}

function PrimarySourceAttribution({ source }) {
  if (source === "Jooble") {
    return <a href="https://ca.jooble.org/" target="_blank" rel="noreferrer" style={SOURCE_LINK_STYLE}>Jooble</a>;
  }

  if (source === "Jobicy") {
    return <a href="https://jobicy.com/" target="_blank" rel="noreferrer" style={SOURCE_LINK_STYLE}>Jobicy</a>;
  }

  if (source === "Himalayas") {
    return <a href="https://himalayas.app/jobs" target="_blank" rel="noreferrer" style={SOURCE_LINK_STYLE}>Himalayas</a>;
  }

  if (source === "Greenhouse") {
    return <span>Employer-direct via Greenhouse</span>;
  }

  if (source === "Lever") {
    return <span>Employer-direct via Lever</span>;
  }

  if (source === "Ashby") {
    return <span>Employer-direct via Ashby</span>;
  }

  if (source !== "Jobs by Adzuna") return <span>{source}</span>;

  return (
    <span style={ADZUNA_ATTRIBUTION_STYLE}>
      <a href="https://www.adzuna.ca/" target="_blank" rel="noreferrer" style={ADZUNA_LINK_STYLE}>Jobs</a>
      <span>&nbsp;by&nbsp;</span>
      <a href="https://www.adzuna.ca/" target="_blank" rel="noreferrer" style={ADZUNA_NAME_LINK_STYLE}>Adzuna</a>
    </span>
  );
}

function SourceAttribution({ source, sources = [] }) {
  const additionalSources = [...new Set(
    sources.map(({ label }) => label).filter((label) => label && label !== source),
  )];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <PrimarySourceAttribution source={source} />
      {additionalSources.length > 0 && (
        <span title={`Also found via ${additionalSources.join(", ")}`}>
          +{additionalSources.length} {additionalSources.length === 1 ? "source" : "sources"}
        </span>
      )}
    </span>
  );
}

function LocationPreferenceFields({
  countryCode,
  region,
  city,
  onCountryChange,
  onRegionChange,
  onCityChange,
  cityExpanded,
  onCityExpandedChange,
  showCountryControl = true,
  onChangeCountry,
}) {
  const regions = regionOptionsForCountry(countryCode);
  const countryLabel = COUNTRY_OPTIONS.find(({ id }) => id === countryCode)?.label || "Any country";
  const regionLabel = countryCode === "CA"
    ? "Province or territory"
    : countryCode === "US"
      ? "State"
      : "Province or state";
  const anyRegionLabel = countryCode === "CA"
    ? "Any province or territory"
    : countryCode === "US"
      ? "Any state"
      : "Choose a country first";
  const selectStyle = {
    width: "100%",
    minHeight: 43,
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "10px 12px",
    color: C.text,
    fontSize: 14,
    fontFamily: SYS_FONT,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="wl-location-editor-grid">
        {showCountryControl ? (
          <label htmlFor="preference-country" style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: C.textSub, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Country</span>
            <select
              id="preference-country"
              value={countryCode}
              onChange={(event) => {
                onCountryChange(event.target.value);
                onRegionChange("");
                onCityChange("");
                onCityExpandedChange(false);
              }}
              style={selectStyle}
            >
              {COUNTRY_OPTIONS.map((country) => <option key={country.id || "any"} value={country.id}>{country.label}</option>)}
            </select>
          </label>
        ) : (
          <div style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: C.textSub, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Country</span>
            <div style={{ minHeight: 43, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 12, background: "#FAFAFB" }}>
              <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{countryLabel}</span>
              <button type="button" onClick={onChangeCountry} className="wl-btn" style={{ border: 0, padding: 0, background: "transparent", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SYS_FONT }}>Change</button>
            </div>
          </div>
        )}
        <label htmlFor="preference-region" style={{ minWidth: 0 }}>
          <span style={{ display: "block", color: C.textSub, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{regionLabel}</span>
          <select
            id="preference-region"
            value={region}
            disabled={!countryCode}
            onChange={(event) => {
              onRegionChange(event.target.value);
              onCityChange("");
            }}
            style={{ ...selectStyle, color: countryCode ? C.text : C.textFaint, cursor: countryCode ? "pointer" : "not-allowed" }}
          >
            <option value="">{anyRegionLabel}</option>
            {regions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {(cityExpanded || city) ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "end" }}>
          <label htmlFor="preference-city" style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: C.textSub, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>City <span style={{ color: C.textFaint, fontWeight: 500 }}>(optional)</span></span>
            <input
              id="preference-city"
              value={city}
              onChange={(event) => onCityChange(event.target.value)}
              placeholder="e.g. Montréal"
              autoComplete="address-level2"
              style={selectStyle}
            />
          </label>
          <button
            type="button"
            aria-label="Remove city filter"
            title="Remove city filter"
            onClick={() => { onCityChange(""); onCityExpandedChange(false); }}
            className="wl-btn"
            style={{ width: 43, height: 43, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}`, borderRadius: 12, background: C.bgCard, color: C.textSub, cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onCityExpandedChange(true)}
          className="wl-btn"
          style={{ justifySelf: "start", border: 0, padding: "3px 0", background: "transparent", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SYS_FONT }}
        >
          + Narrow to a city
        </button>
      )}
    </div>
  );
}

function WorkplaceTypeChips({ value = "either", onChange }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ color: C.textSub, fontSize: 12, fontWeight: 600, marginBottom: 7 }}>Workplace</legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {LOCATION_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className="wl-btn"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                padding: "7px 12px",
                borderRadius: 980,
                cursor: "pointer",
                border: `1px solid ${active ? C.text : C.border}`,
                background: active ? "#F0EFEE" : "transparent",
                color: active ? C.text : C.textSub,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ScanningTransition({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ padding: "70px 32px", textAlign: "center" }}>
      <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 20px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.greenTint, animation: "wl-pulse 1.4s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: C.green }} />
      </div>
      <div style={{ fontFamily: SYS_FONT, fontSize: 14, color: C.textSub, fontWeight: 500 }}>
        Searching available Canadian and remote sources…
      </div>
    </div>
  );
}

// ============================================================================
// Main app
// ============================================================================

export default function Gigscapes() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    session,
    loading: authLoading,
    signOut,
    error: authError,
    requestAccountAction,
    openSignIn,
    consumeAccountAction,
  } = useAuth();
  const { profile, loading: profileLoading, error: profileError, writeError: profileWriteError, updateProfile, reloadProfile } = useProfile(session);
  const [guestCriteria, setGuestCriteria] = useState(() => loadGuestPreferences());
  const storedCriteria = session?.user?.id && profile?.criteria && Object.keys(profile.criteria).length
    ? profile.criteria
    : guestCriteria;
  const normalizedLocationCriteria = normalizeLocationCriteria(storedCriteria);
  const criteria = {
    ...DEFAULT_CRITERIA,
    ...storedCriteria,
    ...normalizedLocationCriteria,
    field: normalizeFieldLabel(storedCriteria.field),
    // Profiles created before taxonomy v2 used a duration preference that was
    // never connected to listing data. Preserve them as "Any work type".
    workTypes: Array.isArray(storedCriteria.workTypes)
      ? storedCriteria.workTypes
      : storedCriteria.duration
        ? ["any"]
        : [],
  };
  const listingResetKey = [
    criteria.keyword,
    criteria.field,
    ...(criteria.workTypes || []),
    criteria.strictness,
  ].join("|");
  const {
    listings: liveListings,
    status: listingsStatus,
    error: listingsError,
    lastFetched,
    total: listingsTotal,
    candidateCount: loadedCandidateCount,
    hasMore: hasMoreListings,
    loadMore: loadMoreListings,
    refetch: refetchListings,
    legacyFallback: legacyLocationFallback,
  } = useLiveListings(criteria, { resetKey: listingResetKey });

  const [step, setStep] = useState("digest");
  const [expandedApply, setExpandedApply] = useState(null);
  const [pendingTailoringFocus, setPendingTailoringFocus] = useState(null);
  const [tailored, setTailored] = useState({});
  const tailoringRequests = useRef(new Map());
  const tailoringPanelRefs = useRef(new Map());
  const [candidateEvidenceByTarget, setCandidateEvidenceByTarget] = useState({});
  const [viewFilter, setViewFilter] = useState("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickCountryCode, setQuickCountryCode] = useState("CA");
  const [quickRegion, setQuickRegion] = useState("");
  const [quickCity, setQuickCity] = useState("");
  const [quickLocationMode, setQuickLocationMode] = useState("either");
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [cityEditorOpen, setCityEditorOpen] = useState(false);
  const [resumeDraft, setResumeDraft] = useState("");
  const [resumeReturnStep, setResumeReturnStep] = useState("digest");
  const [customJobMode, setCustomJobMode] = useState("url");
  const [customJobInitialUrl, setCustomJobInitialUrl] = useState("");
  const [localResume, setLocalResume] = useState("");
  const [resumeLoadedForUser, setResumeLoadedForUser] = useState("");
  const [resumeStorageError, setResumeStorageError] = useState("");
  const [cloudResumeWarning, setCloudResumeWarning] = useState("");
  const [guestDismissed, setGuestDismissed] = useState([]);
  const [continuationNotice, setContinuationNotice] = useState("");
  const [clearPrivateDataOpen, setClearPrivateDataOpen] = useState(false);
  const [clearPrivateDataMessage, setClearPrivateDataMessage] = useState("");
  const injected = useRef(false);
  const resumeMigrationStarted = useRef(new Set());
  const handledLandingAction = useRef(null);
  const landingAccountAction = landingAccountActionFromState(location.state);
  const privateProcessing = usePrivateProcessingGate();
  const replaceLocalResumeFromSync = useCallback((text) => {
    const userId = session?.user?.id;
    if (!userId || !saveLocalResume(userId, text)) {
      setResumeStorageError("Your browser blocked local storage, so the synced résumé was not activated.");
      return false;
    }
    const normalized = String(text || "").trim();
    setLocalResume(normalized);
    setResumeDraft(normalized);
    setResumeStorageError("");
    return true;
  }, [session?.user?.id]);
  const resumeVault = useResumeVault({
    userId: session?.user?.id,
    ready: Boolean(RESUME_SYNC_ENABLED && session?.user?.id && resumeLoadedForUser === session.user.id),
    localResume,
    replaceLocalResume: replaceLocalResumeFromSync,
  });

  useEffect(() => () => {
    for (const request of tailoringRequests.current.values()) request.controller.abort();
    tailoringRequests.current.clear();
  }, []);

  const setTailoringPanelRef = useCallback((stateKey, node) => {
    if (node) tailoringPanelRefs.current.set(stateKey, node);
    else tailoringPanelRefs.current.delete(stateKey);
  }, []);

  const showTailoringPanel = useCallback((stateKey) => {
    setExpandedApply(stateKey);
    setPendingTailoringFocus(stateKey);
  }, []);

  const hideTailoringPanel = useCallback(() => {
    setExpandedApply(null);
    setPendingTailoringFocus(null);
  }, []);

  useEffect(() => {
    if (!pendingTailoringFocus || step !== "digest" || expandedApply !== pendingTailoringFocus) return undefined;
    const panel = tailoringPanelRefs.current.get(pendingTailoringFocus);
    if (!panel) return undefined;

    return scheduleTailoringPanelReveal(panel, {
      onComplete: () => {
        setPendingTailoringFocus((current) => current === pendingTailoringFocus ? null : current);
      },
    });
  }, [expandedApply, pendingTailoringFocus, step]);

  const resume = localResume;
  const dismissed = session?.user?.id ? profile?.dismissed_listings || [] : guestDismissed;
  const saved = session?.user?.id ? profile?.saved_listings || [] : [];

  const updateCriteria = (patch) => {
    const next = normalizeGuestPreferences({ ...criteria, ...patch });
    if (session?.user?.id && profile) {
      const { version: _version, ...accountCriteria } = next;
      updateProfile({ criteria: accountCriteria }).catch(() => {});
      return;
    }
    setGuestCriteria(next);
    saveGuestPreferences(next);
  };
  const quickLocationPatch = () => ({
    location: quickLocationMode || "either",
    countryCode: quickCountryCode,
    region: quickRegion,
    city: quickCity.trim(),
  });
  const applyQuickSearch = () => {
    updateCriteria({
      keyword: quickSearch.trim(),
      field: quickSearch.trim() ? null : criteria.field,
      ...quickLocationPatch(),
    });
    setLocationEditorOpen(false);
  };
  const toggleWorkType = (workType) => {
    const current = criteria.workTypes || [];
    if (workType === "any") {
      updateCriteria({ workTypes: ["any"] });
      return;
    }

    const withoutAny = current.filter((value) => value !== "any");
    const workTypes = withoutAny.includes(workType)
      ? withoutAny.filter((value) => value !== workType)
      : [...withoutAny, workType];
    updateCriteria({ workTypes });
  };
  const saveResume = (text) => {
    if (!session?.user?.id) {
      requestAccountAction("edit_resume", { continuation: () => setStep("resume") });
      return false;
    }
    const savedLocally = saveLocalResume(session?.user?.id, text);
    if (!savedLocally) {
      setResumeStorageError("Your browser blocked local storage, so the résumé was not saved.");
      return false;
    }
    const normalized = String(text || "").trim();
    setLocalResume(normalized);
    setResumeStorageError("");
    void resumeVault.syncAfterLocalSave(normalized);
    return true;
  };
  const clearLocalPrivateData = () => {
    const result = clearPrivateBrowserData(session?.user?.id);
    if (!result.ok) {
      setClearPrivateDataMessage("Your browser blocked deletion. No Gigscapes account or cloud data was changed.");
      return;
    }
    for (const request of tailoringRequests.current.values()) request.controller.abort();
    tailoringRequests.current.clear();
    setLocalResume("");
    setResumeDraft("");
    setTailored({});
    setCandidateEvidenceByTarget({});
    resumeVault.resetAfterLocalClear();
    setClearPrivateDataOpen(false);
    setClearPrivateDataMessage(`Removed ${result.removed} private browser record${result.removed === 1 ? "" : "s"} for this account.`);
  };
  const toggleDismiss = (key) => {
    const next = dismissed.includes(key) ? dismissed.filter((k) => k !== key) : [...dismissed, key];
    if (session?.user?.id && profile) updateProfile({ dismissed_listings: next }).catch(() => {});
    else setGuestDismissed(next);
  };
  const toggleSave = (item) => {
    const key = itemKey(item);
    const action = saved.includes(key) ? "unsave_job" : "save_job";
    requestAccountAction(action, {
      listingId: item.id,
      continuation: () => {
        const next = saved.includes(key) ? saved.filter((savedKey) => savedKey !== key) : [...saved, key];
        updateProfile({ saved_listings: next }).catch(() => {});
      },
    });
  };

  const openCustomJob = useCallback((mode, url = "") => {
    const action = mode === "screenshots"
      ? "upload_posting_screenshots"
      : mode === "paste"
        ? "paste_posting"
        : "import_posting";
    requestAccountAction(action, {
      continuation: () => {
        setCustomJobMode(mode);
        setCustomJobInitialUrl(url);
        setStep("custom_job");
      },
    });
  }, [requestAccountAction]);
  const openResumeEditor = (returnStep = "digest") => {
    requestAccountAction("edit_resume", {
      continuation: () => {
        setResumeDraft(resume || "");
        setResumeReturnStep(returnStep);
        setStep("resume");
      },
    });
  };
  const openSavedJobs = () => {
    requestAccountAction("view_saved_jobs", {
      continuation: () => {
        setViewFilter("saved");
        setStep("digest");
      },
    });
  };
  const openTailoring = (item, stateKey) => {
    requestAccountAction("tailor_resume", {
      listingId: item.id,
      continuation: () => {
        const nextStateKey = nextExpandedTailoringState(expandedApply, stateKey);
        if (nextStateKey) showTailoringPanel(nextStateKey);
        else hideTailoringPanel();
      },
    });
  };
  const performTailor = async (item, stateKey, { skipEnrichment = false, candidateEvidenceOverride } = {}) => {
    if (!session?.user?.id) {
      requestAccountAction("tailor_resume", {
        listingId: item.id,
        continuation: () => showTailoringPanel(stateKey),
      });
      return;
    }
    const previous = tailored[stateKey];
    tailoringRequests.current.get(stateKey)?.controller.abort();
    const request = { controller: new AbortController(), previous };
    tailoringRequests.current.set(stateKey, request);
    const startedAt = Date.now();
    const applicationEvidence = candidateEvidenceOverride
      ?? candidateEvidenceByTarget[stateKey]
      ?? loadCandidateEvidence(session?.user?.id, stateKey);
    const candidateEvidence = candidateEvidenceForRequest(
      submittableCandidateEvidence(applicationEvidence),
      submittableCandidateEvidence(loadReusableCandidateEvidence(session?.user?.id)),
    );
    setTailored((t) => ({ ...t, [stateKey]: { ...t[stateKey], status: "loading", phase: skipEnrichment ? "tailoring" : "enriching" } }));
    try {
      let enrichment = null;
      if (!skipEnrichment) {
        enrichment = await enrichListing(item.id, { signal: request.controller.signal });
        if (tailoringRequests.current.get(stateKey) !== request) return;
        if (enrichment.fallbackRequired) {
          setTailored((t) => ({ ...t, [stateKey]: {
            status: "needs_posting",
            message: enrichment.message,
            errorCode: enrichment.errorCode,
          } }));
          tailoringRequests.current.delete(stateKey);
          void emitQualitySignal(buildQualitySignal("tailoring_blocked", {
            route: "app",
            postingSource: "public_listing",
            postingReadiness: "needs_full_posting",
            outcome: "blocked",
            durationBand: durationBand(Date.now() - startedAt),
          }));
          return;
        }
        setTailored((t) => ({ ...t, [stateKey]: { status: "loading", phase: "tailoring", enrichment: enrichment.listing } }));
      }
      const result = await tailorResume(resume, { listingId: item.id, candidateEvidence }, { signal: request.controller.signal });
      if (tailoringRequests.current.get(stateKey) !== request) return;
      setTailored((t) => ({ ...t, [stateKey]: {
        status: "done",
        resumeData: result.resume,
        atsReview: result.atsReview,
        baselineAtsReview: result.atsReview,
        postingReadiness: result.postingReadiness,
        candidateFit: result.candidateFit,
        applicationReady: result.applicationReady,
        outputMode: result.outputMode,
        evidenceQuestions: result.evidenceQuestions,
        candidateEvidence: result.candidateEvidence,
        baselineCoverage: previous?.baselineCoverage || previous?.atsReview?.coverage || result.atsReview?.coverage,
        previousCoverage: previous?.atsReview?.coverage || null,
        enrichment: enrichment?.listing || null,
      } }));
      tailoringRequests.current.delete(stateKey);
      void emitResumeQualitySignal("tailoring_completed", {
        resumeData: result.resume,
        item,
        atsReview: result.atsReview,
        route: "app",
        postingSource: "public_listing",
        outcome: "completed",
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      if (tailoringRequests.current.get(stateKey) !== request) return;
      tailoringRequests.current.delete(stateKey);
      if (err.name === "AbortError") return;
      setTailored((t) => ({ ...t, [stateKey]: { status: "error", message: err.message } }));
      void emitQualitySignal(buildQualitySignal("tailoring_blocked", {
        route: "app",
        postingSource: "public_listing",
        outcome: "failed",
        errorCategory: "unknown",
        durationBand: durationBand(Date.now() - startedAt),
      }));
    }
  };

  const handleTailor = (item, stateKey, options = {}) => privateProcessing.requestPrivateProcessing(
    "tailor",
    () => performTailor(item, stateKey, options),
  );

  const handleTailoringChangeDecision = (stateKey, change, decision) => {
    setTailored((current) => {
      const target = current[stateKey];
      if (!target?.resumeData) return current;
      const resumeData = applyTailoringChangeDecision(target.resumeData, change, decision);
      const baselineAtsReview = target.baselineAtsReview || target.atsReview;
      return {
        ...current,
        [stateKey]: {
          ...target,
          resumeData,
          baselineAtsReview,
          atsReview: reviewAfterTailoringChange(baselineAtsReview, resumeData),
        },
      };
    });
  };

  const handleEvidenceRetailor = async (item, stateKey, { records, candidateEvidence }) => {
    if (!session?.user?.id) {
      requestAccountAction("add_evidence", {
        listingId: item.id,
        continuation: () => showTailoringPanel(stateKey),
      });
      return;
    }
    const userId = session?.user?.id;
    const applicationSaved = saveCandidateEvidence(userId, stateKey, records);
    const answeredIds = new Set(records.map((record) => record?.id).filter(Boolean));
    const retainedReusable = loadReusableCandidateEvidence(userId)
      .filter((record) => !answeredIds.has(record?.id));
    const reusable = mergeReusableCandidateEvidence(
      retainedReusable,
      candidateEvidence.filter((record) => record.scope === "profile"),
    );
    const reusableSaved = saveReusableCandidateEvidence(userId, reusable);
    const evidenceStorageError = applicationSaved && reusableSaved
      ? ""
      : "These answers will be used for this run, but your browser blocked saving one or more of them locally.";

    setCandidateEvidenceByTarget((current) => ({ ...current, [stateKey]: records }));
    await handleTailor(item, stateKey, { skipEnrichment: true, candidateEvidenceOverride: records });
    if (evidenceStorageError) {
      setTailored((current) => ({
        ...current,
        [stateKey]: { ...current[stateKey], evidenceStorageError },
      }));
    }
  };

  const cancelListingTailoring = (stateKey) => {
    const active = tailoringRequests.current.get(stateKey);
    if (!active) return;
    active.controller.abort();
    tailoringRequests.current.delete(stateKey);
    setTailored((current) => {
      const next = { ...current };
      if (active.previous) next[stateKey] = active.previous;
      else delete next[stateKey];
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      setStep(stepAfterSignOut());
      setViewFilter("all");
      hideTailoringPanel();
      setTailored({});
      setCandidateEvidenceByTarget({});
    }
  };

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const style = document.createElement("style");
    style.textContent = STYLE_TAG;
    document.head.appendChild(style);
  }, []);

  // Load the resume saved for this account in this browser. Including the
  // Supabase user id in the key keeps accounts separate on shared devices.
  useEffect(() => {
    const userId = session?.user?.id || "";
    setResumeLoadedForUser("");
    setLocalResume(loadLocalResume(userId));
    setResumeLoadedForUser(userId);
    setResumeStorageError("");
    setCloudResumeWarning("");
  }, [session?.user?.id]);

  // One-time privacy migration for existing users: first copy the old cloud
  // resume to this device, then remove it from the profile row. If browser
  // storage fails, keep the Supabase copy so the user does not lose data.
  useEffect(() => {
    const userId = session?.user?.id;
    const cloudResume = profile?.resume_text?.trim();
    if (!userId || !cloudResume) return;
    if (resumeMigrationStarted.current.has(userId)) return;
    resumeMigrationStarted.current.add(userId);

    (async () => {
      const result = await migrateCloudResume({
        userId,
        cloudResume,
        loadResume: loadLocalResume,
        saveResume: saveLocalResume,
        // The original profiles schema stores resume_text as a non-null text
        // value. Clear its contents without violating that constraint.
        clearCloudResume: () => updateProfile({ resume_text: "" }),
      });

      if (result.resume) setLocalResume(result.resume);
      if (result.status === "migrated") {
        setResumeStorageError("");
        setCloudResumeWarning("");
      } else if (result.status === "cloud_cleanup_failed") {
        setCloudResumeWarning("Saved on this device, but we could not remove the previous cloud copy.");
      } else if (result.status === "conflict") {
        setCloudResumeWarning("A different résumé already exists on this device, so the previous cloud copy was not removed.");
      } else if (result.status === "local_save_failed") {
        setResumeStorageError("Your browser blocked local storage. Your existing résumé was left in your account for safety.");
      }
    })();
  }, [session?.user?.id, profile?.resume_text]);

  // Private screens collapse back to public discovery on sign-out or session
  // failure. Public search never waits for account initialization.
  useEffect(() => {
    if (!session?.user?.id && ["resume", "resume_onboarding", "custom_job", "scanning"].includes(step)) {
      setStep("digest");
    }
  }, [session?.user?.id, step]);

  // Landing-page intake CTAs carry only an existing allowlisted account action
  // in React Router history state. Clear it immediately after routing so Back,
  // Forward, and refresh cannot replay a private workflow.
  useEffect(() => {
    if (!landingAccountAction || authLoading || handledLandingAction.current === landingAccountAction) return;
    handledLandingAction.current = landingAccountAction;
    const mode = landingAccountAction === "upload_posting_screenshots"
      ? "screenshots"
      : landingAccountAction === "paste_posting"
        ? "paste"
        : "url";
    openCustomJob(mode);
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
  }, [landingAccountAction, authLoading, location.hash, location.pathname, location.search, navigate, openCustomJob]);

  // A pending instruction contains only an allowlisted action, an optional
  // public listing id, and an internal path. Consume it exactly once after a
  // verified session exists; sensitive inputs are always requested again.
  useEffect(() => {
    if (!session?.user?.id || profileLoading) return;
    const preview = readPendingAccountAction();
    if (!preview) return;

    const listingActions = new Set(["save_job", "unsave_job", "tailor_resume", "generate_evidence", "add_evidence"]);
    if (listingActions.has(preview.action) && listingsStatus === "loading") return;
    if (["save_job", "unsave_job", "view_saved_jobs"].includes(preview.action) && !profile) {
      if (!profileError) return;
    }

    const pending = consumeAccountAction();
    if (!pending) return;
    const listing = pending.listingId
      ? liveListings.find((item) => String(item.id) === pending.listingId)
      : null;

    if (pending.action === "edit_resume") {
      setResumeDraft(resume || "");
      setResumeReturnStep("digest");
      setStep("resume");
      return;
    }
    if (["import_posting", "upload_posting_screenshots", "paste_posting"].includes(pending.action)) {
      setCustomJobMode(pending.action === "upload_posting_screenshots" ? "screenshots" : pending.action === "paste_posting" ? "paste" : "url");
      setCustomJobInitialUrl("");
      setStep("custom_job");
      return;
    }
    if (pending.action === "view_saved_jobs") {
      if (profile) setViewFilter("saved");
      else setContinuationNotice("Your account is signed in, but the private workspace could not be loaded yet.");
      setStep("digest");
      return;
    }
    if (pending.action === "save_job" || pending.action === "unsave_job") {
      if (!listing || !profile) {
        setContinuationNotice("The selected listing is no longer in this search. Browse or search again to continue.");
        return;
      }
      const key = itemKey(listing);
      const next = pending.action === "save_job"
        ? [...new Set([...saved, key])]
        : saved.filter((savedKey) => savedKey !== key);
      updateProfile({ saved_listings: next }).catch(() => {});
      return;
    }
    if (["tailor_resume", "generate_evidence", "add_evidence"].includes(pending.action)) {
      if (!listing) {
        setContinuationNotice("The selected listing is no longer in this search. Find it again to continue tailoring.");
        return;
      }
      setStep("digest");
      showTailoringPanel(listingStateKey(listing));
      return;
    }
    if (["download_docx", "download_pdf", "copy_tailored_text"].includes(pending.action)) {
      setContinuationNotice("You’re signed in. Regenerate the tailored résumé to create a private export; no résumé content was stored during sign-in.");
      setStep("digest");
    }
  }, [session?.user?.id, profileLoading, profile, profileError, listingsStatus, liveListings, resume]);

  useEffect(() => {
    if (step === "digest" || step === "location") {
      setQuickSearch(criteria.keyword || "");
      setQuickCountryCode(criteria.countryCode || "CA");
      setQuickRegion(criteria.region || "");
      setQuickCity(criteria.city || "");
      setQuickLocationMode(criteria.location || "either");
      setCityEditorOpen(Boolean(criteria.city));
      if (step !== "digest") setLocationEditorOpen(false);
    }
  }, [
    step,
    criteria.keyword,
    criteria.city,
    criteria.countryCode,
    criteria.region,
    criteria.location,
  ]);

  const stepIndex = { field: 1, location: 2, tuning: 3, review: 4, resume_onboarding: 5 }[step] || 0;

  const keywordInput = (criteria.keyword || "").trim();
  const keywordIntent = inferKeywordIntent(keywordInput);
  const selectedCategories = keywordInput
    ? keywordIntent.categories
    : criteria.field
      ? categoriesForField(criteria.field)
      : [];

  const selectedWorkTypes = criteria.workTypes || [];
  const filterByWorkType = selectedWorkTypes.length > 0 && !selectedWorkTypes.includes("any");

  const discoveryNow = new Date();
  const discoveryListings = liveListings.filter((item) =>
    isListingFreshForDiscovery(item, { now: discoveryNow }),
  );

  const keywordRelevantListings = discoveryListings
    .map((item) => ({
      ...item,
      relevance: !keywordInput && selectedCategories.length === 0
        ? 1
        : scoreListingRelevance(item, keywordInput, selectedCategories, keywordIntent),
    }))
    .filter((item) => item.relevance > 0);

  const relevantListings = keywordRelevantListings
    .filter((item) => {
      if (criteria.strictness === "strict" && item.workArrangement === "unlabeled") return false;
      if (filterByWorkType && item.workArrangement !== "unlabeled" && !selectedWorkTypes.includes(item.workArrangement)) return false;
      return true;
    });

  const filtered = relevantListings
    .filter((item) => locationMatches(item.locationData, criteria))
    .sort(compareListingDiscoveryOrder);

  const keywordExactFound = keywordInput && filtered.some((item) => titleMatchesSearchQuery(item, keywordInput));
  const hasLocationFilter = hasStructuredLocationFilter(criteria);
  const searchDiagnostic = listingsStatus === "ready"
    ? diagnoseSearchResults({
      keyword: keywordInput,
      intent: keywordIntent,
      availableCount: discoveryListings.length,
      keywordMatchCount: keywordRelevantListings.length,
      workTypeMatchCount: relevantListings.length,
      filteredCount: filtered.length,
      hasLocationFilter,
      filterByWorkType: filterByWorkType || criteria.strictness === "strict",
      locationLabel: formatLocationPreference(criteria).toLowerCase(),
    })
    : null;
  const dismissedCount = filtered.filter((item) => dismissed.includes(itemKey(item))).length;
  const visibleFiltered = filtered.filter((item) => {
    const key = itemKey(item);
    if (!showDismissed && dismissed.includes(key)) return false;
    if (viewFilter === "saved" && !saved.includes(key)) return false;
    return true;
  });

  const isValidatedField = keywordInput ? keywordIntent.recognized : selectedCategories.length > 0;
  const resumePrivacyWarning = cloudResumeWarning || resumeStorageError;

  const shell = (children, opts = {}) => (
    <div className="wl-shell" style={{ background: C.bgApp, width: "100%", color: C.text, fontFamily: SYS_FONT, padding: "20px 20px 40px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <Link to="/" className="wl-brand-link" aria-label="Gigscapes home">
          <BrandMark size={24} />
          <span style={{ fontFamily: SYS_FONT, fontSize: 17, fontWeight: 750, color: C.text }}>Gigscapes</span>
        </Link>
        {opts.showSignOut && (
          session ? (
            <button
              onClick={handleSignOut}
              className="wl-btn"
              title="Sign out of your private workspace"
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.border}`, borderRadius: 980, padding: "7px 14px", color: C.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: SYS_FONT }}
            >
              <LogOut size={12} /> Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={openSignIn}
              data-account-action-fallback
              className="wl-btn"
              style={{ display: "flex", alignItems: "center", gap: 5, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 980, padding: "7px 14px", color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SYS_FONT }}
            >
              Sign in
            </button>
          )
        )}
      </header>
      {(authError || (session && profileError)) && (
        <div role="status" style={{ maxWidth: 1120, margin: "-12px auto 20px", background: C.amberTint, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 13 }}>
          {session && profileError
            ? "Your private workspace could not be loaded. Public search remains available."
            : authError}
          {session && profileError ? (
            <> <button type="button" onClick={reloadProfile} className="wl-btn" style={{ border: 0, padding: 0, background: "transparent", color: C.text, font: "inherit", fontWeight: 750, textDecoration: "underline", cursor: "pointer" }}>Try again</button></>
          ) : null}
        </div>
      )}
      {continuationNotice && (
        <div role="status" style={{ maxWidth: 1120, margin: "-12px auto 20px", background: C.blueTint, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 13, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{continuationNotice}</span>
          <button type="button" onClick={() => setContinuationNotice("")} aria-label="Dismiss message" className="wl-btn" style={{ border: 0, background: "transparent", color: C.textSub, cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}
      {profileWriteError && (
        <div role="alert" style={{ maxWidth: 1120, margin: "-12px auto 20px", background: C.amberTint, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 13 }}>
          {profileWriteError}
        </div>
      )}
      {cloudResumeWarning && (
        <div role="alert" style={{ maxWidth: 1120, margin: "-12px auto 20px", background: C.amberTint, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 13 }}>
          {cloudResumeWarning}
        </div>
      )}
      {children}
      {privateProcessing.pending ? (
        <PrivateProcessingDialog
          scope={privateProcessing.pending.scope}
          onCancel={privateProcessing.cancel}
          onConfirm={privateProcessing.confirm}
          returnFocusTarget={privateProcessing.openerRef.current}
        />
      ) : null}
    </div>
  );

  if (step === "loading") return shell(<div style={{ color: C.textSub, fontSize: 14 }}>Loading…</div>);

  if (step === "profile_error") {
    const sessionClockSkew = profileError?.includes("briefly out of sync");
    return shell(
      <div style={{ maxWidth: 460, margin: "40px auto 0", textAlign: "center" }}>
        <div style={{ margin: "0 auto 20px", width: 56, height: 56, borderRadius: "50%", background: C.amberTint, border: `1px solid ${C.amberBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.amber, fontSize: 24, fontWeight: 700 }}>
          !
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px", color: C.text }}>
          Couldn't load your profile
        </h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 22px", lineHeight: 1.55 }}>
          {sessionClockSkew
            ? "Supabase is briefly rejecting a newly issued session. Wait a few seconds, then try again; signing out is usually unnecessary."
            : "Something got tangled between the app and the database. This usually clears on a retry. If it keeps happening, sign out and back in with a fresh magic link."}
        </p>
        <p style={{ fontSize: 12, color: C.textFaint, fontFamily: "monospace", margin: "0 0 24px", padding: "8px 12px", background: "#F5F5F7", borderRadius: 8, wordBreak: "break-word" }}>
          {profileError || "Unknown error"}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={reloadProfile}
            className="wl-btn"
            style={{ ...primaryBtnStyle(false), fontSize: 14, padding: "10px 20px" }}
          >
            <RotateCcw size={13} /> Try again
          </button>
          <button
            onClick={handleSignOut}
            className="wl-btn"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, padding: "10px 20px", borderRadius: 980, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, cursor: "pointer", fontFamily: SYS_FONT }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>,
      { showSignOut: false }
    );
  }

  if (step === "welcome") {
    return shell(
      <div style={{ maxWidth: 480 }}>
        <div style={{ margin: "8px 0 28px" }}>
          <BrandMark size={72} />
        </div>
        <h1 className="wl-hero" style={{ fontFamily: SYS_FONT, fontWeight: 700, fontSize: 32, lineHeight: 1.2, letterSpacing: -0.5, margin: "0 0 14px", color: C.text }}>
          Find work that actually fits you.
        </h1>
        <p style={{ color: C.textSub, fontSize: 16, lineHeight: 1.55, margin: "0 0 32px" }}>
          Gigscapes scans job boards, freelance networks, and local listings — then filters out everything that isn't a real fit. Takes about a minute to set up.
        </p>
        <button onClick={() => setStep("field")} className="wl-btn" style={primaryBtnStyle(false)}>
          Get started <ArrowRight size={15} />
        </button>
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "field") {
    return shell(
      <div style={{ maxWidth: 480 }}>
        <ProgressBars current={stepIndex} total={5} />
        <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 1 of 5</div>
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: C.text }}>What are you looking for?</h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 16px" }}>Type a job title or gig — "plumber," "IT manager," whatever fits. We'll match it directly.</p>
        <input
          value={criteria.keyword}
          onChange={(e) => updateCriteria({ keyword: e.target.value, field: null })}
          placeholder="e.g. plumber, IT manager…"
          style={{ width: "100%", background: C.bgCard, border: `1.5px solid ${criteria.keyword ? C.green : C.border}`, borderRadius: 14, padding: "14px 16px", color: C.text, fontSize: 16, fontFamily: SYS_FONT, boxShadow: "0 1px 2px rgba(0,0,0,0.03)", marginBottom: 22 }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12.5, color: C.textFaint, fontWeight: 500 }}>OR PICK A CATEGORY</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          {FIELDS.map((f) => (
            <Chip key={f} active={criteria.field === f} onClick={() => updateCriteria({ field: f, keyword: "" })}>{f}</Chip>
          ))}
        </div>
        <NavRow onNext={() => setStep("location")} nextDisabled={!criteria.field && !criteria.keyword.trim()} />
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "location") {
    return shell(
      <div style={{ maxWidth: 480 }}>
        <ProgressBars current={stepIndex} total={5} />
        <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 2 of 5</div>
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: C.text }}>Set your search area</h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 20px", lineHeight: 1.5 }}>Your country becomes the default market. You can adjust the province and workplace type quickly from the matches page.</p>
        <div style={{ display: "grid", gap: 16, padding: 16, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <LocationPreferenceFields
            countryCode={quickCountryCode}
            region={quickRegion}
            city={quickCity}
            onCountryChange={setQuickCountryCode}
            onRegionChange={setQuickRegion}
            onCityChange={setQuickCity}
            cityExpanded={cityEditorOpen}
            onCityExpandedChange={setCityEditorOpen}
          />
          <WorkplaceTypeChips value={quickLocationMode} onChange={setQuickLocationMode} />
          {quickLocationMode === "remote" && (
            <div style={{ color: C.textFaint, fontSize: 12.5, lineHeight: 1.4 }}>
              Remote jobs may still require you to live in the selected country or province.
            </div>
          )}
        </div>
        <NavRow
          onBack={() => setStep("field")}
          onNext={() => {
            updateCriteria({
              location: quickLocationMode,
              countryCode: quickCountryCode,
              region: quickRegion,
              city: quickCity.trim(),
            });
            setStep("tuning");
          }}
          nextDisabled={!quickLocationMode}
        />
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "tuning") {
    return shell(
      <div style={{ maxWidth: 480 }}>
        <ProgressBars current={stepIndex} total={5} />
        <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 3 of 5</div>
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: C.text }}>What kind of work fits?</h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 20px" }}>Choose one or more. Jobs and gigs stay separate from the kind of work you do.</p>
        <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginBottom: 10 }}>Work arrangement</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
          {WORK_ARRANGEMENT_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              active={(criteria.workTypes || []).includes(option.id)}
              onClick={() => toggleWorkType(option.id)}
              sub={option.hint}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginBottom: 10 }}>How should unlabeled listings be handled?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STRICTNESS.map((s) => (
            <Chip key={s.id} active={criteria.strictness === s.id} onClick={() => updateCriteria({ strictness: s.id })} sub={s.hint}>{s.label}</Chip>
          ))}
        </div>
        <NavRow onBack={() => setStep("location")} onNext={() => setStep("review")} nextDisabled={!criteria.workTypes?.length || !criteria.strictness} />
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "review") {
    const workTypeLabels = (criteria.workTypes || [])
      .map((id) => WORK_ARRANGEMENT_OPTIONS.find((option) => option.id === id)?.label)
      .filter(Boolean)
      .join(", ");
    const rows = [
      ["Search", criteria.keyword ? `"${criteria.keyword}"` : criteria.field],
      ["Location", formatLocationPreference(criteria)],
      ["Work type", workTypeLabels || "Any work type"],
      ["Filtering", STRICTNESS.find((s) => s.id === criteria.strictness)?.label],
    ];
    return shell(
      <div style={{ maxWidth: 480 }}>
        <ProgressBars current={stepIndex} total={5} />
        <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 4 of 5</div>
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 20px", color: C.text }}>Your preferences</h2>
        <div style={{ background: C.bgCard, borderRadius: 18, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.05)" }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 14, color: C.textSub }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{value}</span>
            </div>
          ))}
        </div>
        <NavRow
          onBack={() => setStep("tuning")}
          onNext={async () => {
            if (!session?.user?.id || !profile) {
              setStep("digest");
              return;
            }
            if (profile.onboarding_complete) {
              setStep("digest");
              return;
            }
            try {
              await updateProfile({ onboarding_complete: true });
              setStep("resume_onboarding");
            } catch {
              // The global account-change alert explains the failure.
            }
          }}
          nextLabel={!session?.user?.id || profile?.onboarding_complete ? "Save preferences" : "Next"}
        />
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "resume_onboarding" && session?.user?.id) {
    return shell(
      <div style={{ maxWidth: 560 }}>
        <ProgressBars current={stepIndex} total={5} />
        <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 5 of 5 · Optional</div>
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: C.text }}>Add your résumé</h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 16px", lineHeight: 1.5 }}>
          Paste it now and we'll tailor a fresh version for every gig you apply to. It stays in this browser, not in your Gigscapes database.
        </p>
        <textarea
          value={resumeDraft}
          onChange={(e) => setResumeDraft(e.target.value)}
          placeholder="Paste your résumé text here (experience, skills, past projects)…"
          rows={14}
          style={{ width: "100%", background: C.bgCard, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", color: C.text, fontSize: 14, fontFamily: SYS_FONT, resize: "vertical", marginBottom: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
        />
        <div className="wl-glass wl-btn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 980, padding: "8px" }}>
          <button
            onClick={() => setStep("scanning")}
            className="wl-btn"
            style={glassBtnStyle()}
          >
            Skip for now
          </button>
          <button
            onClick={() => {
              if (resumeDraft.trim() && saveResume(resumeDraft)) setStep("scanning");
            }}
            disabled={!resumeDraft.trim()}
            className="wl-btn"
            style={primaryBtnStyle(!resumeDraft.trim())}
          >
            <Check size={15} /> Save & continue
          </button>
        </div>
        {resumePrivacyWarning ? (
          <p role="alert" style={{ fontSize: 13, color: C.red, marginTop: 12 }}>{resumePrivacyWarning}</p>
        ) : (
          <p style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5, margin: "14px 0 0" }}>
            {RESUME_SYNC_ENABLED
              ? "Saved in this browser by default. You can explicitly enable account sync from the résumé editor. Tailoring sends the selected résumé to our AI provider for that request."
              : "Saved only in this browser on this device. Tailoring sends the selected résumé to our AI provider for that request."}
          </p>
        )}
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "scanning" && session?.user?.id) return shell(<ScanningTransition onDone={() => setStep("digest")} />, { showSignOut: true });

  if (step === "resume" && session?.user?.id) {
    return shell(
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: C.text }}>Your résumé</h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 16px" }}>
          Paste your full résumé here — experience, skills, past projects. It is saved in this browser by default and used as the base for each tailored version.
        </p>
        <textarea
          value={resumeDraft}
          onChange={(e) => setResumeDraft(e.target.value)}
          placeholder="Paste your résumé text here…"
          rows={18}
          style={{ width: "100%", background: C.bgCard, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", color: C.text, fontSize: 14, fontFamily: SYS_FONT, resize: "vertical", marginBottom: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button onClick={() => setStep(resumeReturnStep)} className="wl-btn" style={{ ...glassBtnStyle(), background: "none", border: `1px solid ${C.border}` }}>
            <ArrowLeft size={15} /> Back
          </button>
          <button
            onClick={() => { if (saveResume(resumeDraft)) setStep(resumeReturnStep); }}
            disabled={!resumeDraft.trim()}
            className="wl-btn"
            style={primaryBtnStyle(!resumeDraft.trim())}
          >
            <Check size={15} /> Save résumé
          </button>
        </div>
        {resumePrivacyWarning ? (
          <p role="alert" style={{ fontSize: 13, color: C.red, marginTop: 12 }}>{resumePrivacyWarning}</p>
        ) : (
          <p style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5, margin: "14px 0 0" }}>
            {RESUME_SYNC_ENABLED
              ? "Browser-only is the default. Cross-device account sync is optional and never uploads a different copy without asking. Tailoring sends the selected résumé to our AI provider for that request."
              : "Saved only in this browser on this device. Tailoring sends the selected résumé to our AI provider for that request."}
          </p>
        )}
        <ResumeSyncControls sync={resumeVault} localResume={localResume} />
        <section style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.border}` }} aria-labelledby="local-data-controls-heading">
          <h3 id="local-data-controls-heading" style={{ color: C.text, fontSize: 15, margin: "0 0 6px" }}>Private data on this device</h3>
          <p style={{ color: C.textSub, fontSize: 12.5, lineHeight: 1.55, margin: "0 0 12px" }}>{RESUME_SYNC_ENABLED
            ? "Remove this account’s saved résumé, cover-letter drafts, confirmed evidence, presentation choices, sync preference, and AI-processing acknowledgement from this browser. This does not delete an account-synced résumé, your account, saved jobs, search preferences, sign-in session, or provider-retained request copies."
            : "Remove this account’s saved résumé, cover-letter drafts, confirmed evidence, presentation choices, and AI-processing acknowledgement from this browser. This does not delete your account, saved jobs, search preferences, sign-in session, or provider-retained request copies."}</p>
          {!clearPrivateDataOpen ? (
            <button type="button" onClick={() => { setClearPrivateDataOpen(true); setClearPrivateDataMessage(""); }} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, color: C.red }}>Clear private document data</button>
          ) : (
            <div role="group" aria-label="Confirm local private data deletion" style={{ display: "flex", flexWrap: "wrap", gap: 9, padding: 12, border: `1px solid ${C.amberBorder}`, borderRadius: 12, background: C.amberTint }}>
              <strong style={{ width: "100%", fontSize: 13 }}>Clear this account’s private résumé and cover-letter data from this browser?</strong>
              <button type="button" onClick={clearLocalPrivateData} className="wl-btn" style={{ ...primaryBtnStyle(false), background: C.red }}>Yes, clear local data</button>
              <button type="button" onClick={() => setClearPrivateDataOpen(false)} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}` }}>Cancel</button>
            </div>
          )}
          {clearPrivateDataMessage ? <p role="status" style={{ color: C.textSub, fontSize: 12.5, margin: "10px 0 0" }}>{clearPrivateDataMessage}</p> : null}
        </section>
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "custom_job" && session?.user?.id) {
    return shell(
      <CustomJobFlow
        resume={resume}
        userId={session?.user?.id}
        initialMode={customJobMode}
        initialUrl={customJobInitialUrl}
        C={C}
        primaryBtnStyle={primaryBtnStyle}
        glassBtnStyle={glassBtnStyle}
        onBack={() => setStep("digest")}
        onEditResume={() => openResumeEditor("custom_job")}
        requestPrivateProcessing={privateProcessing.requestPrivateProcessing}
      />,
      { showSignOut: true },
    );
  }

  // digest
  const appliedPlaceLabel = formatLocationSearchValue(criteria) || "Anywhere";
  const appliedWorkplaceLabel = criteria.location === "either"
    ? "All workplaces"
    : LOCATION_OPTIONS.find(({ id }) => id === criteria.location)?.label || "All workplaces";
  return shell(
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <section aria-labelledby="job-matches-heading">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4, gap: 12, flexWrap: "wrap" }}>
        <h1 id="job-matches-heading" style={{ fontFamily: SYS_FONT, fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Today's matches</h1>
        <div style={{ display: "flex", gap: 14 }}>
          {resume && (
            <button
              onClick={() => openResumeEditor("digest")}
              className="wl-btn"
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              <Pencil size={12} /> Edit résumé
            </button>
          )}
          <button
            onClick={() => setStep("field")}
            className="wl-btn"
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            <Pencil size={12} /> Edit preferences
          </button>
        </div>
        </div>
        <p style={{ fontSize: 13.5, color: C.textSub, margin: "6px 0 12px" }}>
        {filtered.length} relevant matches from {loadedCandidateCount} deduplicated candidates for {criteria.keyword ? `"${criteria.keyword}"` : criteria.field?.toLowerCase() || "any work"} · {formatLocationPreference(criteria)}. {" "}
        {listingsStatus === "loading" && "Loading live listings…"}
        {listingsStatus === "loading_more" && "Loading more listings…"}
        {listingsStatus === "error" && (
          <>
            Couldn't reach the listings database{listingsError?.message ? `: ${listingsError.message}` : "."}{" "}
            <button onClick={refetchListings} className="wl-btn" style={{ background: "none", border: "none", padding: 0, color: C.green, fontWeight: 600, cursor: "pointer", font: "inherit" }}>Retry</button>
          </>
        )}
        {listingsStatus === "ready" && lastFetched && `Updated ${lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`}
        </p>
      </section>

      <section aria-label="Search jobs and gigs" style={{ marginBottom: 18, padding: 16, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.025)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ color: C.textSub, fontSize: 12.5, fontWeight: 600 }}>Searching in</span>
          <button
            type="button"
            aria-expanded={locationEditorOpen}
            aria-controls="digest-location-editor"
            onClick={() => setLocationEditorOpen((open) => !open)}
            className="wl-btn"
            style={{ minHeight: 36, display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${locationEditorOpen ? C.text : C.border}`, borderRadius: 980, padding: "7px 11px", background: locationEditorOpen ? "#F0EFEE" : C.bgCard, color: C.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SYS_FONT }}
          >
            <MapPin size={13} /> {appliedPlaceLabel} <ChevronDown size={13} />
          </button>
          <button
            type="button"
            aria-expanded={locationEditorOpen}
            aria-controls="digest-location-editor"
            onClick={() => setLocationEditorOpen(true)}
            className="wl-btn"
            style={{ minHeight: 36, display: "inline-flex", alignItems: "center", border: `1px solid ${C.border}`, borderRadius: 980, padding: "7px 11px", background: C.bgCard, color: C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SYS_FONT }}
          >
            {appliedWorkplaceLabel}
          </button>
        </div>

        {locationEditorOpen && (
          <div id="digest-location-editor" style={{ margin: "0 0 16px", padding: 14, border: `1px solid ${C.border}`, borderRadius: 14, background: "#FAFAFB" }}>
            <LocationPreferenceFields
              countryCode={quickCountryCode}
              region={quickRegion}
              city={quickCity}
              onCountryChange={setQuickCountryCode}
              onRegionChange={setQuickRegion}
              onCityChange={setQuickCity}
              cityExpanded={cityEditorOpen}
              onCityExpandedChange={setCityEditorOpen}
              showCountryControl={false}
              onChangeCountry={() => setStep("location")}
            />
            <div style={{ marginTop: 14 }}>
              <WorkplaceTypeChips value={quickLocationMode} onChange={setQuickLocationMode} />
            </div>
            {quickLocationMode === "remote" && (
              <div style={{ marginTop: 10, color: C.textFaint, fontSize: 12.5, lineHeight: 1.45 }}>
                Remote jobs may still require you to live in {COUNTRY_OPTIONS.find(({ id }) => id === quickCountryCode)?.label || "the selected market"}.
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => {
                  setQuickRegion("");
                  setQuickCity("");
                  setQuickLocationMode("either");
                  setCityEditorOpen(false);
                }}
                className="wl-btn"
                style={{ border: 0, padding: "7px 0", background: "transparent", color: C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SYS_FONT }}
              >
                Clear area filters
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCountryCode(criteria.countryCode || "CA");
                    setQuickRegion(criteria.region || "");
                    setQuickCity(criteria.city || "");
                    setQuickLocationMode(criteria.location || "either");
                    setCityEditorOpen(Boolean(criteria.city));
                    setLocationEditorOpen(false);
                  }}
                  className="wl-btn"
                  style={{ border: `1px solid ${C.border}`, borderRadius: 980, padding: "8px 13px", background: C.bgCard, color: C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SYS_FONT }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCriteria(quickLocationPatch());
                    setLocationEditorOpen(false);
                  }}
                  className="wl-btn"
                  style={{ ...primaryBtnStyle(false), padding: "8px 14px", fontSize: 12.5 }}
                >
                  Apply location
                </button>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyQuickSearch();
          }}
        >
          <label htmlFor="job-search-keyword" style={{ display: "block", minWidth: 0 }}>
            <span style={{ display: "block", color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 7 }}>What job or gig are you looking for?</span>
            <div className="wl-primary-search-row">
              <div style={{ position: "relative" }}>
                <Search size={16} color={C.textFaint} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  id="job-search-keyword"
                  value={quickSearch}
                  onChange={(event) => setQuickSearch(event.target.value)}
                  placeholder="IT manager, electrician, plumber, virtual assistant…"
                  style={{ width: "100%", minWidth: 0, minHeight: 46, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px 11px 41px", color: C.text, fontSize: 14.5, fontFamily: SYS_FONT }}
                />
              </div>
              <button
                type="submit"
                disabled={!quickSearch.trim() && !criteria.field && !criteria.keyword}
                className="wl-btn"
                style={{ ...primaryBtnStyle(!quickSearch.trim() && !criteria.field && !criteria.keyword), minHeight: 46, borderRadius: 12, padding: "10px 17px", fontSize: 13, whiteSpace: "nowrap" }}
              >
                Search <ArrowRight size={15} />
              </button>
            </div>
          </label>
        </form>
        <div aria-live="polite" style={{ marginTop: 10, color: C.textFaint, fontSize: 12.5 }}>
          {filtered.length} relevant {filtered.length === 1 ? "match" : "matches"} · {loadedCandidateCount} deduplicated candidates loaded · {visibleFiltered.length} shown · {formatLocationPreference(criteria)}
          {Number.isInteger(listingsTotal) ? ` · ${listingsTotal} source rows matched the database query` : ""}
        </div>
        {legacyLocationFallback && (
          <div role="status" style={{ marginTop: 8, color: C.amber, fontSize: 12 }}>
            Structured location columns are unavailable, so this session is using compatibility filtering.
          </div>
        )}
      </section>

      <div className="wl-digest-grid">
        <main style={{ minWidth: 0 }}>

      <div className="wl-filterrow" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setViewFilter("all")}
          className="wl-btn"
          style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 14px", borderRadius: 980, cursor: "pointer", border: `1px solid ${viewFilter === "all" ? C.text : C.border}`, background: viewFilter === "all" ? "#F0EFEE" : "transparent", color: viewFilter === "all" ? C.text : C.textSub }}
        >
          All
        </button>
        <button
          onClick={openSavedJobs}
          className="wl-btn"
          style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 14px", borderRadius: 980, cursor: "pointer", border: `1px solid ${viewFilter === "saved" ? C.text : C.border}`, background: viewFilter === "saved" ? "#F0EFEE" : "transparent", color: viewFilter === "saved" ? C.text : C.textSub, display: "flex", alignItems: "center", gap: 4 }}
        >
          <Bookmark size={12} /> Saved ({saved.length})
        </button>
        {dismissedCount > 0 && (
          <button
            onClick={() => setShowDismissed((v) => !v)}
            className="wl-btn"
            style={{ fontSize: 12.5, fontWeight: 500, padding: "6px 14px", borderRadius: 980, cursor: "pointer", border: "none", background: "transparent", color: C.textFaint, display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}
          >
            <RotateCcw size={12} /> {showDismissed ? "Hide" : "Show"} dismissed ({dismissedCount})
          </button>
        )}
      </div>

      {searchDiagnostic && (
        <div
          role={searchDiagnostic.tone === "warning" ? "alert" : "status"}
          style={{
            fontSize: 13,
            color: searchDiagnostic.tone === "warning" ? C.amber : C.blue,
            margin: "0 0 20px",
            padding: "12px 14px",
            background: searchDiagnostic.tone === "warning" ? C.amberTint : C.blueTint,
            borderRadius: 12,
            border: `1px solid ${searchDiagnostic.tone === "warning" ? C.amberBorder : C.blueBorder}`,
            lineHeight: 1.5,
          }}
        >
          <span>{searchDiagnostic.message}</span>
          {searchDiagnostic.suggestions.length > 0 && (
            <span> Try {searchDiagnostic.suggestions.map((suggestion, index) => (
              <span key={suggestion}>
                {index > 0 ? ", " : ""}
                <button
                  type="button"
                  onClick={() => {
                    setQuickSearch(suggestion);
                    updateCriteria({ keyword: suggestion, field: null });
                  }}
                  className="wl-btn"
                  style={{ background: "none", border: "none", padding: 0, color: "inherit", fontWeight: 700, cursor: "pointer", font: "inherit", textDecoration: "underline" }}
                >
                  {suggestion}
                </button>
              </span>
            ))}.</span>
          )}
          {searchDiagnostic.canBroadenLocation && (
            <span> You can also <button
              type="button"
              onClick={() => {
                setQuickRegion("");
                setQuickCity("");
                setQuickLocationMode("either");
                setCityEditorOpen(false);
                updateCriteria({ location: "either", region: "", city: "" });
              }}
              className="wl-btn"
              style={{ background: "none", border: "none", padding: 0, color: "inherit", fontWeight: 700, cursor: "pointer", font: "inherit", textDecoration: "underline" }}
            >search the whole country</button>.</span>
          )}
        </div>
      )}
      {isValidatedField && !searchDiagnostic && keywordRelevantListings.length > 0 && filtered.length > 0 && !keywordExactFound && (
        <p style={{ fontSize: 13, color: C.blue, margin: "0 0 20px", padding: "12px 14px", background: C.blueTint, borderRadius: 12, border: `1px solid ${C.blueBorder}` }}>
          No exact title for "{criteria.keyword}" yet — showing closely related, validated results only.
        </p>
      )}
      {isValidatedField && !keywordInput && <div style={{ marginBottom: 20 }} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visibleFiltered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: C.textFaint, fontSize: 13.5 }}>
            {viewFilter === "saved" ? "Nothing saved yet — tap the bookmark on a listing to keep it here." : "No matches to show."}
          </div>
        )}
        {visibleFiltered.map((item) => {
          const hasLink = item.url && item.url !== "#";
          const stateKey = listingStateKey(item);
          const isExpanded = expandedApply === stateKey;
          const { panelId, headingId } = tailoringPanelDomIds(stateKey);
          const t = tailored[stateKey];
          const av = avatarStyle(item.company);
          const key = itemKey(item);
          const isDismissed = dismissed.includes(key);
          const isSaved = saved.includes(key);
          return (
            <div key={stateKey} className="wl-card" style={{ background: C.bgCard, borderRadius: 18, padding: "18px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.04)", opacity: isDismissed ? 0.5 : 1 }}>
              <div className="wl-cardhead" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                  <div aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 12, background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Building2 size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3, color: C.text }}>{item.title}</div>
                    <div style={{ fontSize: 13.5, color: C.textSub, marginBottom: 8 }}>{item.company}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12.5, color: C.textFaint }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {listingLocationSummary(item)}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {item.type}</span>
                      <SourceAttribution source={item.source} sources={item.sourceAttributions} />
                    </div>
                    <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 8 }}>{item.reason}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <MatchBadge
                    listing={item}
                    keyword={keywordInput}
                    fitAssessment={t?.status === "done" ? t.resumeData?.fit_assessment : null}
                    postingReadiness={t?.status === "done" ? t.postingReadiness || t.atsReview?.posting_readiness : null}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => toggleSave(item)} className="wl-btn" aria-label={isSaved ? `Unsave ${item.title}` : `Save ${item.title}`} title={isSaved ? "Unsave" : "Save"} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: isSaved ? C.green : C.textFaint }}>
                      <Bookmark size={15} fill={isSaved ? C.green : "none"} />
                    </button>
                    <button
                      onClick={() => {
                        toggleDismiss(key);
                        if (!isDismissed && isExpanded) hideTailoringPanel();
                      }}
                      className="wl-btn"
                      title={isDismissed ? "Restore" : "Dismiss"}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.textFaint }}
                    >
                      {isDismissed ? <RotateCcw size={15} /> : <X size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="wl-actionrow" style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                {hasLink && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="wl-btn" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: C.textSub, textDecoration: "none" }}>
                    View listing <ExternalLink size={11} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => openTailoring(item, stateKey)}
                  className="wl-btn"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  aria-label={isExpanded ? `Hide tailoring options for ${item.title}` : `Review and tailor résumé for ${item.title}`}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: C.green, background: "none", border: "none", cursor: "pointer", marginLeft: hasLink ? 0 : "auto" }}
                >
                  <Sparkles size={13} /> {isExpanded ? "Hide tailoring options" : "Review & tailor résumé"}
                </button>
              </div>

              {isExpanded && (
                <div
                  ref={(node) => setTailoringPanelRef(stateKey, node)}
                  id={panelId}
                  role="region"
                  aria-labelledby={headingId}
                  tabIndex={-1}
                  className="wl-tailoring-panel"
                  style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, scrollMarginTop: 96 }}
                >
                  <h3 id={headingId} style={{ color: C.text, fontSize: 15, lineHeight: 1.35, margin: "0 0 10px" }}>
                    Review and tailor for {item.title}
                  </h3>
                  {!resume && (
                    <div>
                      <p style={{ fontSize: 13, color: C.textSub, marginBottom: 10 }}>
                        Add your résumé first so we can tailor it for this gig.
                      </p>
                      <button
                        type="button"
                        onClick={() => openResumeEditor("digest")}
                        className="wl-btn"
                        style={{ ...primaryBtnStyle(false), fontSize: 13, padding: "10px 18px" }}
                      >
                        <Pencil size={13} /> Add my résumé
                      </button>
                    </div>
                  )}
                  {resume && !t && (
                    <div>
                      <p style={{ fontSize: 13, color: C.textSub, marginBottom: 10 }}>
                        We'll analyze the posting evidence and tailor your saved résumé safely. This usually takes 1–2 minutes.
                      </p>
                      <button type="button" onClick={() => handleTailor(item, stateKey)} className="wl-btn" style={{ ...primaryBtnStyle(false), fontSize: 13, padding: "10px 18px" }}>
                        <Sparkles size={13} /> Generate tailored version
                      </button>
                    </div>
                  )}
                  {t?.status === "loading" && (
                    <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <span role="status" style={{ fontSize: 13, color: C.textSub, display: "flex", alignItems: "center", gap: 6 }}>
                        <Loader2 size={14} className="wl-spin" /> {t.phase === "enriching" ? "Loading and validating the full posting…" : "Analyzing evidence and tailoring safely… (usually 1–2 minutes)"}
                      </span>
                      <button type="button" onClick={() => cancelListingTailoring(stateKey)} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, fontSize: 12, padding: "7px 11px" }}>
                        Cancel
                      </button>
                    </div>
                  )}
                  {t?.status === "needs_posting" && (
                    <div>
                      <div
                        role="status"
                        style={{
                          background: C.blueTint,
                          border: `1px solid ${C.blueBorder}`,
                          borderRadius: 12,
                          color: C.textSub,
                          fontSize: 13,
                          lineHeight: 1.5,
                          marginBottom: 12,
                          padding: "11px 13px",
                        }}
                      >
                        <strong style={{ color: C.text, display: "block", marginBottom: 2 }}>
                          This source shared only a job summary
                        </strong>
                        Add the full posting for application-ready tailoring, or keep going now with a clearly marked preliminary draft.
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <button onClick={() => openCustomJob("paste")} className="wl-btn" style={{ ...primaryBtnStyle(false), fontSize: 12.5, padding: "9px 14px" }}>
                          <Text size={13} /> Paste posting
                        </button>
                        <button onClick={() => openCustomJob("screenshots")} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, fontSize: 12.5, padding: "9px 14px" }}>
                          <FileImage size={13} /> Upload screenshots
                        </button>
                        <button onClick={() => handleTailor(item, stateKey, { skipEnrichment: true })} className="wl-btn" style={{ ...glassBtnStyle(), border: `1px solid ${C.border}`, fontSize: 12.5, padding: "9px 14px" }}>
                          Tailor from summary
                        </button>
                      </div>
                    </div>
                  )}
                  {t?.status === "error" && (
                    <div>
                      <p style={{ fontSize: 13, color: C.red, marginBottom: 8 }}>
                        {t.message || "Couldn't generate a tailored version."}
                      </p>
                      <button onClick={() => handleTailor(item, stateKey)} className="wl-btn" style={{ ...primaryBtnStyle(false), fontSize: 13, padding: "10px 18px" }}>
                        <Sparkles size={13} /> Try again
                      </button>
                    </div>
                  )}
                  {t?.status === "done" && (
                    <>
                      {t.enrichment?.source && (
                        <p style={{ fontSize: 12.5, color: C.textFaint, margin: "0 0 10px" }}>
                          Full posting loaded from {t.enrichment.source === "employer_jsonld" ? "employer structured data" : "the employer page"}.
                        </p>
                      )}
                      {(t.postingReadiness || t.atsReview?.posting_readiness)?.fit_allowed === true && (
                        <PositioningSummary assessment={t.resumeData.fit_assessment} C={C} />
                      )}
                      <AtsReview review={t.atsReview} C={C} />
                      {t.evidenceStorageError ? (
                        <p role="alert" style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{t.evidenceStorageError}</p>
                      ) : null}
                      <EvidenceRefinementPanel
                        questions={t.evidenceQuestions || t.atsReview?.evidence_questions || []}
                        initialEvidence={candidateEvidenceByTarget[stateKey] ?? loadCandidateEvidence(session?.user?.id, stateKey)}
                        beforeCoverage={t.baselineCoverage}
                        afterCoverage={t.atsReview?.coverage}
                        loading={false}
                        onSaveAndRetailor={(evidence) => handleEvidenceRetailor(item, stateKey, evidence)}
                        C={C}
                      />
                      <ResumeExperience
                        baseResume={resume}
                        resumeData={t.resumeData}
                        item={item}
                        hasLink={hasLink}
                        atsReview={t.atsReview}
                        candidateEvidence={t.candidateEvidence || []}
                        requestPrivateProcessing={privateProcessing.requestPrivateProcessing}
                        onEditResume={() => openResumeEditor("digest")}
                        onTailoringChangeDecision={(change, decision) => handleTailoringChangeDecision(stateKey, change, decision)}
                        qualityRoute="app"
                        qualityPostingSource="public_listing"
                        C={C}
                        primaryBtnStyle={primaryBtnStyle}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {hasMoreListings && (
          <button
            type="button"
            onClick={loadMoreListings}
            disabled={listingsStatus === "loading_more"}
            className="wl-btn"
            style={{ ...glassBtnStyle(), alignSelf: "center", marginTop: 6, background: C.bgCard, border: `1px solid ${C.border}` }}
          >
            {listingsStatus === "loading_more" ? <Loader2 size={14} className="wl-spin" /> : <ArrowRight size={14} />}
            {listingsStatus === "loading_more" ? "Loading more…" : "Load more listings"}
          </button>
        )}
      </div>
        </main>

        <aside className="wl-digest-side" aria-label="Job search tools">
          <section style={{ padding: 18, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.025)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.green, fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
              <Sparkles size={14} /> Bring your own posting
            </div>
            <h2 style={{ margin: "0 0 6px", color: C.text, fontSize: 16, lineHeight: 1.3 }}>Already found a job?</h2>
            <p style={{ margin: "0 0 14px", color: C.textSub, fontSize: 12.5, lineHeight: 1.5 }}>
              Import the posting by link, screenshots, or text. You&apos;ll review it before we tailor your résumé.
            </p>
            <button
              type="button"
              onClick={() => openCustomJob("url")}
              className="wl-btn"
              style={{ ...primaryBtnStyle(false), width: "100%", justifyContent: "center", padding: "10px 14px", fontSize: 12.5 }}
            >
              <Link2 size={14} /> Paste job link
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => openCustomJob("screenshots")}
                className="wl-btn"
                style={{ ...glassBtnStyle(), justifyContent: "center", border: `1px solid ${C.border}`, padding: "8px 9px", fontSize: 11.5 }}
              >
                <FileImage size={13} /> Screenshots
              </button>
              <button
                type="button"
                onClick={() => openCustomJob("paste")}
                className="wl-btn"
                style={{ ...glassBtnStyle(), justifyContent: "center", border: `1px solid ${C.border}`, padding: "8px 9px", fontSize: 11.5 }}
              >
                <Text size={13} /> Paste text
              </button>
            </div>
          </section>

          <section style={{ padding: 18, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16 }}>
            <h2 style={{ margin: "0 0 12px", color: C.text, fontSize: 14.5 }}>Your search</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: "9px 12px", margin: 0, fontSize: 12.5, lineHeight: 1.4 }}>
              <dt style={{ color: C.textFaint }}>Looking for</dt>
              <dd style={{ margin: 0, color: C.text, fontWeight: 650, textAlign: "right" }}>{criteria.keyword || criteria.field || "Any work"}</dd>
              <dt style={{ color: C.textFaint }}>Location</dt>
              <dd style={{ margin: 0, color: C.text, fontWeight: 650, textAlign: "right" }}>{appliedPlaceLabel}</dd>
              <dt style={{ color: C.textFaint }}>Workplace</dt>
              <dd style={{ margin: 0, color: C.text, fontWeight: 650, textAlign: "right" }}>{appliedWorkplaceLabel}</dd>
            </dl>
            <button
              type="button"
              onClick={() => setStep("field")}
              className="wl-btn"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 980, padding: "8px 12px", background: "transparent", color: C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SYS_FONT }}
            >
              <Pencil size={13} /> Edit all preferences
            </button>
          </section>

          {session ? (
            <section style={{ padding: 18, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16 }}>
              <h2 style={{ margin: "0 0 10px", color: C.text, fontSize: 14.5 }}>Your workspace</h2>
              <button
                type="button"
                onClick={openSavedJobs}
                className="wl-btn"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", border: 0, padding: "7px 0", background: "transparent", color: C.textSub, fontSize: 12.5, fontWeight: 650, cursor: "pointer", fontFamily: SYS_FONT }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Bookmark size={14} /> Saved jobs</span>
                <span>{saved.length}</span>
              </button>
              <button
                type="button"
                onClick={() => openResumeEditor("digest")}
                className="wl-btn"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", border: 0, borderTop: `1px solid ${C.border}`, padding: "11px 0 5px", marginTop: 4, background: "transparent", color: C.textSub, fontSize: 12.5, fontWeight: 650, cursor: "pointer", fontFamily: SYS_FONT }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Pencil size={14} /> Résumé</span>
                <span style={{ color: resume ? C.green : C.amber }}>{resume ? "Ready" : "Add"}</span>
              </button>
            </section>
          ) : (
            <section style={{ padding: 18, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16 }}>
              <h2 style={{ margin: "0 0 7px", color: C.text, fontSize: 14.5 }}>Keep your work private</h2>
              <p style={{ margin: "0 0 12px", color: C.textSub, fontSize: 12.5, lineHeight: 1.5 }}>Sign in only when you want to save jobs, add a résumé, tailor, or export.</p>
              <button type="button" onClick={openSignIn} data-account-action-fallback className="wl-btn" style={{ ...primaryBtnStyle(false), width: "100%", justifyContent: "center", padding: "9px 13px", fontSize: 12.5 }}>
                Sign in to your workspace
              </button>
            </section>
          )}
          <QualitySignalSettings C={C} />
        </aside>
      </div>

      <footer style={{ marginTop: 28, paddingTop: 18, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div style={{ color: C.textFaint, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            Sources may include: We Work Remotely&nbsp;•&nbsp;<SourceAttribution source="Jobs by Adzuna" />&nbsp;•&nbsp;<SourceAttribution source="Jooble" />&nbsp;•&nbsp;<SourceAttribution source="Jobicy" />&nbsp;•&nbsp;<SourceAttribution source="Himalayas" />
          </span>
          <a href="https://www.craigslist.org/about/sites#CA" target="_blank" rel="noreferrer" style={MANUAL_SOURCE_LINK_STYLE}>
            Browse Craigslist Canada directly (not imported) <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>
        <span style={{ fontSize: 12, color: C.textFaint, display: "flex", gap: 12, alignItems: "center" }}><Link to="/privacy" style={{ color: "inherit" }}>Privacy</Link><span>Refreshed daily</span></span>
      </footer>
    </div>,
    { showSignOut: true }
  );
}
