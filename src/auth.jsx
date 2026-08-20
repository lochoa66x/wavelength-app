import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Loader2, Mail } from "lucide-react";
import { Navigate, useLocation, useSearchParams } from "react-router";

import { BrandMark } from "./BrandMark.jsx";
import { supabase } from "./supabase.js";
import {
  APP_PATH,
  buildAuthRedirectUrl,
  safeNextPath,
  SIGN_IN_PATH,
} from "./authRoutes.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active || event === "INITIAL_SESSION") return;
      setSession(nextSession);
      setError("");
      setLoading(false);
    });

    async function initialize() {
      try {
        const {
          data: { claims },
          error: claimsError,
        } = await supabase.auth.getClaims();

        if (!active) return;
        if (claimsError || !claims?.sub) {
          setSession(null);
          setLoading(false);
          return;
        }

        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!active) return;
        if (sessionError || currentSession?.user?.id !== claims.sub) {
          setSession(null);
          setError("Your session could not be verified. Please request a new sign-in link.");
        } else {
          setSession(currentSession);
          setError("");
        }
      } catch {
        if (active) {
          setSession(null);
          setError("Authentication is temporarily unavailable. Please try again.");
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
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, error, signOut }),
    [session, loading, error, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

function AuthStatus({ title, message, spinning = false }) {
  return (
    <>
      <style>{"@keyframes auth-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
      <main style={styles.page}>
        <section style={styles.card} aria-live="polite">
          {spinning && <Loader2 size={24} style={styles.spinner} aria-hidden="true" />}
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.copy}>{message}</p>
        </section>
      </main>
    </>
  );
}

export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthStatus title="Loading Gigscapes" message="Checking your session…" spinning />;
  }

  if (!session) {
    const requestedPath = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`${SIGN_IN_PATH}?next=${encodeURIComponent(safeNextPath(requestedPath))}`}
        replace
      />
    );
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return <AuthStatus title="Loading Gigscapes" message="Checking your session…" spinning />;
  }

  if (session) {
    return <Navigate to={safeNextPath(searchParams.get("next"))} replace />;
  }

  return children;
}

export function AuthCallback() {
  const { session, loading, error } = useAuth();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const callbackError = searchParams.get("error_description")
    || searchParams.get("error")
    || hashParams.get("error_description")
    || hashParams.get("error");

  if (loading) {
    return <AuthStatus title="Signing you in" message="Verifying your magic link…" spinning />;
  }

  if (session) return <Navigate to={nextPath} replace />;

  return (
    <AuthStatus
      title="That sign-in link did not work"
      message={callbackError || error || "It may have expired or already been used. Request a fresh link to continue."}
    />
  );
}

export function SignInPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const nextPath = safeNextPath(searchParams.get("next"));

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || status === "sending") return;

    setStatus("sending");
    setMessage("");
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: buildAuthRedirectUrl(window.location.origin, nextPath),
        shouldCreateUser: true,
      },
    });

    if (signInError) {
      setStatus("error");
      setMessage(signInError.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.mark} aria-hidden="true"><BrandMark size={48} /></div>
        <h1 style={styles.title}>Sign in to Gigscapes</h1>
        <p style={styles.copy}>Enter your email and we’ll send you a secure magic link—no password needed.</p>

        {status === "sent" ? (
          <div style={styles.success} role="status">
            <Mail size={18} aria-hidden="true" />
            <div>
              <strong>Check your email</strong>
              <p style={styles.successCopy}>We sent a sign-in link to {email.trim()}.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email" style={styles.label}>Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              style={styles.input}
            />
            <button
              type="submit"
              disabled={!email.trim() || status === "sending"}
              style={{ ...styles.button, opacity: !email.trim() || status === "sending" ? 0.55 : 1 }}
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {status === "error" && <p role="alert" style={styles.error}>{message}</p>}
          </form>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "#F5F5F7",
    color: "#1C1917",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    width: "min(100%, 430px)",
    padding: "34px 32px",
    borderRadius: 22,
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 18px 60px rgba(28,25,23,0.09)",
  },
  mark: {
    width: 48,
    height: 48,
    marginBottom: 24,
  },
  title: { margin: "0 0 10px", fontSize: 28, lineHeight: 1.2, letterSpacing: -0.4 },
  copy: { margin: "0 0 26px", color: "#6B6763", fontSize: 15, lineHeight: 1.55 },
  label: { display: "block", marginBottom: 8, fontSize: 13, fontWeight: 650 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    marginBottom: 12,
    border: "1px solid #D9D5D1",
    borderRadius: 12,
    background: "white",
    color: "#1C1917",
    font: "inherit",
  },
  button: {
    width: "100%",
    padding: "13px 16px",
    border: 0,
    borderRadius: 999,
    background: "#1C1917",
    color: "white",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: { margin: "12px 0 0", color: "#B42318", fontSize: 13, lineHeight: 1.45 },
  success: {
    display: "flex",
    gap: 12,
    padding: 16,
    border: "1px solid #A7D7B5",
    borderRadius: 14,
    background: "#ECF8EF",
    color: "#176B38",
  },
  successCopy: { margin: "4px 0 0", color: "#335D40", fontSize: 13, lineHeight: 1.45 },
  spinner: { marginBottom: 16, color: "#FE5E03", animation: "auth-spin 0.9s linear infinite" },
};
