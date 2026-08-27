export function applyPrivateResponseHeaders(res) {
  res.setHeader?.("Cache-Control", "no-store, max-age=0");
  res.setHeader?.("Pragma", "no-cache");
  res.setHeader?.("Referrer-Policy", "no-referrer");
  res.setHeader?.("X-Content-Type-Options", "nosniff");
}
