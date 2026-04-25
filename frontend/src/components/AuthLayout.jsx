import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const matchPairs = [
  [
    { term: "hello", language: "English" },
    { term: "hola", language: "Spanish" },
  ],
  [
    { term: "goodbye", language: "English" },
    { term: "au revoir", language: "French" },
  ],
  [
    { term: "nice to meet you", language: "English" },
    { term: "hajimemashite", language: "Japanese" },
  ],
  [
    { term: "thank you", language: "English" },
    { term: "grazie", language: "Italian" },
  ],
  [
    { term: "good morning", language: "English" },
    { term: "guten Morgen", language: "German" },
  ],
  [
    { term: "see you soon", language: "English" },
    { term: "ate logo", language: "Portuguese" },
  ],
];

function shuffle(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[randomIndex]] = [
      nextItems[randomIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

function createShuffledCards() {
  return shuffle(
    matchPairs.flatMap((pair, pairIndex) =>
      pair.map((entry, cardIndex) => ({
        ...entry,
        id: `${pairIndex}-${cardIndex}`,
        pairId: `pair-${pairIndex}`,
      })),
    ),
  );
}

function formatElapsedTime(elapsedSeconds) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function AuthLayout({
  title,
  subtitle,
  form,
  footerText,
  footerLink,
  footerLabel,
  accent,
}) {
  const [cards, setCards] = useState(() => createShuffledCards());
  const [flippedIds, setFlippedIds] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [turnCount, setTurnCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const hasStarted = turnCount > 0;
  const isComplete = matchedIds.length === cards.length;

  useEffect(() => {
    if (!hasStarted || isComplete) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((currentElapsed) => currentElapsed + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasStarted, isComplete]);

  const handleCardClick = (cardId) => {
    if (
      flippedIds.includes(cardId) ||
      matchedIds.includes(cardId) ||
      flippedIds.length === 2
    ) {
      return;
    }

    const nextFlippedIds = [...flippedIds, cardId];
    setFlippedIds(nextFlippedIds);
    setTurnCount((currentTurns) => currentTurns + 1);

    if (nextFlippedIds.length !== 2) {
      return;
    }

    const [firstId, secondId] = nextFlippedIds;
    const firstCard = cards.find((card) => card.id === firstId);
    const secondCard = cards.find((card) => card.id === secondId);

    if (!firstCard || !secondCard) {
      return;
    }

    if (firstCard.pairId === secondCard.pairId) {
      setMatchedIds((currentMatched) => [
        ...currentMatched,
        firstCard.id,
        secondCard.id,
      ]);
      window.setTimeout(() => {
        setFlippedIds([]);
      }, 500);
      return;
    }

    window.setTimeout(() => {
      setFlippedIds([]);
    }, 900);
  };

  const handleRetry = () => {
    setFlippedIds([]);
    setMatchedIds([]);
    setTurnCount(0);
    setElapsedSeconds(0);
    setCards(createShuffledCards());
  };

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <h1 className="auth-mark">LingoArcade</h1>
        <p className="auth-blurb">
          Learning vocabulary made fun!
          <br />
          Can you match all the cards in 20 seconds or less?
        </p>
        <div className="auth-word-stage">
          <div className="auth-orbit auth-orbit-one" />
          <div className="auth-orbit auth-orbit-two" />

          <div className="auth-word-grid">
            {cards.map((card, index) => {
              const isFlipped =
                flippedIds.includes(card.id) || matchedIds.includes(card.id);
              const isMatched = matchedIds.includes(card.id);

              return (
                <button
                  key={card.id}
                  type="button"
                  className={`auth-word-button auth-word-card-${(index % 4) + 1}`}
                  onClick={() => handleCardClick(card.id)}
                >
                  <span
                    className={`auth-word-card ${isFlipped ? "is-flipped" : ""} ${
                      isMatched ? "is-matched" : ""
                    }`}
                  >
                    <span className="auth-word-face auth-word-back">?</span>
                    <span className="auth-word-face auth-word-front">
                      <span className="auth-word-term">{card.term}</span>
                      <span className="auth-word-language">{card.language}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="auth-game-status">
            <p className="auth-game-turns">
              {isComplete
                ? `Finished in ${formatElapsedTime(elapsedSeconds)} with ${turnCount} flips`
                : `Time ${formatElapsedTime(elapsedSeconds)} - ${turnCount} flips`}
            </p>
            <button
              type="button"
              className="auth-game-retry"
              onClick={handleRetry}
            >
              Retry
            </button>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <p className="auth-card-kicker">{accent}</p>
        <h2 className="auth-card-title">{title}</h2>
        {subtitle ? <p className="auth-card-subtitle">{subtitle}</p> : null}
        {form}
        <p className="auth-footer">
          {footerText} <Link to={footerLink}>{footerLabel}</Link>
        </p>
      </section>
    </main>
  );
}
