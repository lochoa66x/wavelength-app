# Cross-device résumé continuity and intake

## Released contract

- Browser storage remains the default base-résumé location.
- Signed-in users can explicitly enable one private, account-owned base-résumé copy for cross-device use.
- A different local and remote copy always produces a user choice; neither copy wins silently.
- Only reviewed text is saved or synced. Original DOCX, PDF, and image files are not persisted by Gigscapes.
- DOCX and text-based PDF extraction runs in the browser.
- Photo and scanned-PDF transcription requires an authenticated request and a just-in-time private-processing acknowledgement.
- Imported text is editable and cannot replace the saved base résumé until the user presses the save control.

## Mobile and installability assessment

The responsive web app is the canonical near-term mobile product. It supports the operating-system file picker and rear-camera capture without introducing a second native persistence model. A standalone PWA is not part of this release: offline caching of private routes and uploaded résumé material requires a dedicated cache and service-worker threat review first.

Before native iOS or Android work begins, keep the Supabase private-document contract as the shared source of truth and add:

1. explicit device/session management;
2. encrypted-at-rest product policy and key-management review;
3. native document-scanner permission copy and upload cancellation;
4. native deletion verification and account export;
5. parity tests proving web and native clients cannot overwrite divergent revisions.

## Production release checks

1. `VITE_RESUME_SYNC_ENABLED=true` is present in the Production build environment.
2. The private-document migration passes the aggregate-only verification script.
3. A signed-in desktop browser enables sync, saves a unique synthetic résumé, and sees a successful synced state.
4. A separate mobile/browser profile signs into the same account and explicitly restores the synced copy.
5. An intentional divergent edit produces the conflict chooser.
6. DOCX, text PDF, scanned PDF, and multi-photo inputs all reach an editable review state.
7. Canceling OCR leaves the current saved and synced copies unchanged.
8. Application logs and analytics contain source/outcome categories only—never document text, filenames, emails, names, image data, or model responses.
