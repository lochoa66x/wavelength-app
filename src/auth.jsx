import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Mail, X } from "lucide-react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router";

import {
  accountActionGateDecision,
  accountActionMessage,
  buildPendingActionAuthRedirectUrl,
  clearPendingAccountAction,
  consumePendingAccountAction,
  persistPendingAccountAction,
  pendingActionFromAuthCallback,
  readPendingAccountAction,
} from "./accountActions.js";
import { BrandMark } from "./BrandMark.jsx";
import {
  magicLinkCooldownRemaining,
  publicAuthErrorMessage,
  recordMagicLinkSubmission,
} from "./authSecurity.js";
import { loadVerifiedAuthSession } from "./authSession.js";
import { supabase } from "./supabase.js";
import {
  APP_PATH,
  buildAuthRedirectUrl,
  resolveAuthCallbackState,
  safeNextPath,
  SIGN_IN_PATH,
} from "./authRoutes.js";
import { captureAccountActionOpener, restoreAccountActionFocus } from "./authFocus.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signInRequest, setSignInRequest] = useState(null);
  const signInOpenerRef = useRef(null);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active || event === "INITIAL_SESSION") return;
      setSession(nextSession);
      setError("");
      setLoading(false);
      if (nextSession?.user?.id) setSignInRequest(null);
    });

    async function initialize() {
      try {
        const result = await loadVerifiedAuthSession(supabase.auth);
        if (!active) return;
        setSession(result.session);
        setError(result.error);
      } catch {
        if (active) {
          setSession(null);
          setError("Account features are temporarily unavailable. Public job search is still available.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    clearPendingAccountAction();
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) throw signOutError;
    setSession(null);
  }, []);

  const requestAccountAction = useCallback((action, {
    listingId,
    returnPath = APP_PATH,
    continuation,
  } = {}) => {
    const decision = accountActionGateDecision({ session, action, listingId, returnPath });
    if (decision.outcome === "rejected") return false;
    if (decision.outcome === "continue") {
      continuation?.();
      return true;
    }

    const continuationStored = persistPendingAccountAction(decision.pending);
    signInOpenerRef.current = captureAccountActionOpener();
    setSignInRequest({ action, pending: decision.pending, continuationStored });
    return false;
  }, [session]);

  const openSignIn = useCallback(() => {
    signInOpenerRef.current = captureAccountActionOpener();
    setSignInRequest({ action: null, pending: null, continuationStored: true });
  }, []);

  const closeSignIn = useCallback(() => {
    setSignInRequest((current) => {
      if (current?.pending) clearPendingAccountAction();
      return null;
    });
  }, []);

  const consumeAccountAction = useCallback(
    (now) => consumePendingAccountAction(undefined, now),
    [],
  );

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      error,
      signOut,
      requestAccountAction,
      openSignIn,
      consumeAccountAction,
    }),
    [session, loading, error, signOut, requestAccountAction, openSignIn, consumeAccountAction],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {signInRequest ? <AccountActionDialog request={signInRequest} onClose={closeSignIn} returnFocusTarget={signInOpenerRef.current} /> : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

function AuthStatus({ title, message, spinning = false, children }) {
  return (
    <>
      <AuthFocusStyles />
      <main style={styles.page}>
        <section style={styles.card} aria-live="polite">
          {spinning && <Loader2 size={24} style={styles.spinner} aria-hidden="true" />}
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.copy}>{message}</p>
          {children}
        </section>
      </main>
    </>
  );
}

// Kept for genuinely private routes. /app deliberately does not use this.
export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <AuthStatus title="Loading Gigscapes" message="Checking your session…" spinning />;
  if (!session) {
    const requestedPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`${SIGN_IN_PATH}?next=${encodeURIComponent(safeNextPath(requestedPath))}`} replace />;
  }
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  if (session) return <Navigate to={safeNextPath(searchParams.get("next"))} replace />;
  return children;
}

export function AuthCallback() {
  const { session, loading, error } = useAuth();
  const [searchParams] = useSearchParams();
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const callbackError = searchParams.get("error") || hashParams.get("error");
  const storedPending = readPendingAccountAction();
  const callbackPending = pendingActionFromAuthCallback(searchParams);
  const pending = storedPending || callbackPending;
  const nextPath = pending?.returnPath || safeNextPath(searchParams.get("next"));
  const state = resolveAuthCallbackState({ loading, session, callbackError, authError: error });
  const continuationKey = state.status === "authenticated"
    ? `${pending?.action || "none"}:${pending?.listingId || ""}:${pending?.createdAt || ""}`
    : null;
  const [restoredContinuationKey, setRestoredContinuationKey] = useState(null);

  useEffect(() => {
    if (state.status === "failed") clearPendingAccountAction();
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "authenticated") return;
    if (!storedPending && callbackPending) persistPendingAccountAction(callbackPending);
    setRestoredContinuationKey(continuationKey);
  }, [state.status, continuationKey, storedPending?.createdAt, callbackPending?.createdAt]);

  if (state.status === "checking") {
    return <AuthStatus title="Signing you in" message="Verifying your magic link…" spinning />;
  }
  if (state.status === "authenticated" && restoredContinuationKey !== continuationKey) {
    return <AuthStatus title="Signing you in" message="Restoring your requested action…" spinning />;
  }
  if (state.status === "authenticated") return <Navigate to={nextPath} replace />;

  return (
    <AuthStatus
      title="That sign-in link did not work"
      message="It may have expired or already been used. Request a fresh link, or continue browsing jobs without signing in."
    >
      <div style={styles.linkRow}>
        <Link to={`${SIGN_IN_PATH}?next=${encodeURIComponent(APP_PATH)}`} style={styles.primaryLink}>Request a new link</Link>
        <Link to={APP_PATH} style={styles.secondaryLink}>Browse jobs</Link>
      </div>
    </AuthStatus>
  );
}

function MagicLinkForm({ nextPath = APP_PATH, pending, onCancel }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || status === "sending" || status === "sent") return;

    const remaining = magicLinkCooldownRemaining();
    if (remaining > 0) {
      setStatus("error");
      setMessage(`Please wait ${Math.ceil(remaining / 1000)} seconds before requesting another link.`);
      return;
    }

    setStatus("sending");
    setMessage("");
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: pending
          ? buildPendingActionAuthRedirectUrl(window.location.origin, pending)
          : buildAuthRedirectUrl(window.location.origin, nextPath),
        shouldCreateUser: true,
      },
    });

    if (signInError) {
      setStatus("error");
      setMessage(publicAuthErrorMessage(signInError));
    } else {
      recordMagicLinkSubmission();
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div style={styles.success} role="status">
        <Mail size={18} aria-hidden="true" />
        <div>
          <strong>Check your email</strong>
          <p style={styles.successCopy}>Use the secure magic link to continue. The message is the same whether this account is new or existing.</p>
        </div>
      </div>
    );
  }

  const emailId = onCancel ? "account-action-email" : "email";
  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={emailId} style={styles.label}>Email address</label>
      <input
        id={emailId}
        name="email"
        type="email"
        autoComplete="email"
        required
        data-account-action-initial-focus={onCancel ? "true" : undefined}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="auth-focusable"
        style={styles.input}
      />
      <button
        type="submit"
        disabled={!email.trim() || status === "sending"}
        className="auth-focusable"
        style={{ ...styles.button, opacity: !email.trim() || status === "sending" ? 0.55 : 1 }}
      >
        {status === "sending" ? "Sending…" : "Send magic link"}
      </button>
      {onCancel ? <button type="button" onClick={onCancel} className="auth-focusable" style={styles.cancelButton}>Not now</button> : null}
      {status === "error" && <p role="alert" style={styles.error}>{message}</p>}
    </form>
  );
}

function AccountActionDialog({ request, onClose, returnFocusTarget }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector?.("[data-account-action-initial-focus]")?.focus?.();
    });
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href], textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      restoreAccountActionFocus(returnFocusTarget);
    };
  }, [onClose, returnFocusTarget]);

  const description = request.action
    ? accountActionMessage(request.action)
    : "Sign in to save jobs and use your private workspace.";

  return (
    <div style={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <AuthFocusStyles />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="account-action-title" aria-describedby="account-action-description" style={styles.dialog}>
        <button type="button" onClick={onClose} aria-label="Close sign-in" className="auth-focusable" style={styles.closeButton}>
          <X size={18} aria-hidden="true" />
        </button>
        <div style={styles.mark} aria-hidden="true"><BrandMark size={42} /></div>
        <h1 id="account-action-title" style={styles.title}>Continue with a private account</h1>
        <p id="account-action-description" style={styles.actionCopy}>{description}</p>
        <p style={styles.copy}>We’ll send a secure magic link—no password needed.</p>
        {!request.continuationStored ? (
          <p role="status" style={styles.storageWarning}>Your browser blocked session storage. After signing in, repeat this action; no private content was stored.</p>
        ) : null}
        <MagicLinkForm nextPath={request.pending?.returnPath || APP_PATH} pending={request.pending} onCancel={onClose} />
      </section>
    </div>
  );
}

export function SignInPage() {
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const pending = readPendingAccountAction();

  return (
    <main style={styles.page}>
      <AuthFocusStyles />
      <section style={styles.card}>
        <div style={styles.mark} aria-hidden="true"><BrandMark size={48} /></div>
        <h1 style={styles.title}>Sign in to Gigscapes</h1>
        <p style={styles.actionCopy}>{pending ? accountActionMessage(pending.action) : "Save jobs and use your private workspace."}</p>
        <p style={styles.copy}>Enter your email and we’ll send you a secure magic link—no password needed.</p>
        <MagicLinkForm nextPath={pending?.returnPath || nextPath} pending={pending} />
        <Link to={APP_PATH} style={{ ...styles.secondaryLink, display: "block", marginTop: 16, textAlign: "center" }}>Continue browsing without signing in</Link>
      </section>
    </main>
  );
}

function AuthFocusStyles() {
  return <style>{`
    @keyframes auth-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .auth-focusable:focus-visible { outline: 3px solid rgba(254, 94, 3, 0.35); outline-offset: 2px; }
  `}</style>;
}

const styles = {
  page: { minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, background: "#F5F5F7", color: "#1C1917", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  card: { width: "min(100%, 430px)", padding: "34px 32px", borderRadius: 22, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 18px 60px rgba(28,25,23,0.09)" },
  backdrop: { position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 18, background: "rgba(20,18,17,0.48)", backdropFilter: "blur(5px)" },
  dialog: { position: "relative", width: "min(100%, 450px)", maxHeight: "calc(100dvh - 36px)", overflowY: "auto", padding: "32px 30px", borderRadius: 22, background: "#FFFFFF", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 24px 80px rgba(0,0,0,0.2)", color: "#1C1917", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  closeButton: { position: "absolute", top: 14, right: 14, display: "grid", placeItems: "center", width: 36, height: 36, border: "1px solid #E2DEDA", borderRadius: "50%", background: "white", color: "#6B6763", cursor: "pointer" },
  mark: { width: 48, height: 48, marginBottom: 20 },
  title: { margin: "0 0 10px", fontSize: 27, lineHeight: 1.2, letterSpacing: -0.4 },
  actionCopy: { margin: "0 0 8px", color: "#1C1917", fontSize: 15, fontWeight: 700, lineHeight: 1.5 },
  copy: { margin: "0 0 24px", color: "#6B6763", fontSize: 14, lineHeight: 1.55 },
  label: { display: "block", marginBottom: 8, fontSize: 13, fontWeight: 650 },
  input: { width: "100%", boxSizing: "border-box", padding: "13px 14px", marginBottom: 12, border: "1px solid #D9D5D1", borderRadius: 12, background: "white", color: "#1C1917", font: "inherit" },
  button: { width: "100%", padding: "13px 16px", border: 0, borderRadius: 999, background: "#1C1917", color: "white", font: "inherit", fontWeight: 700, cursor: "pointer" },
  cancelButton: { width: "100%", marginTop: 8, padding: "10px 16px", border: 0, background: "transparent", color: "#6B6763", font: "inherit", fontWeight: 650, cursor: "pointer" },
  error: { margin: "12px 0 0", color: "#B42318", fontSize: 13, lineHeight: 1.45 },
  storageWarning: { margin: "-12px 0 16px", padding: 10, borderRadius: 10, background: "#FFF4E8", color: "#8A4A16", fontSize: 12.5, lineHeight: 1.45 },
  success: { display: "flex", gap: 12, padding: 16, border: "1px solid #A7D7B5", borderRadius: 14, background: "#ECF8EF", color: "#176B38" },
  successCopy: { margin: "4px 0 0", color: "#335D40", fontSize: 13, lineHeight: 1.45 },
  spinner: { marginBottom: 16, color: "#FE5E03", animation: "auth-spin 0.9s linear infinite" },
  linkRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  primaryLink: { display: "inline-flex", padding: "10px 16px", borderRadius: 999, background: "#1C1917", color: "white", textDecoration: "none", fontWeight: 700, fontSize: 13 },
  secondaryLink: { display: "inline-flex", padding: "10px 16px", color: "#6B6763", textDecoration: "underline", fontWeight: 650, fontSize: 13 },
};
