import { useState, useEffect, useRef } from "react";
import { MapPin, Clock, ExternalLink, Check, ArrowRight, ArrowLeft, Pencil, Sparkles, Loader2, CheckCircle2, Circle, Search, Bookmark, X, RotateCcw, LogOut } from "lucide-react";
import { BrandMark } from "./BrandMark.jsx";
import { AtsReview } from "./AtsReview.jsx";
import { CustomJobFlow } from "./CustomJobFlow.jsx";
import { ResumeTemplateProfessional } from "./ResumeTemplateProfessional.jsx";
import { ResumeTemplateTrades } from "./ResumeTemplateTrades.jsx";
import { loadLocalResume, saveLocalResume } from "./resumeStorage.js";
import { listingStateKey } from "./listingIdentity.js";
import { migrateCloudResume } from "./resumeMigration.js";
import { supabase } from "./supabase.js";
import { tailorResume } from "./tailorClient.js";
import { useAuth } from "./auth.jsx";
import {
  COUNTRY_OPTIONS,
  LOCATION_OPTIONS,
  formatLocationPreference,
  hasStructuredLocationFilter,
  locationMatches,
  normalizeLocationCriteria,
  regionOptionsForCountry,
} from "./listingLocations.js";
import { useLiveListings } from "./useLiveListings.js";
import {
  CATEGORY_FIELDS,
  WORK_ARRANGEMENT_OPTIONS,
  categoriesForField,
  inferKeywordIntent,
  isTradesLikeCategory,
  normalizeFieldLabel,
  scoreListingRelevance,
} from "./listingCategories.js";

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
.wl-chip { transition: all 0.15s cubic-bezier(.2,.8,.2,1); }
.wl-chip:hover { border-color: #1D1D1F !important; background: #FAFAF9 !important; }
.wl-chip.active:hover { background: #E8E6E4 !important; }
.wl-btn { transition: opacity 0.15s, transform 0.12s cubic-bezier(.2,.8,.2,1); }
.wl-btn:hover:not(:disabled) { opacity: 0.88; }
.wl-btn:active:not(:disabled) { transform: scale(0.97); }
.wl-card { transition: box-shadow 0.2s, transform 0.15s; }
.wl-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.07) !important; }
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
@media (max-width: 460px) {
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
  countryCode: "",
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
    if (!session) {
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
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!mounted) return;
      if (fetchError) {
        console.error("Failed to load profile:", fetchError.message);
        setError(fetchError.message || "Couldn't load your profile.");
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
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", session.user.id)
      .select("id")
      .single();

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
  textFaint: "#9A9AA0",
  border: "#E5E5EA",
  // Primary CTA orange — the identity/action moment. Used rarely: only for
  // filled buttons and small semantic accents. Chip/filter active states use
  // dark neutrals inline (not this) so orange stays powerful when it appears.
  green: "#FE5E03",
  // Warm peach — semantic "success/positive" tint. Used for the "Check your
  // email" confirmation card and the "Strong match" tier badge.
  greenTint: "#FEE1CE",
  greenBorder: "#FBC4A0",
  blue: "#0071E3",
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

function TierBadge({ tier }) {
  const isHigh = tier === "HIGH";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 980, background: isHigh ? C.greenTint : C.blueTint, border: `1px solid ${isHigh ? C.greenBorder : C.blueBorder}` }}>
      {isHigh ? <CheckCircle2 size={13} color={C.green} /> : <Circle size={11} color={C.blue} />}
      <span style={{ fontFamily: SYS_FONT, fontSize: 11.5, fontWeight: 600, color: isHigh ? C.green : C.blue }}>
        {isHigh ? "Strong match" : "Possible match"}
      </span>
    </div>
  );
}

function SourceAttribution({ source }) {
  if (source === "Jooble") {
    return <a href="https://ca.jooble.org/" target="_blank" rel="noreferrer" style={SOURCE_LINK_STYLE}>Jooble</a>;
  }

  if (source === "Jobicy") {
    return <a href="https://jobicy.com/" target="_blank" rel="noreferrer" style={SOURCE_LINK_STYLE}>Jobicy</a>;
  }

  if (source !== "Jobs by Adzuna") return <span>{source}</span>;

  return (
    <span aria-label="Jobs by Adzuna" style={ADZUNA_ATTRIBUTION_STYLE}>
      <a href="https://www.adzuna.ca/" target="_blank" rel="noreferrer" style={ADZUNA_LINK_STYLE}>Jobs</a>
      <span>&nbsp;by&nbsp;</span>
      <a href="https://www.adzuna.ca/" target="_blank" rel="noreferrer" style={ADZUNA_NAME_LINK_STYLE}>Adzuna</a>
    </span>
  );
}

function LocationFields({
  countryCode = "",
  region = "",
  city = "",
  onCountryChange,
  onRegionChange,
  onCityChange,
  onApply,
}) {
  const regionOptions = regionOptionsForCountry(countryCode);
  const fieldStyle = {
    width: "100%",
    minWidth: 0,
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "9px 11px",
    color: C.text,
    fontSize: 14,
    fontFamily: SYS_FONT,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      <label style={{ minWidth: 0, color: C.textSub, fontSize: 11.5, fontWeight: 600 }}>
        Country
        <select
          value={countryCode}
          onChange={(event) => onCountryChange(event.target.value)}
          style={{ ...fieldStyle, marginTop: 5 }}
        >
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.id || "any"} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <label style={{ minWidth: 0, color: C.textSub, fontSize: 11.5, fontWeight: 600 }}>
        Province or state
        <select
          value={region}
          onChange={(event) => onRegionChange(event.target.value)}
          disabled={!countryCode}
          style={{ ...fieldStyle, marginTop: 5, opacity: countryCode ? 1 : 0.55 }}
        >
          <option value="">{countryCode ? "Any province or state" : "Choose a country first"}</option>
          {regionOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <label style={{ minWidth: 0, color: C.textSub, fontSize: 11.5, fontWeight: 600 }}>
        City
        <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
          <input
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onApply) onApply();
            }}
            placeholder="Any city"
            aria-label="Preferred city"
            style={fieldStyle}
          />
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="wl-btn"
              aria-label="Apply city filter"
              style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, border: "none", background: C.green, color: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </label>
    </div>
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
        Scanning We Work Remotely, Adzuna, Jooble, and Jobicy…
      </div>
    </div>
  );
}

// ============================================================================
// Main app
// ============================================================================

export default function Gigscapes() {
  const { session, signOut } = useAuth();
  const { profile, loading: profileLoading, error: profileError, writeError: profileWriteError, updateProfile, reloadProfile } = useProfile(session);
  const storedCriteria = profile?.criteria && Object.keys(profile.criteria).length ? profile.criteria : DEFAULT_CRITERIA;
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
    hasMore: hasMoreListings,
    loadMore: loadMoreListings,
    refetch: refetchListings,
    legacyFallback: legacyLocationFallback,
  } = useLiveListings(criteria, { resetKey: listingResetKey });

  const [step, setStep] = useState("loading");
  const [expandedApply, setExpandedApply] = useState(null);
  const [tailored, setTailored] = useState({});
  const [viewFilter, setViewFilter] = useState("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickLocation, setQuickLocation] = useState("");
  const [quickCountryCode, setQuickCountryCode] = useState("");
  const [quickRegion, setQuickRegion] = useState("");
  const [onboardingLocationMode, setOnboardingLocationMode] = useState("");
  const [resumeDraft, setResumeDraft] = useState("");
  const [resumeReturnStep, setResumeReturnStep] = useState("digest");
  const [localResume, setLocalResume] = useState("");
  const [resumeStorageError, setResumeStorageError] = useState("");
  const [cloudResumeWarning, setCloudResumeWarning] = useState("");
  const injected = useRef(false);
  const resumeMigrationStarted = useRef(new Set());

  const resume = localResume;
  const dismissed = profile?.dismissed_listings || [];
  const saved = profile?.saved_listings || [];

  // Search preferences and listing actions remain account-level. The resume is
  // intentionally device-only because it contains much more sensitive data.
  const updateCriteria = (patch) => {
    updateProfile({ criteria: { ...criteria, ...patch } }).catch(() => {});
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
    const savedLocally = saveLocalResume(session?.user?.id, text);
    if (!savedLocally) {
      setResumeStorageError("Your browser blocked local storage, so the résumé was not saved.");
      return false;
    }
    setLocalResume(String(text || "").trim());
    setResumeStorageError("");
    return true;
  };
  const toggleDismiss = (key) => {
    const next = dismissed.includes(key) ? dismissed.filter((k) => k !== key) : [...dismissed, key];
    updateProfile({ dismissed_listings: next }).catch(() => {});
  };
  const toggleSave = (key) => {
    const next = saved.includes(key) ? saved.filter((k) => k !== key) : [...saved, key];
    updateProfile({ saved_listings: next }).catch(() => {});
  };

  const handleTailor = async (item, stateKey) => {
    setTailored((t) => ({ ...t, [stateKey]: { status: "loading" } }));
    try {
      const result = await tailorResume(resume, { listingId: item.id });
      setTailored((t) => ({ ...t, [stateKey]: { status: "done", resumeData: result.resume, atsReview: result.atsReview } }));
    } catch (err) {
      setTailored((t) => ({ ...t, [stateKey]: { status: "error", message: err.message } }));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      setStep("loading");
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
    setLocalResume(loadLocalResume(session?.user?.id));
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

  // Sync step based on auth + profile status
  useEffect(() => {
    if (!session || profileLoading) return;
    // Profile fetch failed for a signed-in user — route to a visible error state
    // instead of hanging forever on "Loading…". Users can retry or sign out.
    if (profileError) { setStep("profile_error"); return; }
    if (!profile) return;
    // Only auto-jump from loading/profile_error — respect step the user navigated to
    if (step === "loading" || step === "profile_error") {
      setStep(profile.onboarding_complete ? "digest" : "welcome");
    }
  }, [session, profileLoading, profile, profileError]);

  useEffect(() => {
    if (step === "digest" || step === "location") {
      setQuickSearch(criteria.keyword || "");
      setQuickLocation(criteria.city || "");
      setQuickCountryCode(criteria.countryCode || "");
      setQuickRegion(criteria.region || "");
    }
    if (step === "location") setOnboardingLocationMode(criteria.location || "");
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
  const keywordIntent = keywordInput ? inferKeywordIntent(keywordInput) : { category: null, subcategory: null };
  const selectedCategories = criteria.field
    ? categoriesForField(criteria.field)
    : keywordIntent.category
      ? [keywordIntent.category]
      : [];

  const selectedWorkTypes = criteria.workTypes || [];
  const filterByWorkType = selectedWorkTypes.length > 0 && !selectedWorkTypes.includes("any");

  const relevantListings = liveListings
    .map((item) => ({
      ...item,
      relevance: scoreListingRelevance(item, keywordInput, selectedCategories),
    }))
    .filter((item) => {
      if (item.relevance <= 0) return false;
      if (criteria.strictness === "strict" && item.workArrangement === "unlabeled") return false;
      if (filterByWorkType && item.workArrangement !== "unlabeled" && !selectedWorkTypes.includes(item.workArrangement)) return false;
      return true;
    });

  const filtered = relevantListings
    .filter((item) => locationMatches(item.locationData, criteria))
    .sort((a, b) => b.relevance - a.relevance);

  const keywordExactFound = keywordInput && filtered.some((item) => item.title.toLowerCase().includes(keywordInput.toLowerCase()));
  const hasKeywordMatches = Boolean(keywordInput && relevantListings.length);
  const hasLocationFilter = hasStructuredLocationFilter(criteria);
  const locationFilteredOut = Boolean(
    hasLocationFilter
    && listingsStatus === "ready"
    && liveListings.length === 0,
  );
  const dismissedCount = filtered.filter((item) => dismissed.includes(itemKey(item))).length;
  const visibleFiltered = filtered.filter((item) => {
    const key = itemKey(item);
    if (!showDismissed && dismissed.includes(key)) return false;
    if (viewFilter === "saved" && !saved.includes(key)) return false;
    return true;
  });

  const isValidatedField = selectedCategories.length > 0;
  const resumePrivacyWarning = cloudResumeWarning || resumeStorageError;

  const shell = (children, opts = {}) => (
    <div className="wl-shell" style={{ background: C.bgApp, width: "100%", color: C.text, fontFamily: SYS_FONT, padding: "20px 20px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div className="wl-glass" style={{ display: "flex", alignItems: "center", gap: 9, borderRadius: 980, padding: "8px 18px 8px 8px", width: "fit-content" }}>
          <BrandMark size={22} />
          <span style={{ fontFamily: SYS_FONT, fontSize: 15, fontWeight: 700, color: C.text }}>Gigscapes</span>
        </div>
        {opts.showSignOut && session && (
          <button
            onClick={handleSignOut}
            className="wl-btn"
            title={session.user.email}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.border}`, borderRadius: 980, padding: "7px 14px", color: C.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: SYS_FONT }}
          >
            <LogOut size={12} /> Sign out
          </button>
        )}
      </div>
      {profileWriteError && (
        <div role="alert" style={{ maxWidth: 720, margin: "-12px auto 20px", background: C.amberTint, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 13 }}>
          {profileWriteError}
        </div>
      )}
      {cloudResumeWarning && (
        <div role="alert" style={{ maxWidth: 720, margin: "-12px auto 20px", background: C.amberTint, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 13 }}>
          {cloudResumeWarning}
        </div>
      )}
      {children}
    </div>
  );

  if (step === "loading") return shell(<div style={{ color: C.textSub, fontSize: 14 }}>Loading…</div>);

  if (step === "profile_error") {
    return shell(
      <div style={{ maxWidth: 460, margin: "40px auto 0", textAlign: "center" }}>
        <div style={{ margin: "0 auto 20px", width: 56, height: 56, borderRadius: "50%", background: C.amberTint, border: `1px solid ${C.amberBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.amber, fontSize: 24, fontWeight: 700 }}>
          !
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px", color: C.text }}>
          Couldn't load your profile
        </h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 22px", lineHeight: 1.55 }}>
          Something got tangled between the app and the database. This usually clears on a retry. If it keeps happening, sign out and back in with a fresh magic link.
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
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: C.text }}>Where and how do you want to work?</h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 20px" }}>Choose a location type. You can change it directly from your results later.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LOCATION_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              active={onboardingLocationMode === option.id}
              onClick={() => setOnboardingLocationMode(option.id)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <LocationFields
            countryCode={quickCountryCode}
            region={quickRegion}
            city={quickLocation}
            onCountryChange={(countryCode) => {
              setQuickCountryCode(countryCode);
              setQuickRegion("");
            }}
            onRegionChange={setQuickRegion}
            onCityChange={setQuickLocation}
          />
        </div>
        <NavRow
          onBack={() => setStep("field")}
          onNext={() => {
            updateCriteria({
              location: onboardingLocationMode,
              countryCode: quickCountryCode,
              region: quickRegion,
              city: quickLocation.trim(),
            });
            setStep("tuning");
          }}
          nextDisabled={!onboardingLocationMode}
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
            try {
              await updateProfile({ onboarding_complete: true });
              setStep("resume_onboarding");
            } catch {
              // The global account-change alert explains the failure.
            }
          }}
          nextLabel="Next"
        />
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "resume_onboarding") {
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
            Saved only in this browser. It will not sync to another device. Tailoring sends it to our AI provider for that request.
          </p>
        )}
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "scanning") return shell(<ScanningTransition onDone={() => setStep("digest")} />, { showSignOut: true });

  if (step === "resume") {
    return shell(
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: C.text }}>Your résumé</h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 16px" }}>
          Paste your full résumé here — experience, skills, past projects. It is saved only in this browser and used as the base for each tailored version.
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
            Saved only in this browser. It will not sync to another device. Tailoring sends it to our AI provider for that request.
          </p>
        )}
      </div>,
      { showSignOut: true }
    );
  }

  if (step === "custom_job") {
    return shell(
      <CustomJobFlow
        resume={resume}
        C={C}
        primaryBtnStyle={primaryBtnStyle}
        glassBtnStyle={glassBtnStyle}
        onBack={() => setStep("digest")}
        onEditResume={() => {
          setResumeDraft(resume || "");
          setResumeReturnStep("custom_job");
          setStep("resume");
        }}
      />,
      { showSignOut: true },
    );
  }

  // digest
  return shell(
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4, gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontFamily: SYS_FONT, fontSize: 20, fontWeight: 700, color: C.text }}>Today's matches</span>
        <div style={{ display: "flex", gap: 14 }}>
          {resume && (
            <button
              onClick={() => { setResumeDraft(resume); setResumeReturnStep("digest"); setStep("resume"); }}
              className="wl-btn"
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              <Pencil size={12} /> Edit résumé
            </button>
          )}
          <button
            onClick={() => setStep("review")}
            className="wl-btn"
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            <Pencil size={12} /> Edit preferences
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13.5, color: C.textSub, margin: "6px 0 12px" }}>
        {filtered.length} loaded matches for {criteria.keyword ? `"${criteria.keyword}"` : criteria.field?.toLowerCase()} · {formatLocationPreference(criteria)}. {" "}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "14px 16px", margin: "0 0 16px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14 }}>
        <div>
          <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Already found a job elsewhere?</div>
          <div style={{ color: C.textSub, fontSize: 12.5, lineHeight: 1.4 }}>Paste it, share its link, or upload screenshots — then tailor your résumé here.</div>
        </div>
        <button type="button" onClick={() => setStep("custom_job")} className="wl-btn" style={{ ...primaryBtnStyle(false), flexShrink: 0, fontSize: 12.5, padding: "9px 14px" }}>
          <Sparkles size={13} /> Tailor a job I found
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 440 }}>
          <Search size={14} color={C.textFaint} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && quickSearch.trim()) updateCriteria({ keyword: quickSearch.trim(), field: null }); }}
            placeholder="Search something else"
            style={{ width: "100%", boxSizing: "border-box", background: C.bgCard, border: `1.5px solid ${C.border}`, borderRadius: 980, padding: "10px 48px 10px 38px", color: C.text, fontSize: 16, fontFamily: SYS_FONT, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
          />
          {/* Small inline submit — tappable on mobile, clickable on desktop.
              Fades in only once there's a query, so an empty state isn't cluttered. */}
          {quickSearch.trim() && (
            <button
              onClick={() => updateCriteria({ keyword: quickSearch.trim(), field: null })}
              aria-label="Search"
              className="wl-btn"
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "none", background: C.green, color: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
            >
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: "12px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSub, fontSize: 12.5, fontWeight: 600 }}>
            <MapPin size={13} /> Location
          </div>
          {hasLocationFilter && (
            <button
              onClick={() => {
                setQuickLocation("");
                setQuickCountryCode("");
                setQuickRegion("");
                updateCriteria({ location: "either", countryCode: "", region: "", city: "" });
              }}
              className="wl-btn"
              style={{ display: "flex", alignItems: "center", gap: 4, padding: 0, border: "none", background: "transparent", color: C.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: SYS_FONT }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {LOCATION_OPTIONS.map((option) => {
            const active = criteria.location === option.id;
            return (
              <button
                key={option.id}
                onClick={() => updateCriteria({ location: option.id })}
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
        <div style={{ marginTop: 10 }}>
          <LocationFields
            countryCode={quickCountryCode}
            region={quickRegion}
            city={quickLocation}
            onCountryChange={(countryCode) => {
              setQuickCountryCode(countryCode);
              setQuickRegion("");
              updateCriteria({ countryCode, region: "" });
            }}
            onRegionChange={(region) => {
              setQuickRegion(region);
              updateCriteria({ region });
            }}
            onCityChange={setQuickLocation}
            onApply={() => updateCriteria({ city: quickLocation.trim() })}
          />
        </div>
        {hasLocationFilter && (
          <div aria-live="polite" style={{ marginTop: 10, color: C.textFaint, fontSize: 12.5 }}>
            Showing {filtered.length} matching results from {liveListings.length} loaded location-matched listings{Number.isInteger(listingsTotal) ? ` (${listingsTotal} available)` : ""} · {formatLocationPreference(criteria)}
          </div>
        )}
        {legacyLocationFallback && (
          <div role="status" style={{ marginTop: 8, color: C.amber, fontSize: 12 }}>
            Structured location columns are unavailable, so this session is using compatibility filtering.
          </div>
        )}
      </div>

      <div className="wl-filterrow" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setViewFilter("all")}
          className="wl-btn"
          style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 14px", borderRadius: 980, cursor: "pointer", border: `1px solid ${viewFilter === "all" ? C.text : C.border}`, background: viewFilter === "all" ? "#F0EFEE" : "transparent", color: viewFilter === "all" ? C.text : C.textSub }}
        >
          All
        </button>
        <button
          onClick={() => setViewFilter("saved")}
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

      {!isValidatedField && (
        <p style={{ fontSize: 13, color: C.amber, margin: "0 0 20px", padding: "12px 14px", background: C.amberTint, borderRadius: 12, border: `1px solid ${C.amberBorder}` }}>
          We couldn't match {criteria.keyword ? `"${criteria.keyword}"` : `"Other"`} to a category. Try a more specific term — like "developer", "designer", "handyman", or "writer" — or use <button onClick={() => setStep("field")} className="wl-btn" style={{ background: "none", border: "none", padding: 0, color: C.amber, fontWeight: 700, cursor: "pointer", font: "inherit", textDecoration: "underline" }}>Edit preferences</button> to pick a category directly.
        </p>
      )}
      {isValidatedField && keywordInput && !hasKeywordMatches && (
        <p style={{ fontSize: 13, color: C.amber, margin: "0 0 20px", padding: "12px 14px", background: C.amberTint, borderRadius: 12, border: `1px solid ${C.amberBorder}` }}>
          No credible postings for "{criteria.keyword}" yet. Unrelated category results are hidden.
        </p>
      )}
      {locationFilteredOut && (
        <p style={{ fontSize: 13, color: C.blue, margin: "0 0 20px", padding: "12px 14px", background: C.blueTint, borderRadius: 12, border: `1px solid ${C.blueBorder}` }}>
          No current listings match {formatLocationPreference(criteria).toLowerCase()}. Try a broader location, or <button onClick={() => { setQuickLocation(""); setQuickCountryCode(""); setQuickRegion(""); updateCriteria({ location: "either", countryCode: "", region: "", city: "" }); }} className="wl-btn" style={{ background: "none", border: "none", padding: 0, color: C.blue, fontWeight: 700, cursor: "pointer", font: "inherit", textDecoration: "underline" }}>search anywhere</button>.
        </p>
      )}
      {isValidatedField && hasKeywordMatches && filtered.length > 0 && !keywordExactFound && (
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
          const t = tailored[stateKey];
          const av = avatarStyle(item.company);
          const key = itemKey(item);
          const isDismissed = dismissed.includes(key);
          const isSaved = saved.includes(key);
          // Pick the résumé template that matches the listing's category —
          // trades listings get the credential-forward Trades template with
          // certifications and safety sections; everything else uses Professional.
          const TemplateComponent = isTradesLikeCategory(item.category)
            ? ResumeTemplateTrades
            : ResumeTemplateProfessional;
          return (
            <div key={stateKey} className="wl-card" style={{ background: C.bgCard, borderRadius: 18, padding: "18px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.04)", opacity: isDismissed ? 0.5 : 1 }}>
              <div className="wl-cardhead" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0, fontFamily: SYS_FONT }}>
                    {(item.company || "?").charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3, color: C.text }}>{item.title}</div>
                    <div style={{ fontSize: 13.5, color: C.textSub, marginBottom: 8 }}>{item.company}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12.5, color: C.textFaint }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {item.location}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {item.type}</span>
                      <SourceAttribution source={item.source} />
                    </div>
                    <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 8 }}>{item.reason}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <TierBadge tier={item.tier} />
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => toggleSave(key)} className="wl-btn" title={isSaved ? "Unsave" : "Save"} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: isSaved ? C.green : C.textFaint }}>
                      <Bookmark size={15} fill={isSaved ? C.green : "none"} />
                    </button>
                    <button onClick={() => toggleDismiss(key)} className="wl-btn" title={isDismissed ? "Restore" : "Dismiss"} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.textFaint }}>
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
                  onClick={() => setExpandedApply(isExpanded ? null : stateKey)}
                  className="wl-btn"
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: C.green, background: "none", border: "none", cursor: "pointer", marginLeft: hasLink ? 0 : "auto" }}
                >
                  <Sparkles size={13} /> {isExpanded ? "Hide" : "Tailor résumé & apply"}
                </button>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  {!resume && (
                    <div>
                      <p style={{ fontSize: 13, color: C.textSub, marginBottom: 10 }}>
                        Add your résumé first so we can tailor it for this gig.
                      </p>
                      <button
                        onClick={() => { setResumeDraft(""); setResumeReturnStep("digest"); setStep("resume"); }}
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
                        We'll pull the posting details from the listing URL and tailor your saved résumé to match. Takes up to a minute.
                      </p>
                      <button onClick={() => handleTailor(item, stateKey)} className="wl-btn" style={{ ...primaryBtnStyle(false), fontSize: 13, padding: "10px 18px" }}>
                        <Sparkles size={13} /> Generate tailored version
                      </button>
                    </div>
                  )}
                  {t?.status === "loading" && (
                    <span style={{ fontSize: 13, color: C.textSub, display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader2 size={14} className="wl-spin" /> Tailoring against this gig… (up to a minute)
                    </span>
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
                      {t.resumeData.fit_assessment?.path === "career_change" && (
                        <div style={{ background: C.amberTint, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                          <div style={{ color: C.amber, fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>Career-change version</div>
                          <div style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Recommended positioning: {t.resumeData.fit_assessment.recommended_level}</div>
                          <div style={{ color: C.text, fontSize: 13, lineHeight: 1.5 }}>{t.resumeData.fit_assessment.note}</div>
                        </div>
                      )}
                      <AtsReview review={t.atsReview} C={C} />
                      <TemplateComponent
                        resumeData={t.resumeData}
                        item={item}
                        hasLink={hasLink}
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
      <div style={{ marginTop: 28, paddingTop: 18, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div style={{ color: C.textFaint, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            Live feeds: We Work Remotely&nbsp;•&nbsp;<SourceAttribution source="Jobs by Adzuna" />&nbsp;•&nbsp;<SourceAttribution source="Jooble" />&nbsp;•&nbsp;<SourceAttribution source="Jobicy" />
          </span>
          <a href="https://www.craigslist.org/about/sites#CA" target="_blank" rel="noreferrer" style={MANUAL_SOURCE_LINK_STYLE}>
            Browse Craigslist Canada directly (not imported) <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>
        <span style={{ fontSize: 12, color: C.textFaint }}>Refreshed daily</span>
      </div>
    </div>,
    { showSignOut: true }
  );
}
