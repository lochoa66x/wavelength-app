export function BrandMark({ size = 24, pulse = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {pulse && (
        <div
          style={{
            position: "absolute",
            inset: -size * 0.18,
            borderRadius: size * 0.32,
            background: "#FEE1CE",
            animation: "wl-pulse 2.2s ease-in-out infinite",
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 263 316"
        style={{ position: "relative", display: "block" }}
        aria-hidden="true"
      >
        <path fill="#FE5E03" d="M263 0h-90C94 0 30 49 30 111c0 31 15 58 39 77l84-17c20-4 29-9 26-15-2-4-11-8-26-14-13-5-18-10-17-15 1-5 8-10 20-14 27-10 62-15 107-15V0Z" />
        <path fill="#1C1917" d="M195 144c30 7 52 23 62 44 4 9 6 20 6 33v95H0v-21c0-45 27-73 72-84l81-18c30-7 55-20 63-34 4-7-3-12-21-15Z" />
      </svg>
    </div>
  );
}
