import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import {
  AuthCallback,
  AuthProvider,
  PublicOnlyRoute,
  SignInPage,
} from "./auth.jsx";
import { APP_PATH, AUTH_CALLBACK_PATH, SIGN_IN_PATH } from "./authRoutes.js";

const Gigscapes = lazy(() => import("./App.jsx"));
const LandingPage = lazy(() => import("./landing/LandingPage.jsx"));
const ProductTourCapture = import.meta.env.DEV
  ? lazy(() => import("./landing/ProductTourCapture.jsx"))
  : null;

function RouteFallback() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading Gigscapes"
      style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FBF8F3", color: "#1C1917", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <span>Loading Gigscapes…</span>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            {ProductTourCapture ? <Route path="/__product-tour-capture" element={<ProductTourCapture />} /> : null}
            <Route
              path={SIGN_IN_PATH}
              element={
                <PublicOnlyRoute>
                  <SignInPage />
                </PublicOnlyRoute>
              }
            />
            <Route path={AUTH_CALLBACK_PATH} element={<AuthCallback />} />
            <Route path={`${APP_PATH}/*`} element={<Gigscapes />} />
            <Route path="*" element={<Navigate to={APP_PATH} replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
