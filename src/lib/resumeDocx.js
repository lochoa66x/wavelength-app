// src/lib/resumeDocx.js
// Builds a downloadable Word (.docx) file from a structured tailored résumé.
// Pure client-side — no server round-trip. Returns a Blob.
//
// Usage:
//   import { buildResumeDocx } from "../lib/resumeDocx";
//   const blob = await buildResumeDocx(resume);
//   // then trigger a download with the blob

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

const ACCENT = "1F7A6D"; // warm teal-green, matches the app accent

function contactLine(profile) {
  const parts = [profile.location, profile.email, profile.phone].filter(Boolean);
  return parts.join("  •  ");
}

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 260, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 22, // half-points → 11pt
        color: ACCENT,
        allCaps: true,
      }),
    ],
  });
}

export async function buildResumeDocx(resume) {
  const { profile = {}, experience = [], skills = [], education = [], languages = [] } =
    resume || {};

  const children = [];

  // Header: name + tailored title + contact
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: profile.name || "Your Name", bold: true, size: 40 }),
      ],
    })
  );
  if (profile.title) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: profile.title, size: 24, color: ACCENT })],
      })
    );
  }
  const contact = contactLine(profile);
  if (contact) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: contact, size: 18, color: "555555" })],
      })
    );
  }

  // Summary
  if (profile.summary) {
    children.push(sectionHeading("Summary"));
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: profile.summary, size: 20 })],
      })
    );
  }

  // Experience
  if (experience.length) {
    children.push(sectionHeading("Experience"));
    experience.forEach((job) => {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [
            new TextRun({ text: job.role || "", bold: true, size: 22 }),
            new TextRun({
              text: job.company ? `  —  ${job.company}` : "",
              size: 22,
            }),
          ],
        })
      );
      if (job.dates) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: job.dates, italics: true, size: 18, color: "555555" }),
            ],
          })
        );
      }
      (job.bullets || []).forEach((b) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 20 },
            children: [new TextRun({ text: b, size: 20 })],
          })
        );
      });
    });
  }

  // Skills
  if (skills.length) {
    children.push(sectionHeading("Skills"));
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: skills.join("  •  "), size: 20 })],
      })
    );
  }

  // Education
  if (education.length) {
    children.push(sectionHeading("Education"));
    education.forEach((ed) => {
      children.push(
        new Paragraph({
          spacing: { after: 20 },
          children: [
            new TextRun({ text: ed.degree || "", bold: true, size: 20 }),
            new TextRun({
              text: ed.institution ? `  —  ${ed.institution}` : "",
              size: 20,
            }),
            new TextRun({
              text: ed.dates ? `  (${ed.dates})` : "",
              size: 18,
              color: "555555",
            }),
          ],
        })
      );
    });
  }

  // Languages
  if (languages.length) {
    children.push(sectionHeading("Languages"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: languages.join("  •  "), size: 20 })],
      })
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri" } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

// Helper for filenames: "Jane Doe" + "Line Cook" -> "Jane-Doe-Line-Cook-resume.docx"
export function resumeFilename(resume, ext) {
  const name = (resume?.profile?.name || "resume").trim();
  const title = (resume?.profile?.title || "").trim();
  const base = [name, title]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "resume"}.${ext}`;
}
