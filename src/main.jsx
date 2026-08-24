import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Gigscapes from "./App.jsx";
import {
  AuthCallback,
  AuthProvider,
  PublicOnlyRoute,
  SignInPage,
} from "./auth.jsx";
import { APP_PATH, AUTH_CALLBACK_PATH, SIGN_IN_PATH } from "./authRoutes.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to={APP_PATH} replace />} />
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
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
