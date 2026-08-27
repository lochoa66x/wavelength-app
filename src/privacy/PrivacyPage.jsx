import { useEffect } from "react";
import { Link } from "react-router";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

import { BrandMark } from "../BrandMark.jsx";
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_POLICY_VERSION,
  readPrivacyConfig,
} from "../privacyConfig.js";
import "./privacy.css";

const ANTHROPIC_PRIVACY_URL = "https://privacy.anthropic.com/en/articles/7996868-how-long-do-you-store-personal-data";
const SUPABASE_PRIVACY_URL = "https://supabase.com/privacy";
const VERCEL_PRIVACY_URL = "https://vercel.com/docs/analytics/privacy-policy";

function PolicySection({ title, children }) {
  return <section className="privacy-section"><h2>{title}</h2>{children}</section>;
}

export default function PrivacyPage() {
  const config = readPrivacyConfig();

  useEffect(() => {
    const previous = document.title;
    document.title = "Privacy Notice — Gigscapes";
    return () => { document.title = previous; };
  }, []);

  return (
    <main className="privacy-page">
      <header className="privacy-header">
        <Link to="/" className="privacy-brand" aria-label="Gigscapes home"><BrandMark size={30} /><strong>Gigscapes</strong></Link>
        <Link to="/app" className="privacy-back"><ArrowLeft size={16} /> Back to Gigscapes</Link>
      </header>

      <article className="privacy-document">
        <div className="privacy-hero">
          <div className="privacy-eyebrow"><ShieldCheck size={18} /> Privacy & data transparency</div>
          <h1>Know where your résumé goes.</h1>
          <p>Gigscapes is designed to keep your base résumé on your device, explain when private content leaves the browser, and avoid using résumé details for advertising.</p>
          <dl><div><dt>Effective</dt><dd>{PRIVACY_EFFECTIVE_DATE}</dd></div><div><dt>Policy version</dt><dd>{PRIVACY_POLICY_VERSION}</dd></div></dl>
        </div>

        {!config.releaseReady ? (
          <div className="privacy-config-warning" role="status">
            <strong>Production contact details are not configured in this build.</strong>
            <span>Missing: {config.missing.join(", ")}. This build must not be promoted as a public privacy release until these facts are verified.</span>
          </div>
        ) : null}

        <PolicySection title="1. Who operates Gigscapes">
          {config.releaseReady ? (
            <p>Gigscapes is operated by <strong>{config.operatorName}</strong> in {config.jurisdiction}. Privacy questions and access or deletion requests can be sent to <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.</p>
          ) : (
            <p>The verified operator identity, jurisdiction, and privacy contact will appear here before this build is released publicly.</p>
          )}
        </PolicySection>

        <PolicySection title="2. What Gigscapes handles">
          <ul>
            <li><strong>Public discovery:</strong> search terms, location and workplace preferences, listing identifiers, and public job-posting information.</li>
            <li><strong>Account workspace:</strong> email-based authentication, saved and dismissed listing identifiers, and account search criteria.</li>
            <li><strong>Résumé and cover-letter workspace:</strong> résumé text, confirmed candidate evidence, presentation choices, and target-specific cover-letter drafts saved in this browser for the signed-in account.</li>
            <li><strong>Tailoring input:</strong> the reviewed posting, browser-saved résumé, and evidence the person explicitly confirms for a tailoring request.</li>
            <li><strong>Optional quality signals:</strong> a fixed set of coarse product outcomes only when the user enables the setting. Résumé text, names, emails, employers, and free-form posting content are excluded.</li>
          </ul>
        </PolicySection>

        <PolicySection title="3. Where data is stored">
          <p>Your base résumé and target-specific cover-letter drafts are saved in local browser storage on the device where you entered or generated them. They are not currently synced to another device. Clearing browser data, using a different browser profile, or choosing the local deletion control can remove them.</p>
          <p>Supabase stores authentication and account-workspace records such as search criteria and saved listing identifiers. Gigscapes does not intentionally store the current résumé text in the profile database; an earlier profile field is cleared through a guarded migration after a safe local copy succeeds.</p>
        </PolicySection>

        <PolicySection title="4. When content is sent to an AI provider">
          <p>Job-intake, résumé-tailoring, and cover-letter requests pass through Gigscapes server functions to Anthropic. Job intake sends the posting material supplied for extraction. Tailoring sends the browser-saved résumé, the reviewed posting, and confirmed evidence needed to generate and truth-check the draft. Cover-letter generation sends those same verified sources, the current application assessment, and a minimized existing paragraph or draft only when the person asks to regenerate wording.</p>
          <p>Gigscapes shows a just-in-time notice before each kind of processing. Generated content is returned for review and is not submitted to an employer. Anthropic describes its current commercial/API retention practices and exceptions in its <a href={ANTHROPIC_PRIVACY_URL} target="_blank" rel="noreferrer">data-retention documentation <ExternalLink size={13} /></a>.</p>
        </PolicySection>

        <PolicySection title="5. Analytics and operational logs">
          <p>Gigscapes uses Vercel Web Analytics for aggregate page and device insights. The client strips query strings and fragments and suppresses the authentication callback before analytics transmission. No résumé or posting content is added to analytics events. Vercel describes its cookie-free visitor hashing and aggregate data in its <a href={VERCEL_PRIVACY_URL} target="_blank" rel="noreferrer">Web Analytics privacy documentation <ExternalLink size={13} /></a>.</p>
          <p>Hosting and API providers may create operational security and error logs. Gigscapes application logs are designed to contain coarse request stages and status categories rather than résumé text, job-posting text, access tokens, or AI response bodies.</p>
        </PolicySection>

        <PolicySection title="6. Providers and purposes">
          <ul>
            <li><a href={SUPABASE_PRIVACY_URL} target="_blank" rel="noreferrer">Supabase <ExternalLink size={13} /></a> — authentication, account workspace, and public listing database.</li>
            <li><a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer">Anthropic <ExternalLink size={13} /></a> — posting extraction, résumé tailoring, cover-letter generation, and evidence/truth review.</li>
            <li><a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel <ExternalLink size={13} /></a> — hosting, server functions, operational logs, and privacy-filtered aggregate analytics.</li>
          </ul>
        </PolicySection>

        <PolicySection title="7. Retention and deletion">
          <p>Local résumé and cover-letter data remains until the browser or user removes it. The in-app deletion control removes the current account’s résumé, target-specific cover-letter drafts, confirmed evidence, presentation choices, and processing acknowledgement from that browser only. It does not delete the Supabase account, saved jobs, search preferences, authentication session, or copies a provider must temporarily retain for security or legal obligations.</p>
          <p>Optional quality events are aggregated by day and the database migration removes aggregate buckets older than 180 days. Provider and hosting retention periods can vary by plan, request type, and legally required exceptions; Gigscapes reviews these settings and documents unresolved owner decisions in its internal retention register.</p>
        </PolicySection>

        <PolicySection title="8. Your choices">
          <ul>
            <li>Browse public listings without signing in.</li>
            <li>Use pasted text or screenshots when a job site blocks automated page reading.</li>
            <li>Cancel a processing disclosure without losing the input already entered.</li>
            <li>Disable optional quality signals at any time.</li>
            <li>Clear private résumé and cover-letter data from the current browser.</li>
            <li>Contact the privacy address above for account access, correction, or deletion requests.</li>
          </ul>
        </PolicySection>

        <PolicySection title="9. Children and policy changes">
          {config.minimumAge ? <p>Gigscapes is not intended for anyone under {config.minimumAge}. A parent or guardian who believes a child provided personal information should contact the privacy address above.</p> : <p>The minimum-age policy must be verified before this build is released publicly.</p>}
          <p>Material changes will update the policy version and effective date. A new just-in-time acknowledgement will be requested when a policy change affects private AI processing.</p>
        </PolicySection>
      </article>
    </main>
  );
}
