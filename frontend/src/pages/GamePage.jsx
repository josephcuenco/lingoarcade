import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const textMuted = "#bfc7e6";
const textStrong = "#f7f8ff";
const panelBackground =
  "linear-gradient(180deg, rgba(17, 21, 36, 0.92), rgba(12, 15, 28, 0.92))";
const panelBorder = "1px solid rgba(130, 151, 255, 0.18)";
const panelShadow =
  "0 24px 70px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)";

const primaryButtonStyle = {
  border: "none",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "linear-gradient(135deg, #48b7ff 0%, #935dff 48%, #ff4d9d 100%)",
  color: "#f8f5ef",
  cursor: "pointer",
  boxShadow: "0 18px 35px rgba(112, 85, 255, 0.3)",
};

const secondaryButtonStyle = {
  border: "1px solid rgba(130, 151, 255, 0.18)",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "rgba(255,255,255,0.06)",
  color: textStrong,
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
};

const gameOptions = [
  {
    name: "Quiz",
    accent: "#76f7d5",
    description: "Quick recall rounds with prompts and answers pulled from your decks.",
  },
  {
    name: "Word Search",
    accent: "#48b7ff",
    description: "Find hidden vocabulary terms in a puzzle grid built from your study words.",
  },
  {
    name: "Bingo",
    accent: "#ffb86c",
    description: "Match prompts to the right words and fill a board as you play.",
  },
  {
    name: "Crossword",
    accent: "#ff79c6",
    description: "Solve clue-based grids using the words and translations from your decks.",
  },
  {
    name: "Word Builder",
    accent: "#b388ff",
    description: "Assemble words from fragments and practice spelling and recognition.",
  },
];

export default function GamePage() {
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
            <p style={{ margin: 0, maxWidth: "58ch", color: textMuted, fontSize: "1.02rem" }}>
              This is the first version of the game page. For now it showcases the
              practice modes we can build next, starting with quiz-style review and
              expanding into more playful formats.
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
                <button type="button" style={primaryButtonStyle}>
                  Coming soon
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
