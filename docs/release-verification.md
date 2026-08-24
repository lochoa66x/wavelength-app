# Resume export release verification

Run this checklist from the repository root before committing a resume-export release. Do not deploy when any required check fails.

## Automated checks

1. Run focused export/readiness/evidence tests:
   `node --test src/resumeDocx.test.js src/resumePdf.test.js src/candidateEvidenceStorage.test.js src/evidenceRefinement.test.js tests/resumeQuality.test.js`
2. Run `npm run verify:exports`. This creates final and preliminary DOCX/PDF fixtures, parses their visible text, verifies package/PDF structure and reading order, checks for object/metadata artifacts, exercises the canonical readiness gate, and removes the temporary files.
3. Run `npm test` and record the pass/total count.
4. Run `npm run build -- --sourcemap` and record output chunk sizes. Confirm `docx` and `jspdf` remain lazy export chunks; investigate any new main-bundle growth.
5. Run `npm audit --json`. Do not apply a forced dependency upgrade as part of export verification.

## Real-file compatibility checks

Generate persistent fixtures with `npm run verify:exports -- --keep`; they are written below `tmp/export-verification` and are not release artifacts.

1. Open both DOCX fixtures in LibreOffice Writer. Confirm the name/contact header, standard section headings, bullets, line wrapping, page breaks, and preliminary notice. Save a copy as PDF using LibreOffice.
2. Render every direct-PDF page and every LibreOffice-converted page to images. Inspect every page at full size for clipping, overlap, missing glyphs, stranded headings, or excessive whitespace.
3. Extract text independently from the direct PDF and LibreOffice-converted PDF. Confirm candidate identity, target title, experience, education, and languages are in reading order and that `[object Object]`, `undefined`, `null`, and private fixture metadata are absent.
4. Confirm the direct PDF text is selectable/searchable and is not a page-sized image.
5. Manually test the browser buttons for a verified posting, an incomplete posting, a stale ready flag paired with an incomplete posting, and a missing candidate identity. Direct download is primary; the print dialog should appear only when direct PDF creation fails.
6. When available, repeat DOCX checks in Microsoft Word and Google Docs and run both formats through the ATS parsers supported by the release environment.

## Source and release checks

1. Review `git diff --check`, `git diff --stat`, and `git status --short`.
2. Confirm unrelated user changes are preserved and no files under `tmp`, `dist`, or generated verification directories are staged.
3. Confirm the intended commit is not already contained by `origin/main` before reporting deployment state.
4. Commit only after all locally available required checks pass. Do not push or deploy without explicit authorization.
5. After an authorized deployment, verify the production asset manifest, direct PDF download, preliminary labels, missing-identity block, and one verified final export. Record the deployment URL and commit SHA.
