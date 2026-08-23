# Gigscapes search-intelligence implementation prompt

Upgrade Gigscapes search so people can search naturally by job or gig title, technology, platform, business domain, or a useful combination of them. The search must correctly understand examples such as `IT SAP`, `SAP FICO consultant`, `S/4HANA`, `Java`, `Python data engineer`, `C++ embedded developer`, `C# .NET developer`, `React frontend`, `Node.js`, `cloud DevOps`, `cybersecurity`, and `SaaS sales`.

## Product intent

Gigscapes serves both conventional employment and gig work. A user should not need to know the internal category taxonomy. Search should recognize the concepts in their words, retrieve only credible related listings, and explain honestly when the current feeds do not contain enough inventory. A recognized search with zero inventory must never be described as an invalid category.

## Functional requirements

1. Normalize case, spacing, punctuation, and common aliases without destroying meaningful technology names. Preserve and normalize `C++`, `C#`, `.NET`, `S/4HANA`, `FI/CO`, `Node.js`, and `React.js`.
2. Distinguish roles, technologies, domains, and modifiers. Technologies such as SAP, Java, Python, C++, React, and .NET should route to Technology & IT. SaaS is cross-functional and may apply to technology, product, sales, marketing, or customer-success roles depending on the rest of the query.
3. Return a structured, backwards-compatible search intent containing the primary category, all plausible categories, subcategory, recognized technologies and domains, normalized terms, a human-readable label, and useful alternative searches.
4. Score relevance using the normalized title, description, category, subcategory, requested technology/domain concepts, and query terms. Exact title phrases rank highest; technology mentions in titles rank above description-only mentions.
5. Enforce strict concept relevance. A SAP search may include SAP consultants, analysts, architects, and developers, but must not leak unrelated Java or generic IT listings merely because they share the Technology & IT category.
6. Search both title and description. If a posting's title is generic but the complete description contains the requested technology, it remains eligible and receives a lower score than a title match.
7. Preserve broad category searches such as administration and management after high-confidence title classification has removed conflicting roles.
8. Provide structured zero-result diagnostics that distinguish unknown input, missing feed inventory, work-type mismatch, and location mismatch. State what was recognized, how many listings were examined, and whether broadening the location may help. Never claim that broader matches exist unless the app actually observed them.
9. Add bounded, targeted daily Adzuna and Jooble queries for two permanent technology families (SAP and major programming languages) plus a deterministic daily rotation across web development, data, cloud/security, and SaaS business roles. Keep every importer within its existing request budget and preserve deduplication, stable IDs, attribution, freshness filtering, safe upserts, and pruning safeguards.
10. Add tests for normalization, intent detection, strict cross-technology isolation, description matches, SaaS cross-functional matching, diagnostics, deterministic query rotation, and request-budget compliance.

## Constraints

- Do not silently fuzz a query into a different occupation.
- Do not fabricate listings, skills, employers, credentials, or experience.
- Do not weaken authentication, RLS, user isolation, or resume privacy.
- Do not change the database schema or require new credentials for this phase.
- Preserve location and workplace filters, stable listing identity, source attribution, importer freshness rules, and backwards compatibility for saved criteria.

## Acceptance criteria

- `IT SAP` and the named common technologies are recognized instead of showing the invalid-category warning.
- A matching technology in a listing title or complete description is eligible and ranked appropriately.
- Unrelated listings in the same broad category are excluded.
- SaaS queries can route to relevant non-engineering roles when the query supplies that role context.
- Empty results produce a precise recovery message, not a generic error.
- Import plans remain deterministic, bounded, and under each provider's request budget.
- Unit tests and the production build pass.
