# Live application document review and release

Improve Gigscapes by testing the documents that its production AI actually generates. Start from the current clean release, record its commit and deployment, and preserve the original inputs and outputs. Execute the review, fix reproducible defects, validate the fixes, commit the work, and deploy through the existing production workflow.

## Ten complete cases

Use ten distinct fictional candidate histories and complete fictional postings: bookkeeper, residential plumber, finish carpenter, dental receptionist, warehouse associate, early childhood educator, customer support representative, freelance translator, bicycle mechanic, and junior data analyst. Include employed, freelance, entry-level, and experienced applicants. Give each source realistic scope, dates, employers, tools, and a small number of explicit outcomes. Include diacritics, part-time work, a portfolio URL, supervised experience, a credential in progress, and a required condition that has not been confirmed. Do not provide prewritten model answers.

Generate a tailored résumé and matching letter through the authenticated live service for each case. Preserve every failure and first response. Record retries separately; do not count fixture replay as fresh generation. Protect the user's real résumé and existing applications, and restore any temporary changes to their original values. Do not submit applications or contact employers.

## Review every pair

1. Trace consequential claims to the supplied source. Preserve historical titles, employers, dates, quantities, units, time periods, team attribution, negation, credential status, and scope of responsibility. Do not promote training to certification, assistance to ownership, or a missing availability condition to a promise.
2. Judge job relevance and example selection. The résumé should prioritize relevant evidence without erasing useful chronology. The letter should develop the strongest supported example and explain its relevance without reciting the résumé or the posting.
3. Critique writing bluntly. Flag generic openings and closings, repeated facts, keyword inventories, awkward fragments, unnecessary qualifications, unexplained abbreviations, unsupported enthusiasm, and language that does not suit the profession. Prefer fewer useful sentences to padded prose. A freelance application may warrant a short message.
4. Review the preview and the exported documents. Check hierarchy, whitespace, font sizes, contact details, links, section order, role grouping, page breaks, clipping, stranded headings, duplicate sections, and empty pages. Test desktop and narrow mobile layouts.
5. Exercise real PDF and DOCX download buttons and verify saved files. Exercise Copy and paste into a text field, then compare the pasted text with the current document. Do not report clicking a button as proof that saving or copying succeeded.
6. Render DOCX files with an available supported Word-compatible engine. Inspect every rendered page and compare its content with the PDF and preview. Structural OOXML checks supplement visual review. If native Word is unavailable, label the actual renderer used; if no supported renderer works, record the concrete limitation.

## Fix and release

Classify each finding by user impact and provide the exact case, input, observed output, expected behavior, and likely cause. Fix the shared behavior responsible for the defect. Do not weaken evidence validation or silently alter test inputs to manufacture passes. Separate deterministic failures from subjective writing judgments.

Add focused regression tests for consequential fixes. Re-run affected live cases when generation behavior changes and retain before/after evidence. Run the complete test suite, export checks relevant to the change, production build, and production dependency audit. Review the final diff for secrets, diagnostic routes, temporary authentication overrides, and accidental changes to user data.

Commit only the intended source, tests, and concise review documentation. Use the existing Git-triggered Vercel production deployment, verify that the production alias points to the exact committed SHA, and smoke-test the released application. Deliver the prompt, a ten-case results table, the concrete fixes, validation totals, artifact locations, remaining limitations, commit, and production URL. Distinguish measured results from recommendations and never imply that a finite regression matrix proves all future model output correct.
