import { useNavigate } from "react-router-dom";
import {
  gameOptions,
  panelBackground,
  panelBorder,
  panelShadow,
  primaryButtonStyle,
  secondaryButtonStyle,
  textMuted,
  textStrong,
} from "./gameShared";

export default function GameHubPage() {
  const navigate = useNavigate();

  return (
    <main className="app-shell" style={{ padding: "28px 20px 64px" }}>
      <div
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          display: "grid",
          gap: "24px",
        }}
      >
        <section
          style={{
            background: panelBackground,
            border: panelBorder,
            borderRadius: "28px",
            padding: "28px 32px",
            boxShadow: panelShadow,
            display: "grid",
            gap: "18px",
          }}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2.4rem, 6vw, 4.8rem)",
                lineHeight: 0.94,
                color: textStrong,
                textShadow:
                  "0 0 24px rgba(81, 183, 255, 0.18), 0 0 60px rgba(255, 72, 176, 0.14)",
              }}
            >
              Practice by playing games.
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                maxWidth: "58ch",
                color: textMuted,
                fontSize: "1.02rem",
              }}
            >
              Have fun while learning vocabulary and improving your gaming skills.
            </p>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
          }}
        >
          {gameOptions.map((option) => (
            <article
              key={option.name}
              style={{
                background: panelBackground,
                border: panelBorder,
                borderRadius: "24px",
                padding: "22px",
                boxShadow: panelShadow,
                display: "grid",
                gap: "14px",
                minHeight: "220px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "18px",
                  background: `linear-gradient(135deg, ${option.accent}, rgba(255,255,255,0.08))`,
                  boxShadow: `0 0 24px ${option.accent}22`,
                }}
              />
              <div style={{ display: "grid", gap: "8px" }}>
                <h2 style={{ margin: 0, color: textStrong, fontSize: "1.35rem" }}>
                  {option.name}
                </h2>
                <p style={{ margin: 0, color: textMuted, lineHeight: 1.6 }}>
                  {option.description}
                </p>
              </div>
              <div style={{ marginTop: "auto" }}>
                {option.status === "available" ? (
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={() => navigate(option.path)}
                  >
                    {option.buttonLabel}
                  </button>
                ) : (
                  <button type="button" style={secondaryButtonStyle}>
                    Coming soon
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
