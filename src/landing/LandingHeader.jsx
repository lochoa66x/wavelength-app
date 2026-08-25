import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router";

import { BrandMark } from "../BrandMark.jsx";
import { useAuth } from "../auth.jsx";
import { APP_PATH } from "../authRoutes.js";

const NAV_LINKS = Object.freeze([
  { href: "#how-it-works", label: "How it works" },
  { href: "#resume-templates", label: "Résumé templates" },
  { href: APP_PATH, label: "Browse jobs", route: true },
]);

export function LandingHeader() {
  const { session, loading, openSignIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuPanelRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const panel = menuPanelRef.current;
    const focusable = panel?.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const items = Array.from(focusable || []);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    items[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  const accountAction = session?.user?.id ? (
    <Link className="landing-link-button landing-link-button--quiet" to={APP_PATH} onClick={closeMenu}>
      Open workspace
    </Link>
  ) : (
    <button
      type="button"
      className="landing-link-button landing-link-button--quiet"
      onClick={() => {
        closeMenu();
        openSignIn();
      }}
      disabled={loading}
    >
      {loading ? "Checking session…" : "Sign in"}
    </button>
  );

  const navigation = (mobile = false) => (
    <>
      <nav className={mobile ? "landing-mobile-links" : "landing-desktop-nav"} aria-label={mobile ? "Mobile navigation" : "Primary navigation"}>
        {NAV_LINKS.map((item) => item.route ? (
          <Link key={item.label} to={item.href} onClick={closeMenu}>{item.label}</Link>
        ) : (
          <a key={item.label} href={item.href} onClick={closeMenu}>{item.label}</a>
        ))}
      </nav>
      <div className={mobile ? "landing-mobile-actions" : "landing-header-actions"}>
        {accountAction}
        <Link className="landing-link-button landing-link-button--primary" to={APP_PATH} onClick={closeMenu}>
          Open app
        </Link>
      </div>
    </>
  );

  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link to="/" className="landing-brand" aria-label="Gigscapes home">
          <BrandMark size={28} />
          <span>Gigscapes</span>
        </Link>

        {navigation()}

        <button
          ref={menuButtonRef}
          type="button"
          className="landing-menu-button"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? "landing-mobile-menu" : undefined}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {menuOpen ? (
        <div
          className="landing-mobile-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeMenu();
          }}
        >
          <div
            id="landing-mobile-menu"
            ref={menuPanelRef}
            className="landing-mobile-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-mobile-menu-title"
          >
            <div className="landing-mobile-panel-heading">
              <span id="landing-mobile-menu-title">Explore Gigscapes</span>
              <button type="button" onClick={closeMenu} aria-label="Close navigation"><X aria-hidden="true" /></button>
            </div>
            {navigation(true)}
          </div>
        </div>
      ) : null}
    </header>
  );
}
