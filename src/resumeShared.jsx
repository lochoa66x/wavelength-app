export const DOC = {
  paper: "#FDFDF9",
  ink: "#1A1A1F",
  inkSoft: "#4A4A52",
  inkFaint: "#7A7A82",
  accent: "#1D5F7A",
  rule: "#D8D4C4",
  bulletDot: "#1D5F7A",
};

export const SERIF = "'Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', serif";
export const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif";

export function SectionHeader({ children, accent }) {
  return (
    <div style={{ marginTop: 20, marginBottom: 10 }}>
      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: accent || DOC.accent, textTransform: "uppercase", marginBottom: 4 }}>
        {children}
      </div>
      <div style={{ height: 1, background: DOC.rule }} />
    </div>
  );
}
