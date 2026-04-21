import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
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
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="app-shell" style={{ padding: "48px 20px 64px" }}>
      <div
        style={{
          maxWidth: "1180px",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: "0.78rem",
                color: "#76f7d5",
              }}
            >
              LingoArcade
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate("/lists")}
                style={secondaryButtonStyle}
              >
                Back to decks
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={secondaryButtonStyle}
              >
                Log out
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <p
              style={{
                margin: 0,
                color: "#76f7d5",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: "0.78rem",
              }}
            >
              Game hub
            </p>
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
              Pick how you want to practice.
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "58ch",
                color: textMuted,
                fontSize: "1.02rem",
              }}
            >
              Quiz is ready to play now, and the other formats are staged for the
              next rounds of development.
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
