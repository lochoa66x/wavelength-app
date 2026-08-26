# Gigscapes product tour

This release adds two silent product videos recorded from the real Gigscapes workflow:

- `gigscapes-product-tour-loop`: a 25.3-second landing-page overview.
- `gigscapes-how-it-works`: a 61.7-second complete walkthrough opened from the tour dialog.

Both cuts are available as H.264 MP4 and VP9 WebM. The shared poster is a PNG. The videos use the real Gigscapes components and a synthetic Ontario electrician named Jordan Lee; they contain no production account, résumé, or job-posting data.

## Story and trust boundary

The recording shows the actual paste-posting flow, extracted-job review, evidence-first tailoring, the Evidence Map, an honest material gap, the visual-design picker, the changed résumé preview, and the real DOCX/PDF export controls. Unsupported Allen-Bradley PLC programming remains a gap rather than becoming candidate evidence. The interface states that Gigscapes never auto-applies.

There is intentionally no narration. Every essential idea is visible in the interface and repeated in the expandable HTML transcript. That keeps the walkthrough understandable when muted and avoids shipping an audio track with no user value.

## Playback behavior

- The short cut is muted, loops, plays inline, and preloads metadata only.
- Autoplay is disabled for reduced-motion and data-saver users.
- A visible play/pause control is always available.
- The long cut opens in a keyboard-accessible native dialog with browser video controls.
- A poster and text transcript remain available when video decoding fails.
- Analytics are emitted only as local `gigscapes:product-tour-event` events with an allow-listed event name and surface; no candidate or posting data is included.

## Regenerating the assets

1. Start the Vite development server and open `/__product-tour-capture` at 1440×900. This route is compiled only in development.
2. Confirm the page has `data-product-tour-recording="real-ui"`. The route must render `CustomJobFlow` and the production `AtsReview`, `EvidenceMap`, design picker, résumé preview, and export controls. Do not recreate those screens in a presentation component.
3. Paste a complete synthetic posting, review the extracted fields, tailor, open and filter the Evidence Map, choose another visual design, inspect the changed preview, and finish on the real export controls. Keep the synthetic fixture in `productTourFixtures.js` free of personal and production data.
4. Record those browser interactions. A minimal capture-only shell and synthetic response injection are allowed; marketing captions, slide layouts, and manually redrawn product panels are not.
5. Encode H.264 MP4 with `yuv420p` and `+faststart`; encode a VP9 WebM fallback. Do not add an audio stream unless a fully reviewed narration and captions are supplied together.
6. Run `node --test src/landing/productTour.test.js`, the complete test suite, export verification, and the production build. Inspect representative frames, then verify desktop, mobile, reduced-motion, dialog keyboard behavior, both codecs, poster fallback, and the absence of horizontal overflow.

The deterministic capture surface is deliberately separate from the public application. Production must never expose `/__product-tour-capture`.
