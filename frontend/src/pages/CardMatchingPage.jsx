import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import {
  chooseDeckErrorMessage,
  formatElapsedTime,
  formatLastPlayed,
  panelBackground,
  panelBorder,
  panelShadow,
  primaryButtonStyle,
  secondaryButtonStyle,
  shuffle,
  strengthOptions,
  strengthStyles,
  textMuted,
  textStrong,
} from "./gameShared";

const gameSizes = [
  { value: "small", label: "Small", pairCount: 6, challengeSeconds: 15 },
  { value: "medium", label: "Medium", pairCount: 10, challengeSeconds: 40 },
  { value: "large", label: "Large", pairCount: 15, challengeSeconds: 60 },
];

const getDefaultLanguageFromLists = (lists) => {
  if (!lists.length) {
    return "";
  }

  const mostRecentlyPlayedDeck = lists
    .filter((list) => list.last_practiced_at)
    .sort(
      (left, right) =>
        new Date(right.last_practiced_at).getTime() -
        new Date(left.last_practiced_at).getTime(),
    )[0];

  if (mostRecentlyPlayedDeck) {
    return mostRecentlyPlayedDeck.language;
  }

  const mostRecentlyCreatedDeck = [...lists].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  )[0];

  return mostRecentlyCreatedDeck?.language || "";
};

const createMatchingCards = (words, pairCount, language) => {
  const selectedWords = shuffle(words.filter((word) => word.term && word.definition)).slice(
    0,
    pairCount,
  );

  return shuffle(
    selectedWords.flatMap((word) => [
      {
        id: `${word.id}-term`,
        pairId: word.id,
        term: word.term,
        language,
        role: "Word",
      },
      {
        id: `${word.id}-definition`,
        pairId: word.id,
        term: word.definition,
        language: "English",
        role: "Translation",
      },
    ]),
  );
};

export default function CardMatchingPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [selectedSize, setSelectedSize] = useState("small");
  const [selectedStrengths, setSelectedStrengths] = useState([
    "weak",
    "okay",
    "strong",
  ]);
  const [loading, setLoading] = useState(true);
  const [gameLoading, setGameLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState("setup");
  const [cards, setCards] = useState([]);
  const [flippedIds, setFlippedIds] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [flipCount, setFlipCount] = useState(0);
  const [gameStartedAt, setGameStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0);
  const gameBoardRef = useRef(null);
  const resultsRef = useRef(null);

  const selectedGameSize =
    gameSizes.find((gameSize) => gameSize.value === selectedSize) || gameSizes[0];
  const challengeText = `Bonus challenge: Can you complete the board in ${selectedGameSize.challengeSeconds} seconds or less?`;
  const isGameActive = activeMode === "play";
  const isGameComplete = activeMode === "results";
  const didBeatBonusChallenge =
    isGameComplete && completedElapsedSeconds <= selectedGameSize.challengeSeconds;
  const isComplete = cards.length > 0 && matchedIds.length === cards.length;

  const loadLists = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/lists");
      setLists(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(err.response?.data?.detail || "We couldn't load your decks.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    void loadLists();
  }, []);

  const decksByLanguage = useMemo(() => {
    return lists.reduce((grouped, list) => {
      if (!grouped[list.language]) {
        grouped[list.language] = [];
      }

      grouped[list.language].push(list);
      return grouped;
    }, {});
  }, [lists]);

  const availableLanguages = useMemo(
    () => Object.keys(decksByLanguage).sort((left, right) => left.localeCompare(right)),
    [decksByLanguage],
  );

  const visibleDecks = useMemo(
    () => (selectedLanguage ? decksByLanguage[selectedLanguage] || [] : []),
    [decksByLanguage, selectedLanguage],
  );

  useEffect(() => {
    if (!availableLanguages.length) {
      setSelectedLanguage("");
      return;
    }

    setSelectedLanguage((currentLanguage) =>
      availableLanguages.includes(currentLanguage)
        ? currentLanguage
        : getDefaultLanguageFromLists(lists),
    );
  }, [availableLanguages, lists]);

  useEffect(() => {
    if (!selectedLanguage) {
      setSelectedDeckIds([]);
      return;
    }

    const visibleDeckIds = new Set(visibleDecks.map((deck) => deck.id));
    setSelectedDeckIds((currentDeckIds) =>
      currentDeckIds.filter((deckId) => visibleDeckIds.has(deckId)),
    );
  }, [selectedLanguage, visibleDecks]);

  useEffect(() => {
    if (!isGameActive || !gameStartedAt || isComplete) {
      return undefined;
    }

    const updateElapsedTime = () => {
      setElapsedSeconds(Math.floor((Date.now() - gameStartedAt.getTime()) / 1000));
    };

    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameStartedAt, isComplete, isGameActive]);

  useEffect(() => {
    document.body.classList.toggle("gameplay-active", isGameActive);

    return () => {
      document.body.classList.remove("gameplay-active");
    };
  }, [isGameActive]);

  useEffect(() => {
    if (!isGameActive) {
      return;
    }

    window.requestAnimationFrame(() => {
      gameBoardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [isGameActive, selectedSize]);

  useEffect(() => {
    if (!isGameComplete) {
      return;
    }

    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [isGameComplete]);

  useEffect(() => {
    if (!isComplete || activeMode !== "play") {
      return;
    }

    const finalElapsedSeconds = gameStartedAt
      ? Math.floor((Date.now() - gameStartedAt.getTime()) / 1000)
      : 0;

    setCompletedElapsedSeconds(finalElapsedSeconds);
    setElapsedSeconds(finalElapsedSeconds);
    setActiveMode("results");
  }, [activeMode, gameStartedAt, isComplete]);

  const resetGameState = () => {
    setCards([]);
    setFlippedIds([]);
    setMatchedIds([]);
    setFlipCount(0);
    setGameStartedAt(null);
    setElapsedSeconds(0);
    setCompletedElapsedSeconds(0);
  };

  const handleSelectLanguage = (language) => {
    setSelectedLanguage(language);
    setError("");
  };

  const handleToggleDeck = (deckId) => {
    setSelectedDeckIds((currentDeckIds) =>
      currentDeckIds.includes(deckId)
        ? currentDeckIds.filter((id) => id !== deckId)
        : [...currentDeckIds, deckId],
    );
    setError("");
  };

  const handleSelectAllDecks = () => {
    setSelectedDeckIds(visibleDecks.map((deck) => deck.id));
    setError("");
  };

  const handleClearDeckSelection = () => {
    setSelectedDeckIds([]);
  };

  const handleToggleStrength = (strength) => {
    setSelectedStrengths((currentStrengths) => {
      if (currentStrengths.includes(strength)) {
        return currentStrengths.filter((value) => value !== strength);
      }

      return [...currentStrengths, strength];
    });
    setError("");
  };

  const handleStartGame = async () => {
    if (selectedDeckIds.length === 0) {
      setError(chooseDeckErrorMessage);
      return;
    }

    if (selectedStrengths.length === 0) {
      setError("Choose at least one word strength for the matching game.");
      return;
    }

    setGameLoading(true);
    setError("");

    try {
      const responses = await Promise.all(
        selectedDeckIds.map((deckId) => api.get(`/lists/${deckId}/words`)),
      );
      const allWords = responses.flatMap((response) => response.data);
      const usableWords = allWords.filter(
        (word) =>
          word.term &&
          word.definition &&
          selectedStrengths.includes(word.strength || "weak"),
      );
      const strengthLabel = selectedStrengths
        .map(
          (strength) =>
            strengthOptions.find((option) => option.value === strength)?.label.toLowerCase() ||
            strength,
        )
        .join(" + ");

      if (usableWords.length < selectedGameSize.pairCount) {
        setError(
          `You need at least ${selectedGameSize.pairCount} ${strengthLabel} across the selected decks for a ${selectedGameSize.label.toLowerCase()} matching game.`,
        );
        return;
      }

      resetGameState();
      setCards(
        createMatchingCards(usableWords, selectedGameSize.pairCount, selectedLanguage),
      );
      setActiveMode("play");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(err.response?.data?.detail || "We couldn't start the matching game.");
    } finally {
      setGameLoading(false);
    }
  };

  const handleCardClick = (cardId) => {
    if (
      !isGameActive ||
      flippedIds.includes(cardId) ||
      matchedIds.includes(cardId) ||
      flippedIds.length === 2
    ) {
      return;
    }

    if (!gameStartedAt) {
      setGameStartedAt(new Date());
    }

    const nextFlippedIds = [...flippedIds, cardId];
    setFlippedIds(nextFlippedIds);
    setFlipCount((currentFlipCount) => currentFlipCount + 1);

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
      setMatchedIds((currentMatchedIds) => [
        ...currentMatchedIds,
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
    }, 600);
  };

  const handleResetToSetup = () => {
    resetGameState();
    setActiveMode("setup");
    setError("");
  };

  const handlePlayAgain = () => {
    void handleStartGame();
  };

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
            <p
              style={{
                margin: 0,
                color: "#76f7d5",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: "0.78rem",
              }}
            >
              Card matching
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
              {isGameActive
                ? "Find every pair."
                : isGameComplete
                  ? "Matching complete."
                  : "Create a matching round."}
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "58ch",
                color: textMuted,
                fontSize: "1.02rem",
              }}
            >
              {isGameActive
              ? ""
              : isGameComplete
                ? ""
                : "Flip over two cards at a time and match each word with its translation as quickly as you can."}
            </p>
          </div>
        </section>

        {error && error !== chooseDeckErrorMessage ? (
          <section
            style={{
              background: "rgba(255, 77, 157, 0.12)",
              border: "1px solid rgba(255, 96, 146, 0.28)",
              borderRadius: "20px",
              padding: "16px 18px",
              color: "#ffb6d7",
            }}
          >
            {error}
          </section>
        ) : null}

        {activeMode === "setup" ? (
          <section
            style={{
              background: panelBackground,
              border: panelBorder,
              borderRadius: "28px",
              padding: "28px",
              boxShadow: panelShadow,
              display: "grid",
              gap: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#76f7d5",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontSize: "0.75rem",
                  }}
                >
                  Game setup
                </p>
                <h2 style={{ margin: "8px 0 0", color: textStrong, fontSize: "1.9rem" }}>
                  Choose cards for this round
                </h2>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button type="button" onClick={handleSelectAllDecks} style={secondaryButtonStyle}>
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleClearDeckSelection}
                  style={secondaryButtonStyle}
                >
                  Clear
                </button>
              </div>
            </div>

            {loading ? (
              <p style={{ margin: 0, color: textMuted }}>Loading your decks...</p>
            ) : lists.length === 0 ? (
              <div
                style={{
                  border: "1px dashed rgba(130, 151, 255, 0.22)",
                  borderRadius: "22px",
                  padding: "24px",
                  color: textMuted,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                You need at least one deck before you can start card matching.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "18px" }}>
                <section style={{ display: "grid", gap: "12px" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#76f7d5",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontSize: "0.75rem",
                    }}
                  >
                    Target language
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {availableLanguages.map((language) => {
                      const isSelected = selectedLanguage === language;

                      return (
                        <button
                          key={language}
                          type="button"
                          onClick={() => handleSelectLanguage(language)}
                          style={{
                            borderRadius: "999px",
                            padding: "11px 16px",
                            border: isSelected
                              ? "1px solid rgba(118, 247, 213, 0.45)"
                              : "1px solid rgba(130, 151, 255, 0.18)",
                            background: isSelected
                              ? "linear-gradient(180deg, rgba(72, 183, 255, 0.16), rgba(255, 77, 157, 0.1))"
                              : "rgba(255,255,255,0.04)",
                            color: textStrong,
                            cursor: "pointer",
                            boxShadow: isSelected
                              ? "0 0 22px rgba(118, 247, 213, 0.08)"
                              : "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                          }}
                        >
                          {language}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section style={{ display: "grid", gap: "12px" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#76f7d5",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontSize: "0.75rem",
                    }}
                  >
                    Decks
                  </p>
                  {visibleDecks.length === 0 ? (
                    <p style={{ margin: 0, color: textMuted }}>
                      Choose a language with decks to start.
                    </p>
                  ) : (
                    <div
                      className="quiz-deck-grid"
                      style={{
                        alignItems: "stretch",
                      }}
                    >
                      {visibleDecks.map((deck) => {
                        const isSelected = selectedDeckIds.includes(deck.id);

                        return (
                          <button
                            key={deck.id}
                            type="button"
                            onClick={() => handleToggleDeck(deck.id)}
                            style={{
                              textAlign: "left",
                              borderRadius: "22px",
                              border: isSelected
                                ? "1px solid rgba(118, 247, 213, 0.45)"
                                : panelBorder,
                              background: isSelected
                                ? "linear-gradient(180deg, rgba(72, 183, 255, 0.14), rgba(255, 77, 157, 0.1))"
                                : "rgba(255,255,255,0.04)",
                              padding: "18px",
                              color: textStrong,
                              cursor: "pointer",
                              boxShadow: isSelected
                                ? "0 0 24px rgba(118, 247, 213, 0.08)"
                                : "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                              display: "grid",
                              gap: "12px",
                            }}
                          >
                            <div style={{ display: "grid", gap: "6px" }}>
                              <h3 style={{ margin: 0, fontSize: "1.08rem" }}>{deck.name}</h3>
                              <p style={{ margin: 0, color: textMuted, fontSize: "0.92rem" }}>
                                {deck.word_count} {deck.word_count === 1 ? "word" : "words"}
                              </p>
                              <p style={{ margin: 0, color: textMuted, fontSize: "0.88rem" }}>
                                {formatLastPlayed(deck.last_practiced_at)}
                              </p>
                            </div>

                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              {["weak", "okay", "strong"].map((strength) => {
                                const strengthStyle = strengthStyles[strength];
                                const count = deck[`${strength}_word_count`] || 0;

                                return (
                                  <span
                                    key={strength}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "6px 10px",
                                      borderRadius: "999px",
                                      fontSize: "0.78rem",
                                      color: strengthStyle.color,
                                      border: strengthStyle.border,
                                      background: strengthStyle.background,
                                    }}
                                  >
                                    {strengthStyle.label}
                                    <strong>{count}</strong>
                                  </span>
                                );
                              })}
                            </div>

                            <p style={{ margin: 0, color: textMuted }}>
                              {isSelected ? "Selected for this game" : "Tap to include this deck"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="bingo-setup-options">
                  <div style={{ display: "grid", gap: "12px" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#76f7d5",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontSize: "0.75rem",
                    }}
                  >
                    Game size
                  </p>
                  <div className="bingo-option-grid">
                    {gameSizes.map((gameSize) => {
                      const isSelected = selectedSize === gameSize.value;

                      return (
                        <button
                          key={gameSize.value}
                          type="button"
                          onClick={() => {
                            setSelectedSize(gameSize.value);
                            setError("");
                          }}
                          style={{
                            borderRadius: "20px",
                            padding: "14px 12px",
                            border: isSelected
                              ? "1px solid rgba(118, 247, 213, 0.42)"
                              : "1px solid rgba(130, 151, 255, 0.18)",
                            background: isSelected
                              ? "linear-gradient(180deg, rgba(72, 183, 255, 0.16), rgba(255, 77, 157, 0.1))"
                              : "rgba(255,255,255,0.04)",
                            color: textStrong,
                            cursor: "pointer",
                            display: "grid",
                            gap: "4px",
                          }}
                        >
                          <span>{gameSize.label}</span>
                          <span style={{ color: textMuted, fontSize: "0.8rem" }}>
                            {gameSize.pairCount} pairs
                          </span>
                          
                        </button>
                      );
                    })}
                  </div>
                  </div>

                  <div style={{ display: "grid", gap: "12px" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#76f7d5",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontSize: "0.75rem",
                    }}
                  >
                    Word strength
                  </p>
                  <div className="bingo-option-grid">
                    {strengthOptions.map((option) => {
                      const isActive = selectedStrengths.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleToggleStrength(option.value)}
                          style={{
                            width: "100%",
                            borderRadius: "999px",
                            padding: "11px 16px",
                            border: isActive
                              ? "1px solid rgba(118, 247, 213, 0.42)"
                              : "1px solid rgba(130, 151, 255, 0.18)",
                            background: isActive
                              ? "linear-gradient(180deg, rgba(72, 183, 255, 0.16), rgba(255, 77, 157, 0.1))"
                              : "rgba(255,255,255,0.04)",
                            color: textStrong,
                            cursor: "pointer",
                            boxShadow: isActive
                              ? "0 0 22px rgba(118, 247, 213, 0.08)"
                              : "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedStrengths.length === 0 ? (
                    <p style={{ margin: 0, color: "#ffb6d7", fontSize: "0.92rem" }}>
                      Choose at least one word strength to build the game.
                    </p>
                  ) : null}
                  </div>
                </section>
              </div>
            )}

            {error === chooseDeckErrorMessage ? (
              <p style={{ margin: "0 0 -8px", color: "#ffb6d7", fontSize: "0.92rem" }}>
                {chooseDeckErrorMessage}
              </p>
            ) : null}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleStartGame}
                style={primaryButtonStyle}
                disabled={gameLoading || loading || lists.length === 0}
              >
                {gameLoading ? "Building game..." : "Start matching"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/play")}
                style={secondaryButtonStyle}
              >
                Back to games
              </button>
            </div>
          </section>
        ) : null}

        {isGameActive || isGameComplete ? (
          <section
            ref={gameBoardRef}
            style={{
              background: panelBackground,
              border: panelBorder,
              borderRadius: "28px",
              padding: "28px",
              boxShadow: panelShadow,
              display: "grid",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <p style={{ margin: 0, color: "#76f7d5" }}>
                {isGameComplete
                  ? "Board complete"
                  : `${matchedIds.length / 2} of ${cards.length / 2} pairs matched`}
              </p>
              <p style={{ margin: 0, color: textStrong, fontSize: "0.95rem" }}>
                {challengeText}
              </p>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <p style={{ margin: 0, color: textMuted }}>Flips: {flipCount}</p>
                <p style={{ margin: 0, color: textMuted }}>
                  Time: {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className={`card-match-grid card-match-grid-${selectedSize}`}>
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
                    disabled={isGameComplete}
                  >
                    <span
                      className={`auth-word-card ${isFlipped ? "is-flipped" : ""} ${
                        isMatched ? "is-matched" : ""
                      }`}
                    >
                      <span className="auth-word-face auth-word-back">?</span>
                      <span className="auth-word-face auth-word-front">
                        <span className="auth-word-term">{card.term}</span>
                        {/* <span className="auth-word-language">
                          {card.language} - {card.role}
                        </span> */}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {!isGameComplete ? (
                <button type="button" onClick={handleResetToSetup} style={secondaryButtonStyle}>
                  Back to setup
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {isGameComplete ? (
          <section
            ref={resultsRef}
            style={{
              background: panelBackground,
              border: panelBorder,
              borderRadius: "28px",
              padding: "28px",
              boxShadow: panelShadow,
              display: "grid",
              gap: "20px",
            }}
          >
            <div style={{ display: "grid", gap: "10px" }}>
              <p
                style={{
                  margin: 0,
                  color: "#76f7d5",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontSize: "0.75rem",
                }}
              >
                Game results
              </p>
              <h2 style={{ margin: 0, color: textStrong, fontSize: "2rem" }}>
                You matched all {cards.length / 2} pairs!
              </h2>
              <p style={{ margin: 0, color: textMuted }}>Flips: {flipCount}</p>
              <p style={{ margin: 0, color: textMuted }}>
                Time: {formatElapsedTime(completedElapsedSeconds)}
              </p>
            </div>

            {didBeatBonusChallenge ? (
              <div
                style={{
                  border: "1px solid rgba(118, 247, 213, 0.42)",
                  borderRadius: "24px",
                  padding: "18px 20px",
                  background:
                    "linear-gradient(135deg, rgba(118, 247, 213, 0.16), rgba(72, 183, 255, 0.12), rgba(255, 77, 157, 0.1))",
                  boxShadow:
                    "0 0 0 1px rgba(118, 247, 213, 0.08), 0 0 34px rgba(118, 247, 213, 0.16)",
                  display: "grid",
                  gap: "6px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#76f7d5",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontSize: "0.78rem",
                  }}
                >
                  Bonus challenge cleared
                </p>
                <h3 style={{ margin: 0, color: textStrong, fontSize: "1.45rem" }}>
                  Neon speedrun mode: unlocked.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  You beat the {selectedGameSize.challengeSeconds}-second target with time
                  to spare. That deck never saw you coming.
                </p>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" onClick={handlePlayAgain} style={primaryButtonStyle}>
                Play again
              </button>
              <button type="button" onClick={handleResetToSetup} style={secondaryButtonStyle}>
                Back to game setup
              </button>
              <button
                type="button"
                onClick={() => navigate("/play")}
                style={secondaryButtonStyle}
              >
                Back to game hub
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
