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

const wordSearchLetters = ["C", "O", "L", "A", "M", "A", "R", "I", "N", "E", "S", "O", "L", "U", "Z", "A"];
const wordBuilderCells = [
  { type: "correct", letter: "N" },
  { type: "empty" },
  { type: "empty" },
  { type: "distraction", letter: "A" },
  { type: "empty" },
  { type: "distraction", letter: "D" },
  { type: "correct", letter: "U" },
  { type: "empty" },
  { type: "correct", letter: "I" },
  { type: "empty" },
  { type: "empty" },
  { type: "distraction", letter: "L" },
  { type: "empty" },
  { type: "correct", letter: "T" },
  { type: "empty" },
  { type: "empty" },
];
const crosswordCells = [
  { open: true, number: 1 },
  { open: true },
  { open: true, number: 2, letter: "H" },
  { open: false },
  { open: false },
  { open: false },
  { open: true, letter: "O" },
  { open: false },
  { open: true, number: 3 },
  { open: true },
  { open: true, letter: "L" },
  { open: true },
  { open: false },
  { open: false },
  { open: true, letter: "A" },
  { open: false },
];

function GamePreview({ option }) {
  if (option.preview === "matching") {
    return (
      <div className="game-preview game-preview-matching" style={{ "--game-accent": option.accent }}>
        {["", "Hello", "Bonjour", ""].map((label, index) => (
          <span
            key={`${label}-${index}`}
            className={label ? "game-preview-card is-face-up" : "game-preview-card"}
          >
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (option.preview === "word-search") {
    return (
      <div className="game-preview game-preview-word-search" style={{ "--game-accent": option.accent }}>
        {wordSearchLetters.map((letter, index) => (
          <span key={`${letter}-${index}`} className={[0, 5, 10, 15].includes(index) ? "is-found" : ""}>
            {letter}
          </span>
        ))}
      </div>
    );
  }

  if (option.preview === "bingo") {
    return (
      <div className="game-preview game-preview-bingo" style={{ "--game-accent": option.accent }}>
        <p>house</p>
        <div>
          {["chat", "bleu", "oui", "lune", "merci", "pain", "soleil", "maison", "nuit"].map(
            (word, index) => (
              <span key={word} className={index === 7 ? "is-hit" : ""}>
                {word}
              </span>
            ),
          )}
        </div>
      </div>
    );
  }

  if (option.preview === "crossword") {
    return (
      <div className="game-preview game-preview-crossword" style={{ "--game-accent": option.accent }}>
        {crosswordCells.map((cell, index) => (
          <span
            key={`${cell.open}-${index}`}
            className={`${cell.open ? "is-open" : ""} ${cell.letter ? "is-solved" : ""}`}
          >
            {cell.number ? <small>{cell.number}</small> : null}
            {cell.letter || ""}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="game-preview game-preview-word-builder" style={{ "--game-accent": option.accent }}>
      <p>Night</p>
      <div>
        {wordBuilderCells.map((cell, index) => (
          <span key={`${cell.type}-${index}`} className={`is-${cell.type}`}>
            {cell.letter || ""}
          </span>
        ))}
      </div>
    </div>
  );
}

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
          className="game-hub-grid"
          style={{
            display: "grid",
            gap: "18px",
          }}
        >
          {gameOptions.map((option) => (
            <article
              key={option.name}
              className="game-hub-card"
              style={{
                "--game-accent": option.accent,
                background: panelBackground,
                border: panelBorder,
                borderRadius: "24px",
                padding: "18px",
                boxShadow: panelShadow,
                display: "grid",
                gap: "14px",
                minHeight: "380px",
              }}
            >
              <h2 style={{ margin: 0, color: textStrong, fontSize: "1.35rem" }}>
                  {option.name}
                </h2>
              <GamePreview option={option} />
              <div style={{ display: "grid", gap: "8px" }}>
                
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
