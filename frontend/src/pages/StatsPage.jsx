import {
  panelBackground,
  panelBorder,
  panelShadow,
  textMuted,
  textStrong,
} from "./gameShared";

export default function StatsPage() {
  return (
    <main className="app-shell" style={{ padding: "28px 20px 64px" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", display: "grid", gap: "24px" }}>
        <section
          style={{
            minHeight: "min(620px, calc(100vh - 92px))",
            background: panelBackground,
            border: panelBorder,
            borderRadius: "28px",
            padding: "32px",
            boxShadow: panelShadow,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "8% auto auto 12%",
              width: "260px",
              height: "260px",
              borderRadius: "999px",
              background: "rgba(118, 247, 213, 0.12)",
              filter: "blur(28px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "auto 10% 10% auto",
              width: "320px",
              height: "320px",
              borderRadius: "999px",
              background: "rgba(255, 77, 157, 0.12)",
              filter: "blur(34px)",
            }}
          />

          <div style={{ position: "relative", display: "grid", gap: "14px" }}>
            <p
              style={{
                margin: 0,
                color: "#76f7d5",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: "0.78rem",
              }}
            >
              Stats
            </p>
            <h1
              style={{
                margin: 0,
                color: textStrong,
                fontSize: "clamp(2.6rem, 7vw, 5.4rem)",
                lineHeight: 0.94,
                textShadow:
                  "0 0 24px rgba(81, 183, 255, 0.18), 0 0 60px rgba(255, 72, 176, 0.14)",
              }}
            >
              Coming soon...
            </h1>
            <p style={{ margin: "0 auto", maxWidth: "54ch", color: textMuted, fontSize: "1.02rem" }}>
              This page will eventually show learning progress, word strength trends,
              streaks, and game performance.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
