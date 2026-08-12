// src/components/ResumePDF.jsx
// A @react-pdf/renderer Document describing the tailored résumé as a clean,
// professional, selectable-text PDF. Vector output — crisp at any zoom,
// not a screenshot.
//
// Rendered to a Blob via pdf(<ResumePDF resume={...} />).toBlob() in ResumeExport.

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

const ACCENT = "#1F7A6D"; // warm teal-green, matches the app accent
const INK = "#1a1a1a";
const MUTED = "#555555";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: INK,
    lineHeight: 1.4,
  },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 12, color: ACCENT, marginTop: 2 },
  contact: { fontSize: 9, color: MUTED, marginTop: 4 },
  sectionHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: ACCENT,
  },
  summary: { marginBottom: 2 },
  jobHeader: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  jobRole: { fontFamily: "Helvetica-Bold" },
  jobDates: { fontSize: 9, color: MUTED, fontFamily: "Helvetica-Oblique" },
  bulletRow: { flexDirection: "row", marginTop: 2, paddingLeft: 4 },
  bulletDot: { width: 8 },
  bulletText: { flex: 1 },
  inlineList: { marginTop: 2 },
  eduRow: { marginTop: 3 },
  eduDegree: { fontFamily: "Helvetica-Bold" },
});

function Contact({ profile }) {
  const parts = [profile.location, profile.email, profile.phone].filter(Boolean);
  if (!parts.length) return null;
  return <Text style={styles.contact}>{parts.join("   •   ")}</Text>;
}

export default function ResumePDF({ resume }) {
  const {
    profile = {},
    experience = [],
    skills = [],
    education = [],
    languages = [],
  } = resume || {};

  return (
    <Document
      title={`${profile.name || "Résumé"}${profile.title ? " — " + profile.title : ""}`}
      author={profile.name || "Wavelength"}
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{profile.name || "Your Name"}</Text>
        {profile.title ? <Text style={styles.title}>{profile.title}</Text> : null}
        <Contact profile={profile} />

        {profile.summary ? (
          <>
            <Text style={styles.sectionHeading}>Summary</Text>
            <Text style={styles.summary}>{profile.summary}</Text>
          </>
        ) : null}

        {experience.length ? (
          <>
            <Text style={styles.sectionHeading}>Experience</Text>
            {experience.map((job, i) => (
              <View key={i} wrap={false}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobRole}>
                    {job.role}
                    {job.company ? `  —  ${job.company}` : ""}
                  </Text>
                  {job.dates ? <Text style={styles.jobDates}>{job.dates}</Text> : null}
                </View>
                {(job.bullets || []).map((b, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {skills.length ? (
          <>
            <Text style={styles.sectionHeading}>Skills</Text>
            <Text style={styles.inlineList}>{skills.join("   •   ")}</Text>
          </>
        ) : null}

        {education.length ? (
          <>
            <Text style={styles.sectionHeading}>Education</Text>
            {education.map((ed, i) => (
              <View key={i} style={styles.eduRow}>
                <Text>
                  <Text style={styles.eduDegree}>{ed.degree}</Text>
                  {ed.institution ? `  —  ${ed.institution}` : ""}
                  {ed.dates ? `  (${ed.dates})` : ""}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {languages.length ? (
          <>
            <Text style={styles.sectionHeading}>Languages</Text>
            <Text style={styles.inlineList}>{languages.join("   •   ")}</Text>
          </>
        ) : null}
      </Page>
    </Document>
  );
}
