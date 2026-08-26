import { BrandMark } from "../BrandMark.jsx";
import { CustomJobFlow } from "../CustomJobFlow.jsx";
import {
  PRODUCT_TOUR_VERSION,
  productTourJobBrief,
  productTourPostingText,
  productTourResume,
  productTourTailoredResult,
} from "./productTourFixtures.js";
import "./productTourCapture.css";

const APP_COLORS = Object.freeze({
  bg: "#F5F5F7",
  bgApp: "#F5F5F7",
  bgCard: "#FFFFFF",
  bgSubtle: "#F8F6F2",
  text: "#1D1D1F",
  textSub: "#6E6E73",
  textFaint: "#6E6E73",
  border: "#E5E5EA",
  green: "#B83800",
  greenTint: "#FEE1CE",
  greenBorder: "#FBC4A0",
  blue: "#005BBB",
  blueTint: "#E8F1FC",
  blueBorder: "#C7DFF8",
  amber: "#B9791A",
  amberTint: "#FFF6E9",
  amberBorder: "#F5D9A8",
  red: "#C0392B",
  redTint: "#FFF1EF",
  redBorder: "#F4B4AD",
});

function primaryBtnStyle(disabled) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 22px",
    borderRadius: 980,
    border: "none",
    background: disabled ? "#FDD5B8" : APP_COLORS.green,
    color: "#FFFFFF",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function glassBtnStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 22px",
    borderRadius: 980,
    color: APP_COLORS.text,
    cursor: "pointer",
  };
}

function waitForDemo(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("The product-tour request was cancelled.", "AbortError"));
    }, { once: true });
  });
}

async function extractDemoPosting(_payload, { signal } = {}) {
  await waitForDemo(900, signal);
  return structuredClone(productTourJobBrief);
}

async function tailorDemoResume(_resume, _target, { signal } = {}) {
  await waitForDemo(1_500, signal);
  return structuredClone(productTourTailoredResult);
}

function runDemoAccountAction(_action, { continuation } = {}) {
  return continuation?.();
}

export default function ProductTourCapture() {
  return (
    <main
      className="product-tour-recording wl-shell"
      data-product-tour-version={PRODUCT_TOUR_VERSION}
      data-product-tour-recording="real-ui"
      data-demo-posting-length={productTourPostingText.length}
    >
      <header className="product-tour-recording-header">
        <span className="wl-brand-link" aria-label="Gigscapes product-tour recording">
          <BrandMark size={26} />
          <strong>Gigscapes</strong>
        </span>
        <span>Evidence-first demo · synthetic data</span>
      </header>
      <div className="product-tour-recording-content">
        <CustomJobFlow
          resume={productTourResume}
          userId="synthetic-product-tour"
          initialMode="paste"
          C={APP_COLORS}
          primaryBtnStyle={primaryBtnStyle}
          glassBtnStyle={glassBtnStyle}
          onBack={() => {}}
          onEditResume={() => {}}
          extractPosting={extractDemoPosting}
          tailorPosting={tailorDemoResume}
          requestAccountAction={runDemoAccountAction}
        />
      </div>
      <aside className="product-tour-recording-trust" aria-label="Product tour trust boundary">
        Real Gigscapes workflow · Synthetic candidate · Missing evidence stays missing
      </aside>
    </main>
  );
}
