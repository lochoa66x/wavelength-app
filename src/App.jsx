import { useState, useEffect, useRef } from "react";
import { MapPin, Clock, ExternalLink, Check, ArrowRight, ArrowLeft, Pencil, Sparkles, Copy, Loader2, CheckCircle2, Circle, Search, Bookmark, X, RotateCcw } from "lucide-react";
import { ResumeTemplate } from "./ResumeTemplate.jsx";

const SYS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif";
const SUPABASE_URL = "https://rewqochjjdsgkeintdfj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJld3FvY2hqamRzZ2tlaW50ZGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTkwNzgsImV4cCI6MjEwMTYzNTA3OH0.vTwkBZ-zrowGFoGO9OUztFpv06Gvfh6dsw69cC1Cefs";
const SOURCE_DISPLAY_NAMES = { wwr: "We Work Remotely", adzuna: "Adzuna", craigslist: "Craigslist" };

const LS_PREFIX = "wavelength:";
const localStorageShim = {
  async get(key) { const v = window.localStorage.getItem(LS_PREFIX + key); return v === null ? null : { value: v }; },
  async set(key, value) { window.localStorage.setItem(LS_PREFIX + key, value); return { key, value }; },
};
const storage = (typeof window !== "undefined" && window.storage) ? window.storage : localStorageShim;

function formatJobType(t) {
  if (!t) return "Unlabeled";
  return t.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-");
}

const STYLE_TAG = `
.wl-chip { transition: all 0.15s cubic-bezier(.2,.8,.2,1); }
.wl-chip:hover { border-color: #1D8F5A !important; background: #F0F8F3 !important; }
.wl-chip.active:hover { background: #E3F5EA !important; }
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
  .wl-cardhead { flex-wrap: wrap; row-gap: 12px; }
  .wl-actionrow { flex-wrap: wrap; row-gap: 10px; }
  h1.wl-hero { font-size: 26px !important; }
}
`;

const FIELDS = ["Web & app development","Design & creative","Writing & content","Marketing & social media","Admin & data entry","Local & trades","Other"];
const DURATIONS = [{id:"short",label:"Short",hint:"days to weeks"},{id:"medium",label:"Medium",hint:"1-3 months"},{id:"long",label:"Long-term",hint:"ongoing, months+"},{id:"any",label:"Any length",hint:"doesn't matter"}];
const STRICTNESS = [{id:"strict",label:"Strict",hint:"only clearly labeled gigs"},{id:"loose",label:"Loose",hint:"include ambiguous listings"}];
const DEFAULT_CRITERIA = { keyword: "", field: null, location: null, city: "", duration: null, strictness: null };

const C = {
  bgApp: "#F5F5F7", bgCard: "#FFFFFF", text: "#1D1D1F", textSub: "#6E6E73", textFaint: "#9A9AA0",
  border: "#E5E5EA", green: "#1D8F5A", greenTint: "#E3F5EA", greenBorder: "#BFE6D0",
  blue: "#0071E3", blueTint: "#E8F1FC", blueBorder: "#C7DFF8",
  amber: "#B9791A", amberTint: "#FFF6E9", amberBorder: "#F5D9A8", red: "#C0392B",
};
const AVATAR_PALETTE = [
  { bg: "#E3F5EA", color: "#1D8F5A" }, { bg: "#E8F1FC", color: "#0071E3" },
  { bg: "#FFF1E6", color: "#C2703D" }, { bg: "#F1EAFB", color: "#7A4FC9" },
];

function avatarStyle(name) {
  const sum = (name || "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}
function primaryBtnStyle(disabled) {
  return { display: "flex", alignItems: "center", gap: 6, fontFamily: SYS_FONT, fontSize: 15, fontWeight: 600, padding: "12px 22px", borderRadius: 980, border: "none", background: disabled ? "#B9DCC6" : C.green, color: "#FFFFFF", cursor: disabled ? "not-allowed" : "pointer" };
}
function glassBtnStyle() {
  return { display: "flex", alignItems: "center", gap: 6, fontFamily: SYS_FONT, fontSize: 15, fontWeight: 600, padding: "12px 22px", borderRadius: 980, color: C.text, cursor: "pointer" };
}

function useWavelengthState() {
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [step, setStep] = useState("loading");
  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get("wavelength_state");
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setCriteria(parsed.criteria || DEFAULT_CRITERIA);
          setStep(parsed.onboardingComplete ? "digest" : "welcome");
        } else setStep("welcome");
      } catch { setStep("welcome"); }
    })();
  }, []);
  const persist = async (nextCriteria, onboardingComplete) => {
    try { await storage.set("wavelength_state", JSON.stringify({ criteria: nextCriteria, onboardingComplete })); } catch {}
  };
  const updateCriteria = (patch) => setCriteria((c) => ({ ...c, ...patch }));
  return { criteria, updateCriteria, step, setStep, persist };
}

function useResume() {
  const [resume, setResume] = useState("");
  const [status, setStatus] = useState("idle");
  useEffect(() => {
    (async () => { try { const r = await storage.get("resume"); if (r && r.value) setResume(r.value); } catch {} })();
  }, []);
  const save = async (text) => {
    setResume(text); setStatus("saving");
    try { await storage.set("resume", text); setStatus("saved"); setTimeout(() => setStatus("idle"), 1400); } catch { setStatus("idle"); }
  };
  return { resume, setResume, save, status };
}

function itemKey(item) { return `${item.company}::${item.title}`; }

function useItemState() {
  const [dismissed, setDismissed] = useState([]);
  const [saved, setSaved] = useState([]);
  useEffect(() => {
    (async () => {
      try { const d = await storage.get("dismissed_items"); if (d && d.value) setDismissed(JSON.parse(d.value)); } catch {}
      try { const s = await storage.get("saved_items"); if (s && s.value) setSaved(JSON.parse(s.value)); } catch {}
    })();
  }, []);
  const toggleDismiss = async (key) => {
    const next = dismissed.includes(key) ? dismissed.filter((k) => k !== key) : [...dismissed, key];
    setDismissed(next);
    try { await storage.set("dismissed_items", JSON.stringify(next)); } catch {}
  };
  const toggleSave = async (key) => {
    const next = saved.includes(key) ? saved.filter((k) => k !== key) : [...saved, key];
    setSaved(next);
    try { await storage.set("saved_items", JSON.stringify(next)); } catch {}
  };
  return { dismissed, saved, toggleDismiss, toggleSave };
}

function useLiveListings() {
  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState("loading");
  const [lastFetched, setLastFetched] = useState(null);
  const fetchListings = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/listings?select=*&order=fetched_at.desc&limit=1000`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) throw new Error();
      const rows = await res.json();
      setListings(rows.map((row) => ({
        category: row.category, tier: row.tier, title: row.title,
        company: row.company || "Unknown",
        location: row.location || (row.city || "Remote"),
        type: formatJobType(row.job_type), duration: null,
        source: SOURCE_DISPLAY_NAMES[row.source] || row.source,
        city: row.city, reason: row.reason, description: row.description || null, url: row.url,
      })));
      setStatus("ready"); setLastFetched(new Date());
    } catch { setStatus("error"); }
  };
  useEffect(() => { fetchListings(); }, []);
  return { listings, status, lastFetched, refetch: fetchListings };
}

async function tailorResume(resume, item, extraContext) {
  const r = await fetch("/api/tailor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, item, extraContext }),
  });
  if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `Failed (${r.status})`); }
  const data = await r.json();
  if (!data.resume || !data.resume.profile) throw new Error("empty response");
  return data.resume;
}

function ProgressBars({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < current ? C.green : C.border, transition: "background 0.25s" }} />
      ))}
    </div>
  );
}

function Chip({ active, onClick, children, sub }) {
  return (
    <button onClick={onClick} className={`wl-chip${active ? " active" : ""}`}
      style={{ fontFamily: SYS_FONT, fontSize: 15, fontWeight: active ? 600 : 500, padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenTint : C.bgCard, color: active ? C.green : C.text, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", boxShadow: active ? "none" : "0 1px 2px rgba(0,0,0,0.03)" }}>
      <span>{children}{sub && <div style={{ fontSize: 12.5, color: active ? "#3AA876" : C.textSub, marginTop: 2, fontWeight: 400 }}>{sub}</div>}</span>
      {active && <CheckCircle2 size={18} color={C.green} style={{ flexShrink: 0 }} />}
    </button>
  );
}

function NavRow({ onBack, onNext, nextLabel = "Next", nextDisabled }) {
  return (
    <div className="wl-glass" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, borderRadius: 980, padding: "8px" }}>
      {onBack ? <button onClick={onBack} className="wl-btn" style={glassBtnStyle()}><ArrowLeft size={15} /> Back</button> : <span />}
      <button onClick={onNext} disabled={nextDisabled} className="wl-btn" style={primaryBtnStyle(nextDisabled)}>{nextLabel} <ArrowRight size={15} /></button>
    </div>
  );
}

function TierBadge({ tier }) {
  const isHigh = tier === "HIGH";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 980, background: isHigh ? C.greenTint : C.blueTint, border: `1px solid ${isHigh ? C.greenBorder : C.blueBorder}` }}>
      {isHigh ? <CheckCircle2 size={13} color={C.green} /> : <Circle size={11} color={C.blue} />}
      <span style={{ fontFamily: SYS_FONT, fontSize: 11.5, fontWeight: 600, color: isHigh ? C.green : C.blue }}>{isHigh ? "Strong match" : "Possible match"}</span>
    </div>
  );
}

function WavelengthMark({ size = 24, pulse = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {pulse && <div style={{ position: "absolute", inset: -size * 0.18, borderRadius: size * 0.32, background: C.greenTint, animation: "wl-pulse 2.2s ease-in-out infinite" }} />}
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "relative", display: "block" }}>
        <defs>
          <linearGradient id="wl-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#2FB579" /><stop offset="100%" stopColor="#166E45" /></linearGradient>
          <radialGradient id="wl-s" cx="30%" cy="20%" r="60%"><stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" /><stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" /></radialGradient>
        </defs>
        <rect x="2" y="2" width="96" height="96" rx="28" fill="url(#wl-g)" />
        <rect x="2" y="2" width="96" height="96" rx="28" fill="url(#wl-s)" />
        <path d="M14 54 Q 27 30, 40 54 T 66 54 T 92 54" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="54" r="5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

function ScanningTransition({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1900); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ padding: "70px 32px", textAlign: "center" }}>
      <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 20px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.greenTint, animation: "wl-pulse 1.4s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: C.green }} />
      </div>
      <div style={{ fontFamily: SYS_FONT, fontSize: 14, color: C.textSub, fontWeight: 500 }}>Scanning We Work Remotely, Adzuna…</div>
    </div>
  );
}

const FIELD_CATEGORY = { "Web & app development": "tech", "Local & trades": "trades", "Design & creative": "design", "Writing & content": "writing", "Marketing & social media": "marketing", "Admin & data entry": "admin" };
const CATEGORY_KEYWORDS = {
  tech: { loose: ["developer","engineer","software","programmer","coding","full.?stack","frontend","backend","\\bweb\\b","\\bapp\\b"], strict: ["\\bIT\\b"] },
  trades: { loose: ["plumb","handyman","carpenter","electric","maintenance","hvac","mechanic","contractor","renovation","installer"], strict: [] },
  design: { loose: ["design","graphic","illustrat","creative"], strict: ["\\bUI\\b","\\bUX\\b"] },
  writing: { loose: ["writer","writing","content","copy","editor","blog"], strict: [] },
  marketing: { loose: ["marketing","social media","campaign","brand"], strict: ["\\bSEO\\b","\\bads\\b"] },
  admin: { loose: ["admin","assistant","data entry","virtual assistant","clerk","receptionist","manager"], strict: [] },
};
const VALIDATED_CITIES = ["montreal","toronto","vancouver","calgary","ottawa","edmonton","winnipeg","quebec","victoria","halifax","new york","los angeles","chicago"];

export default function Wavelength() {
  const { criteria, updateCriteria, step, setStep, persist } = useWavelengthState();
  const { resume, setResume, save: saveResume, status: resumeStatus } = useResume();
  const [expandedApply, setExpandedApply] = useState(null);
  const [tailored, setTailored] = useState({});
  const { dismissed, saved, toggleDismiss, toggleSave } = useItemState();
  const { listings, status: listingsStatus, lastFetched, refetch } = useLiveListings();
  const [viewFilter, setViewFilter] = useState("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [extraContext, setExtraContext] = useState({});
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const s = document.createElement("style");
    s.textContent = STYLE_TAG;
    document.head.appendChild(s);
  }, []);

  useEffect(() => { if (step === "digest") setQuickSearch(criteria.keyword || ""); }, [step]);

  const handleTailor = async (item, index, isRetry = false) => {
    setTailored((t) => ({ ...t, [index]: { status: "loading", isRetry } }));
    try {
      const resumeData = await tailorResume(resume, item, extraContext[index]);
      setTailored((t) => ({ ...t, [index]: { status: "done", resumeData } }));
    } catch (err) {
      if (/took too long/i.test(err.message) && !isRetry) return handleTailor(item, index, true);
      setTailored((t) => ({ ...t, [index]: { status: "error", message: err.message } }));
    }
  };

  function guessCategoryFromKeyword(keyword) {
    const k = keyword.toLowerCase();
    for (const [cat, { loose }] of Object.entries(CATEGORY_KEYWORDS)) {
      if (loose.some((p) => new RegExp(p, "i").test(k))) return cat;
    }
    for (const [cat, { strict }] of Object.entries(CATEGORY_KEYWORDS)) {
      if (strict.some((p) => new RegExp(p).test(keyword))) return cat;
    }
    return null;
  }

  const keywordInput = (criteria.keyword || "").trim();
  const guessedCategory = keywordInput ? guessCategoryFromKeyword(keywordInput) : null;
  const selectedCategory = criteria.field ? FIELD_CATEGORY[criteria.field] : guessedCategory;
  const cityInput = (criteria.city || "").toLowerCase().trim();
  const matchedCity = VALIDATED_CITIES.find((c) => cityInput.includes(c));
  const cityNotCovered = selectedCategory === "trades" && criteria.location === "local" && cityInput && !matchedCity;

  const filtered = listings.filter((item) => {
    if (item.category !== selectedCategory) return false;
    if (criteria.strictness === "strict" && item.type === "Unlabeled") return false;
    if (item.category === "trades" && criteria.location === "local" && matchedCity) {
      if (!item.city === matchedCity && !(item.location || "").toLowerCase().includes(matchedCity)) return false;
    }
    return true;
  });

  const keywordExactFound = keywordInput && filtered.some((i) => i.title.toLowerCase().includes(keywordInput.toLowerCase()));
  const dismissedCount = filtered.filter((i) => dismissed.includes(itemKey(i))).length;
  const visible = filtered.filter((item) => {
    const key = itemKey(item);
    if (!showDismissed && dismissed.includes(key)) return false;
    if (viewFilter === "saved" && !saved.includes(key)) return false;
    return true;
  });
  const isValidatedField = Boolean(selectedCategory);
  const stepIndex = { field: 1, location: 2, tuning: 3, review: 4 }[step] || 0;

  const shell = (children) => (
    <div style={{ background: C.bgApp, minHeight: 600, color: C.text, fontFamily: SYS_FONT, padding: "20px 20px 40px" }}>
      <div className="wl-glass" style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 28, borderRadius: 980, padding: "8px 18px 8px 8px", width: "fit-content" }}>
        <WavelengthMark size={26} />
        <span style={{ fontFamily: SYS_FONT, fontSize: 15, fontWeight: 700, color: C.text }}>Wavelength</span>
      </div>
      {children}
    </div>
  );

  if (step === "loading") return shell(<div style={{ color: C.textSub, fontSize: 14 }}>Loading…</div>);

  if (step === "welcome") return shell(
    <div style={{ maxWidth: 480 }}>
      <div style={{ margin: "8px 0 28px" }}><WavelengthMark size={72} pulse /></div>
      <h1 className="wl-hero" style={{ fontFamily: SYS_FONT, fontWeight: 700, fontSize: 32, lineHeight: 1.2, letterSpacing: -0.5, margin: "0 0 14px" }}>Find work that actually fits you.</h1>
      <p style={{ color: C.textSub, fontSize: 16, lineHeight: 1.55, margin: "0 0 32px" }}>Wavelength scans job boards, freelance networks, and local listings — then filters out everything that isn't a real fit.</p>
      <button onClick={() => setStep("field")} className="wl-btn" style={primaryBtnStyle(false)}>Get started <ArrowRight size={15} /></button>
    </div>
  );

  if (step === "field") return shell(
    <div style={{ maxWidth: 480 }}>
      <ProgressBars current={stepIndex} total={4} />
      <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 1 of 4</div>
      <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px" }}>What are you looking for?</h2>
      <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 16px" }}>Type a job title or pick a category.</p>
      <input value={criteria.keyword} onChange={(e) => updateCriteria({ keyword: e.target.value, field: null })} placeholder="e.g. plumber, IT manager…" style={{ width: "100%", background: C.bgCard, border: `1.5px solid ${criteria.keyword ? C.green : C.border}`, borderRadius: 14, padding: "14px 16px", color: C.text, fontSize: 16, fontFamily: SYS_FONT, marginBottom: 22 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 16px" }}><div style={{ flex: 1, height: 1, background: C.border }} /><span style={{ fontSize: 12.5, color: C.textFaint, fontWeight: 500 }}>OR PICK A CATEGORY</span><div style={{ flex: 1, height: 1, background: C.border }} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FIELDS.map((f) => <Chip key={f} active={criteria.field === f} onClick={() => updateCriteria({ field: f, keyword: "" })}>{f}</Chip>)}
      </div>
      <NavRow onNext={() => setStep("location")} nextDisabled={!criteria.field && !criteria.keyword.trim()} />
    </div>
  );

  if (step === "location") return shell(
    <div style={{ maxWidth: 480 }}>
      <ProgressBars current={stepIndex} total={4} />
      <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 2 of 4</div>
      <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px" }}>Where do you want to work?</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        <Chip active={criteria.location === "remote"} onClick={() => updateCriteria({ location: "remote" })}>Remote only</Chip>
        <Chip active={criteria.location === "local"} onClick={() => updateCriteria({ location: "local" })}>Local, in person</Chip>
        <Chip active={criteria.location === "either"} onClick={() => updateCriteria({ location: "either" })}>Either is fine</Chip>
      </div>
      {criteria.location === "local" && <input value={criteria.city} onChange={(e) => updateCriteria({ city: e.target.value })} placeholder="Which city?" style={{ background: C.bgCard, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "13px 16px", color: C.text, fontSize: 16, fontFamily: SYS_FONT, width: "100%" }} />}
      <NavRow onBack={() => setStep("field")} onNext={() => setStep("tuning")} nextDisabled={!criteria.location || (criteria.location === "local" && !criteria.city)} />
    </div>
  );

  if (step === "tuning") return shell(
    <div style={{ maxWidth: 480 }}>
      <ProgressBars current={stepIndex} total={4} />
      <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 3 of 4</div>
      <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px" }}>How long, and how loose?</h2>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Preferred gig length</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
        {DURATIONS.map((d) => <Chip key={d.id} active={criteria.duration === d.id} onClick={() => updateCriteria({ duration: d.id })} sub={d.hint}>{d.label}</Chip>)}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>How strict should filtering be?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {STRICTNESS.map((s) => <Chip key={s.id} active={criteria.strictness === s.id} onClick={() => updateCriteria({ strictness: s.id })} sub={s.hint}>{s.label}</Chip>)}
      </div>
      <NavRow onBack={() => setStep("location")} onNext={() => setStep("review")} nextDisabled={!criteria.duration || !criteria.strictness} />
    </div>
  );

  if (step === "review") {
    const rows = [
      ["Search", criteria.keyword ? `"${criteria.keyword}"` : criteria.field],
      ["Location", criteria.location === "local" ? `Local — ${criteria.city}` : criteria.location === "remote" ? "Remote only" : "Either"],
      ["Gig length", DURATIONS.find((d) => d.id === criteria.duration)?.label],
      ["Filtering", STRICTNESS.find((s) => s.id === criteria.strictness)?.label],
    ];
    return shell(
      <div style={{ maxWidth: 480 }}>
        <ProgressBars current={stepIndex} total={4} />
        <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>Step 4 of 4</div>
        <h2 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 20px" }}>Your frequency</h2>
        <div style={{ background: C.bgCard, borderRadius: 18, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.05)" }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 14, color: C.textSub }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
        <NavRow onBack={() => setStep("tuning")} onNext={async () => { await persist(criteria, true); setStep("scanning"); }} nextLabel="Start scanning" />
      </div>
    );
  }

  if (step === "scanning") return shell(<ScanningTransition onDone={() => setStep("digest")} />);

  // ── digest ──────────────────────────────────────────────────────────────────
  return shell(
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>Today's matches</span>
        <button onClick={() => setStep("review")} className="wl-btn" style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer" }}><Pencil size={12} /> Edit frequency</button>
      </div>
      <p style={{ fontSize: 13.5, color: C.textSub, margin: "6px 0 12px" }}>
        {filtered.length} matches for {criteria.keyword ? `"${criteria.keyword}"` : criteria.field?.toLowerCase()},{" "}
        {criteria.location === "local" ? criteria.city : criteria.location}.{" "}
        {listingsStatus === "loading" && "Loading live listings…"}
        {listingsStatus === "error" && <><span>Couldn't reach listings. </span><button onClick={refetch} className="wl-btn" style={{ background: "none", border: "none", padding: 0, color: C.green, fontWeight: 600, cursor: "pointer", font: "inherit" }}>Retry</button></>}
        {listingsStatus === "ready" && lastFetched && `Updated ${lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`}
      </p>

      <div className="wl-searchrow" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} color={C.textFaint} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && quickSearch.trim()) updateCriteria({ keyword: quickSearch.trim(), field: null }); }} placeholder="Search something else…" style={{ width: "100%", background: C.bgCard, border: `1.5px solid ${C.border}`, borderRadius: 980, padding: "10px 14px 10px 38px", color: C.text, fontSize: 16, fontFamily: SYS_FONT }} />
        </div>
        <button onClick={() => quickSearch.trim() && updateCriteria({ keyword: quickSearch.trim(), field: null })} disabled={!quickSearch.trim()} className="wl-btn" style={{ ...primaryBtnStyle(!quickSearch.trim()), fontSize: 13, padding: "10px 18px" }}>Search</button>
      </div>

      <div className="wl-filterrow" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "saved"].map((f) => (
          <button key={f} onClick={() => setViewFilter(f)} className="wl-btn" style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 14px", borderRadius: 980, cursor: "pointer", border: `1px solid ${viewFilter === f ? C.green : C.border}`, background: viewFilter === f ? C.greenTint : "transparent", color: viewFilter === f ? C.green : C.textSub, display: "flex", alignItems: "center", gap: 4 }}>
            {f === "saved" ? <><Bookmark size={12} /> Saved ({saved.length})</> : "All"}
          </button>
        ))}
        {dismissedCount > 0 && (
          <button onClick={() => setShowDismissed((v) => !v)} className="wl-btn" style={{ fontSize: 12.5, fontWeight: 500, padding: "6px 14px", borderRadius: 980, cursor: "pointer", border: "none", background: "transparent", color: C.textFaint, display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
            <RotateCcw size={12} /> {showDismissed ? "Hide" : "Show"} dismissed ({dismissedCount})
          </button>
        )}
      </div>

      {!isValidatedField && <p style={{ fontSize: 13, color: C.amber, margin: "0 0 20px", padding: "12px 14px", background: C.amberTint, borderRadius: 12, border: `1px solid ${C.amberBorder}` }}>No sources wired in yet for {criteria.keyword ? `"${criteria.keyword}"` : '"Other"'} — all other categories work.</p>}
      {isValidatedField && keywordInput && !keywordExactFound && <p style={{ fontSize: 13, color: C.blue, margin: "0 0 20px", padding: "12px 14px", background: C.blueTint, borderRadius: 12, border: `1px solid ${C.blueBorder}` }}>No exact postings for "{criteria.keyword}" yet — showing closest category.</p>}
      {cityNotCovered && <p style={{ fontSize: 13, color: C.amber, margin: "0 0 20px", padding: "12px 14px", background: C.amberTint, borderRadius: 12, border: `1px solid ${C.amberBorder}` }}>{criteria.city} isn't covered for local trades yet. Validated cities: Montreal, Toronto, Vancouver, Calgary, Ottawa, Edmonton, Winnipeg, Quebec City, Victoria, Halifax, NYC, LA, Chicago.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: C.textFaint, fontSize: 13.5 }}>
            {viewFilter === "saved" ? "Nothing saved yet — tap the bookmark to keep a listing." : "No matches to show."}
          </div>
        )}
        {visible.map((item, i) => {
          const hasLink = item.url && item.url !== "#";
          const isExpanded = expandedApply === i;
          const t = tailored[i];
          const av = avatarStyle(item.company);
          const key = itemKey(item);
          const isDismissed = dismissed.includes(key);
          const isSaved = saved.includes(key);
          return (
            <div key={i} className="wl-card" style={{ background: C.bgCard, borderRadius: 18, padding: "18px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.04)", opacity: isDismissed ? 0.5 : 1 }}>
              <div className="wl-cardhead" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{(item.company || "?").charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 13.5, color: C.textSub, marginBottom: 8 }}>{item.company}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12.5, color: C.textFaint }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {item.location}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {item.type}</span>
                      <span>{item.source}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 8 }}>{item.reason}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <TierBadge tier={item.tier} />
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => toggleSave(key)} className="wl-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: isSaved ? C.green : C.textFaint }}><Bookmark size={15} fill={isSaved ? C.green : "none"} /></button>
                    <button onClick={() => toggleDismiss(key)} className="wl-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.textFaint }}>{isDismissed ? <RotateCcw size={15} /> : <X size={15} />}</button>
                  </div>
                </div>
              </div>

              <div className="wl-actionrow" style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                {hasLink && <a href={item.url} target="_blank" rel="noreferrer" className="wl-btn" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: C.textSub, textDecoration: "none" }}>View listing <ExternalLink size={11} /></a>}
                <button onClick={() => setExpandedApply(isExpanded ? null : i)} className="wl-btn" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: C.green, background: "none", border: "none", cursor: "pointer", marginLeft: hasLink ? 0 : "auto" }}>
                  <Sparkles size={13} /> {isExpanded ? "Hide" : "Tailor résumé & apply"}
                </button>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  {!resume && (
                    <div>
                      <p style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>Paste your résumé to generate a tailored version.</p>
                      <textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste your resume text here…" rows={4} style={{ width: "100%", background: C.bgApp, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", color: C.text, fontSize: 16, fontFamily: SYS_FONT, resize: "vertical", marginBottom: 10 }} />
                      <button onClick={() => saveResume(resume)} disabled={!resume.trim()} className="wl-btn" style={{ ...primaryBtnStyle(!resume.trim()), fontSize: 13, padding: "10px 18px" }}><Check size={13} /> Save résumé</button>
                      {resumeStatus === "saved" && <span style={{ fontSize: 12, color: C.green, marginLeft: 10, fontWeight: 500 }}>Saved</span>}
                    </div>
                  )}
                  {resume && !t && (
                    <div>
                      <p style={{ fontSize: 12.5, color: C.textSub, marginBottom: 6 }}>Optional — paste the full job posting for better tailoring:</p>
                      <textarea value={extraContext[i] || ""} onChange={(e) => setExtraContext((c) => ({ ...c, [i]: e.target.value }))} placeholder="Paste job description here (optional)…" rows={3} style={{ width: "100%", background: C.bgApp, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: SYS_FONT, resize: "vertical", marginBottom: 10 }} />
                      <button onClick={() => handleTailor(item, i)} className="wl-btn" style={{ ...primaryBtnStyle(false), fontSize: 13, padding: "10px 18px" }}><Sparkles size={13} /> Generate tailored version</button>
                    </div>
                  )}
                  {t?.status === "loading" && <span style={{ fontSize: 13, color: C.textSub, display: "flex", alignItems: "center", gap: 6 }}><Loader2 size={14} className="wl-spin" /> {t.isRetry ? "Still tailoring…" : "Tailoring against this gig…"}</span>}
                  {t?.status === "error" && (
                    <div>
                      <p style={{ fontSize: 13, color: C.red, marginBottom: 8 }}>{t.message || "Couldn't generate a tailored version."}</p>
                      <button onClick={() => handleTailor(item, i)} className="wl-btn" style={{ ...primaryBtnStyle(false), fontSize: 13, padding: "10px 18px" }}><Sparkles size={13} /> Try again</button>
                    </div>
                  )}
                  {t?.status === "done" && <ResumeTemplate resumeData={t.resumeData} item={item} hasLink={hasLink} C={C} primaryBtnStyle={primaryBtnStyle} />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28, paddingTop: 18, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: C.textFaint }}>Live sources: We Work Remotely • Adzuna • Craigslist (temporarily paused)</span>
        <span style={{ fontSize: 12, color: C.textFaint }}>Refreshed daily</span>
      </div>
    </div>
  );
}
