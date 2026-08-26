# Public landing-page architecture

Updated: 2026-08-24

## Scope

P2.2 adds a public marketing route without changing the guest/Auth, Supabase, tailoring, or export trust boundaries. `/` explains the product; `/app` remains the existing anonymously browseable workspace.

## Route ownership

`src/main.jsx` owns the public route table:

| Route | Component | Boundary |
| --- | --- | --- |
| `/` | lazy `LandingPage` | Public; signed-in users may remain here |
| `/app/*` | lazy `Gigscapes` | Public discovery with existing contextual account gates |
| `/sign-in` | existing `SignInPage` | Existing public-only Auth route |
| `/auth/callback` | existing `AuthCallback` | Existing magic-link continuation route |
| unknown | existing redirect to `/app` | Preserves the established fallback |

`AuthProvider` stays above the router so the header can show Sign in or Open workspace without loading a private profile. The landing page itself never calls the profile hook.

## CTA contract

`src/landing/landingIntents.js` is the landing-to-workspace boundary:

| Landing intent | Destination | Existing account action |
| --- | --- | --- |
| Browse jobs & gigs | `/app` | none; remains public |
| Public posting URL | `/app` | `import_posting` |
| Posting screenshots | `/app` | `upload_posting_screenshots` |
| Pasted posting text | `/app` | `paste_posting` |

Only those three existing, allowlisted action strings may enter React Router history state. `App.jsx` validates the state again, maps it to the existing custom-posting mode, invokes the centralized account gate, and immediately replaces the history entry with `state: null`. URLs never contain résumé data, posting text, screenshot data, email, tokens, or profile identifiers. Back, Forward, and refresh therefore cannot replay the private intent.

## Component boundaries

- `LandingPage.jsx` owns page composition, two-path explanation, process/evidence copy, discovery/control copy, final CTA, and footer.
- `LandingHeader.jsx` owns session-aware navigation and the modal mobile menu. It traps focus, supports Escape, restores focus, and prevents background scrolling while open.
- `LandingTemplates.jsx` reads `availableResumeDesigns()` from the canonical résumé model and owns only a generic, local visual-design preview. It never reads a candidate résumé or triggers AI.
- `LandingFaq.jsx` renders the ten trust/product answers with native `details` and `summary` controls.
- `landing.css` contains the isolated visual system, responsive behavior, focus treatment, and reduced-motion fallback.

## Privacy and account boundary

Initial landing rendering may check the existing Supabase Auth session through `AuthProvider`; it does not request a profile, listing table, tailoring operation, posting intake, export, or AI response. Public browse navigation remains ungated. Posting intake remains private and uses the same account-action decision, pending-action validation, and magic-link continuation already protecting `/app`.

The page uses generic product examples only. No candidate fixture, employer history, tailored output, operational listing field, service credential, or private posting is rendered or embedded in the production bundle.

## Template and export boundary

The landing gallery has no hard-coded IDs. Canonical display metadata, descriptions, ATS-safety labels, and visual tokens come from the seven-entry design registry. It explicitly explains that evidence-aware content strategy is separate from visual design. The gallery uses generic sample content and changes local presentation state only.

DOCX/PDF modules remain dynamic imports of the lazy app chunk. The landing chunk graph does not reference `resumeDocx`, `resumePdf`, `docx`, `jspdf`, or the export verifier. P2.2 does not change `ResumePackage`, render plans, manifests, posting verification, identity validation, preliminary labels, or final export authorization.

## Performance and visual assets

The landing and app are independent route-level chunks. The landing visual is semantic HTML/CSS plus the existing Lucide/brand primitives; it uses no stock photography, video, carousel, animation package, or new dependency. The sharing asset is an original 1200×630 SVG with explicit Open Graph dimensions. CSS uses only restrained header translucency and remains readable when `backdrop-filter` is unsupported.

## Accessibility and SEO

The page has a skip link, semantic header/nav/main/sections/footer, one H1, ordered H2/H3 hierarchy, native buttons/links/details, visible focus, selected-state `aria-pressed`, menu `aria-expanded`, a labeled modal, focus containment/restoration, approximately 44-pixel primary targets, and reduced-motion handling. Key text/background pairs are WCAG AA.

SEO is static and crawlable: descriptive title/description, production canonical, robots policy, Open Graph/Twitter metadata, favicon/theme color, and truthful `WebSite` JSON-LD. There are no ratings, prices, testimonials, counts, or unsupported business claims.

## Release boundary

The P2.2 implementation commit is local-only. A separate authorized release must push through GitHub, wait for the Git-triggered Vercel deployment, bind the deployment to the exact SHA, and rerun production `/`, `/app`, CTA, metadata, social asset, console/network, responsive, and signed-in/signed-out smoke checks. No manual Vercel deployment should duplicate a healthy Git-triggered deployment.
