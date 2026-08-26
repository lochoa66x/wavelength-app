# Gigscapes product tour

This release adds two silent, caption-led product videos to the public landing page:

- `gigscapes-product-tour-loop`: a 31.5-second landing-page overview.
- `gigscapes-how-it-works`: a 73.5-second complete walkthrough opened from the tour dialog.

Both cuts are available as H.264 MP4 and VP9 WebM. The shared poster is a PNG. The videos use the real Gigscapes components and a synthetic Ontario electrician named Jordan Lee; they contain no production account, résumé, or job-posting data.

## Story and trust boundary

The seven scenes show search, posting review, evidence-first tailoring, the Evidence Map, an honest material gap, separate content-strategy and visual-design choices, and reviewed DOCX/PDF export. Unsupported Allen-Bradley PLC programming remains a gap rather than becoming candidate evidence. The closing scene says that Gigscapes never auto-applies.

There is intentionally no narration. Every essential idea is visible on screen and repeated in the expandable HTML transcript. That keeps the walkthrough understandable when muted and avoids shipping an audio track with no user value.

## Playback behavior

- The short cut is muted, loops, plays inline, and preloads metadata only.
- Autoplay is disabled for reduced-motion and data-saver users.
- A visible play/pause control is always available.
- The long cut opens in a keyboard-accessible native dialog with browser video controls.
- A poster and text transcript remain available when video decoding fails.
- Analytics are emitted only as local `gigscapes:product-tour-event` events with an allow-listed event name and surface; no candidate or posting data is included.

## Regenerating the assets

1. Start the Vite development server.
2. Open `/__product-tour-capture?autoplay=0&scene=N` at 1280×720 for scenes `0` through `6`. This route is compiled only in development.
3. Capture each scene after its entrance transition finishes. Keep the synthetic fixture in `productTourFixtures.js` unchanged unless the story itself is intentionally revised.
4. Hold each scene for 4.5 seconds for the loop or 10.5 seconds for the full guide.
5. Encode H.264 MP4 with `yuv420p` and `+faststart`; encode a VP9 WebM fallback. Do not add an audio stream unless a fully reviewed narration and captions are supplied together.
6. Run `node --test src/landing/productTour.test.js`, the complete test suite, and the production build. Then verify desktop, mobile, reduced-motion, dialog keyboard behavior, both codecs, poster fallback, and the absence of horizontal overflow.

The deterministic capture surface is deliberately separate from the public application. Production must never expose `/__product-tour-capture`.
