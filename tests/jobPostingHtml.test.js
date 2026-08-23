import test from "node:test";
import assert from "node:assert/strict";

import {
  composeJobPostingText,
  extractJobPostingsFromHtml,
  selectMatchingJobPosting,
} from "../api/_lib/jobPostingHtml.js";

function script(value) {
  return `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
}

test("extracts and normalizes a single JobPosting JSON-LD record", () => {
  const postings = extractJobPostingsFromHtml(script({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "SAP Functional Lead",
    hiringOrganization: { "@type": "Organization", name: "Example Canada" },
    jobLocation: { address: { addressLocality: "Toronto", addressRegion: "Ontario", addressCountry: "CA" } },
    employmentType: ["FULL_TIME", "CONTRACTOR"],
    description: "<p>Lead the finance workstream and partner with delivery teams.</p>",
    qualifications: "<ul><li>SAP S/4HANA Finance experience</li></ul>",
  }));

  assert.equal(postings.length, 1);
  assert.equal(postings[0].title, "SAP Functional Lead");
  assert.equal(postings[0].company, "Example Canada");
  assert.equal(postings[0].location, "Toronto, Ontario, CA");
  assert.match(composeJobPostingText(postings[0]), /SAP S\/4HANA Finance experience/);
});

test("supports arrays, @graph, and @type arrays while ignoring malformed JSON-LD", () => {
  const html = [
    '<script type="application/ld+json">{not valid json}</script>',
    script({ "@graph": [
      { "@type": "Organization", name: "Not a posting" },
      { "@type": ["Thing", "JobPosting"], title: "Plumber", description: "Install and repair plumbing systems." },
    ] }),
    script([
      { "@type": "JobPosting", title: "Electrician", description: "Install and maintain electrical systems." },
      { "@type": "BreadcrumbList", name: "Breadcrumb" },
    ]),
  ].join("\n");

  assert.deepEqual(extractJobPostingsFromHtml(html).map(({ title }) => title), ["Plumber", "Electrician"]);
});

test("selects the posting matching both the trusted title and employer", () => {
  const postings = extractJobPostingsFromHtml([
    script({ "@type": "JobPosting", title: "SAP ABAP Developer", hiringOrganization: { name: "Other Co" }, description: "Build ABAP applications." }),
    script({ "@type": "JobPosting", title: "Senior SAP Functional Lead", hiringOrganization: { name: "IFG International Financial Group" }, description: "Lead SAP finance delivery." }),
  ].join(""));

  const selected = selectMatchingJobPosting(postings, {
    title: "SAP Functional Lead",
    company: "IFG International Financial Group Ltd",
  });

  assert.equal(selected?.title, "Senior SAP Functional Lead");
  assert.equal(selectMatchingJobPosting(postings, { title: "Landscape Designer", company: "Garden Co" }), null);
});
