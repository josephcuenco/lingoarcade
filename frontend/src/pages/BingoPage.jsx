import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import {
  buildPracticeWordIds,
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
  { value: "small", label: "Small", wordCount: 9 },
  { value: "medium", label: "Medium", wordCount: 16 },
  { value: "large", label: "Large", wordCount: 25 },
];

const gameSpeeds = [
  { value: "slow", label: "Slow", seconds: 6 },
  { value: "medium", label: "Medium", seconds: 4 },
  { value: "fast", label: "Fast", seconds: 2.5 },
];

const gameDirections = [
  {
    value: "english-to-language",
    label: (language) => `English -> ${language || "Language"}`,
  },
  {
    value: "language-to-english",
    label: (language) => `${language || "Language"} -> English`,
  },
  { value: "both", label: "Both" },
];

const notEnoughWordsPrefix = "You need at least";

const formatPromptCountdown = (seconds) => {
  if (seconds >= 10) {
    return `${Math.ceil(seconds)}s`;
  }

  return `${Math.max(0, seconds).toFixed(1)}s`;
};

const formatBonusChallengeTime = (seconds) => {
  return Number.isInteger(seconds) ? `${seconds}` : seconds.toFixed(1);
};

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

const getNextPrompt = (queue, foundIds) => {
  const nextId = queue.find((wordId) => !foundIds.includes(wordId));
  const nextQueue = queue.filter((wordId) => wordId !== nextId);

  return { nextId: nextId || null, nextQueue };
};

const getBingoDirection = (selectedDirection) => {
  if (selectedDirection !== "both") {
    return selectedDirection;
  }

  return Math.random() >= 0.5 ? "english-to-language" : "language-to-english";
};

export default function BingoPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [selectedSize, setSelectedSize] = useState("small");
  const [selectedSpeed, setSelectedSpeed] = useState("medium");
  const [selectedDirection, setSelectedDirection] = useState("language-to-english");
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
  const [promptQueue, setPromptQueue] = useState([]);
  const [currentPromptId, setCurrentPromptId] = useState(null);
  const [promptRound, setPromptRound] = useState(0);
  const [foundIds, setFoundIds] = useState([]);
  const [feedbackById, setFeedbackById] = useState({});
  const [clickLocked, setClickLocked] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [gameStartedAt, setGameStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [promptSecondsRemaining, setPromptSecondsRemaining] = useState(0);
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0);
  const [performanceRecorded, setPerformanceRecorded] = useState(false);
  const gameBoardRef = useRef(null);
  const gameBoardScrollAnchorRef = useRef(null);
  const resultsRef = useRef(null);

  const selectedGameSize =
    gameSizes.find((gameSize) => gameSize.value === selectedSize) || gameSizes[0];
  const selectedGameSpeed =
    gameSpeeds.find((gameSpeed) => gameSpeed.value === selectedSpeed) || gameSpeeds[1];
  const bonusChallengeSeconds =
    (selectedGameSize.wordCount * selectedGameSpeed.seconds) / 2;
  const bonusChallengeText = `Bonus challenge: Finish in ${formatBonusChallengeTime(
    bonusChallengeSeconds,
  )} seconds or less.`;
  const currentPrompt = cards.find((card) => card.id === currentPromptId);
  const isBoardVisible = ["preview", "play", "results"].includes(activeMode);
  const isGameActive = activeMode === "play";
  const isGameComplete = activeMode === "results";
  const didFinishWithoutMisses = isGameComplete && missCount === 0;
  const didBeatBonusChallenge =
    isGameComplete && completedElapsedSeconds <= bonusChallengeSeconds;

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

  const recordGamePerformance = useEffectEvent(async (wordIds) => {
    const practiceWordIds = buildPracticeWordIds(wordIds);

    if (practiceWordIds.length === 0) {
      return;
    }

    try {
      await api.post("/lists/words/practice", { word_ids: practiceWordIds });
      await loadLists({ silent: true });
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.detail ||
          "We couldn't save your bingo results, but your game results are still shown here.",
      );
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
    if (activeMode !== "preview") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const { nextId, nextQueue } = getNextPrompt(promptQueue, foundIds);

      setCurrentPromptId(nextId);
      setPromptQueue(nextQueue);
      setPromptRound((currentRound) => currentRound + 1);
      setGameStartedAt(new Date());
      setElapsedSeconds(0);
      setActiveMode("play");
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeMode, foundIds, promptQueue]);

  useEffect(() => {
    if (!isBoardVisible || isGameComplete) {
      return;
    }

    window.requestAnimationFrame(() => {
      const scrollTarget =
        selectedSize === "large" ? gameBoardScrollAnchorRef.current : gameBoardRef.current;

      scrollTarget?.scrollIntoView({
        behavior: "smooth",
        block: selectedSize === "large" ? "start" : "center",
      });
    });
  }, [isBoardVisible, isGameComplete, selectedSize]);

  useEffect(() => {
    const shouldBlurSidebar = activeMode === "preview" || isGameActive;
    document.body.classList.toggle("gameplay-active", shouldBlurSidebar);

    return () => {
      document.body.classList.remove("gameplay-active");
    };
  }, [activeMode, isGameActive]);

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
    if (!isGameActive || !gameStartedAt) {
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
  }, [gameStartedAt, isGameActive]);

  useEffect(() => {
    if (!isGameActive || !currentPromptId) {
      setPromptSecondsRemaining(0);
      return undefined;
    }

    const promptStartedAt = Date.now();
    const promptDurationMs = selectedGameSpeed.seconds * 1000;

    const updatePromptCountdown = () => {
      const nextRemainingSeconds = Math.max(
        0,
        (promptDurationMs - (Date.now() - promptStartedAt)) / 1000,
      );
      setPromptSecondsRemaining(nextRemainingSeconds);
    };

    updatePromptCountdown();
    const intervalId = window.setInterval(updatePromptCountdown, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentPromptId, isGameActive, promptRound, selectedGameSpeed.seconds]);

  useEffect(() => {
    if (!isGameActive || !currentPromptId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMissCount((currentMissCount) => currentMissCount + 1);
      setPromptQueue((currentQueue) => [...currentQueue, currentPromptId]);

      const { nextId, nextQueue } = getNextPrompt([...promptQueue, currentPromptId], foundIds);
      if (!nextId) {
        return;
      }

      setCurrentPromptId(nextId);
      setPromptQueue(nextQueue);
      setPromptRound((currentRound) => currentRound + 1);
      setClickLocked(false);
    }, selectedGameSpeed.seconds * 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    currentPromptId,
    foundIds,
    isGameActive,
    promptRound,
    promptQueue,
    selectedGameSpeed.seconds,
  ]);

  useEffect(() => {
    if (
      activeMode !== "play" ||
      cards.length === 0 ||
      foundIds.length !== cards.length ||
      performanceRecorded
    ) {
      return;
    }

    const finalElapsedSeconds = gameStartedAt
      ? Math.floor((Date.now() - gameStartedAt.getTime()) / 1000)
      : 0;

    setPerformanceRecorded(true);
    setCompletedElapsedSeconds(finalElapsedSeconds);
    setElapsedSeconds(finalElapsedSeconds);
    void recordGamePerformance(foundIds);
    setActiveMode("results");
  }, [activeMode, cards.length, foundIds, foundIds.length, gameStartedAt, performanceRecorded]);

  const resetGameState = () => {
    setCards([]);
    setPromptQueue([]);
    setCurrentPromptId(null);
    setPromptRound(0);
    setFoundIds([]);
    setFeedbackById({});
    setClickLocked(false);
    setAttemptCount(0);
    setMissCount(0);
    setGameStartedAt(null);
    setElapsedSeconds(0);
    setPromptSecondsRemaining(0);
    setCompletedElapsedSeconds(0);
    setPerformanceRecorded(false);
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

  const buildGameFromSettings = async () => {
    if (selectedDeckIds.length === 0) {
      setError(chooseDeckErrorMessage);
      return;
    }

    if (selectedStrengths.length === 0) {
      setError("Choose at least one word strength for bingo.");
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

      if (usableWords.length < selectedGameSize.wordCount) {
        setError(
          `${notEnoughWordsPrefix} ${selectedGameSize.wordCount} ${strengthLabel} across the selected decks for a ${selectedGameSize.label.toLowerCase()} bingo board.`,
        );
        return;
      }

      const selectedWords = shuffle(usableWords).slice(0, selectedGameSize.wordCount);
      const nextCards = selectedWords.map((word) => {
        const direction = getBingoDirection(selectedDirection);

        return {
          id: word.id,
          term: word.term,
          definition: word.definition,
          cardText: direction === "english-to-language" ? word.definition : word.term,
          promptText: direction === "english-to-language" ? word.term : word.definition,
          direction,
        };
      });

      resetGameState();
      setCards(shuffle(nextCards));
      setPromptQueue(shuffle(nextCards.map((word) => word.id)));
      setActiveMode("preview");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(err.response?.data?.detail || "We couldn't start bingo.");
    } finally {
      setGameLoading(false);
    }
  };

  const handleCardClick = (cardId) => {
    if (!isGameActive || clickLocked || foundIds.includes(cardId) || !currentPromptId) {
      return;
    }

    setAttemptCount((currentAttemptCount) => currentAttemptCount + 1);
    setClickLocked(true);

    if (cardId === currentPromptId) {
      setFeedbackById((currentFeedback) => ({ ...currentFeedback, [cardId]: "correct" }));
      setFoundIds((currentFoundIds) => [...currentFoundIds, cardId]);

      window.setTimeout(() => {
        setFeedbackById((currentFeedback) => {
          const nextFeedback = { ...currentFeedback };
          delete nextFeedback[cardId];
          return nextFeedback;
        });

        const { nextId, nextQueue } = getNextPrompt(promptQueue, [...foundIds, cardId]);
        setCurrentPromptId(nextId);
        setPromptQueue(nextQueue);
        setPromptRound((currentRound) => currentRound + 1);
        setClickLocked(false);
      }, 650);
      return;
    }

    setMissCount((currentMissCount) => currentMissCount + 1);
    setFeedbackById((currentFeedback) => ({ ...currentFeedback, [cardId]: "wrong" }));
    setPromptQueue((currentQueue) => [...currentQueue, currentPromptId]);

    window.setTimeout(() => {
      setFeedbackById((currentFeedback) => {
        const nextFeedback = { ...currentFeedback };
        delete nextFeedback[cardId];
        return nextFeedback;
      });

      const { nextId, nextQueue } = getNextPrompt([...promptQueue, currentPromptId], foundIds);
      setCurrentPromptId(nextId);
      setPromptQueue(nextQueue);
      setPromptRound((currentRound) => currentRound + 1);
      setClickLocked(false);
    }, 650);
  };

  const handleResetToSetup = () => {
    resetGameState();
    setActiveMode("setup");
    setError("");
  };

  return (
    <main className="app-shell" style={{ padding: "28px 20px 64px" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", display: "grid", gap: "24px" }}>
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
              BingoBlitz
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
              {activeMode === "setup"
                ? "Create a bingo board."
                : isGameComplete
                  ? "Bingo complete."
                  : "Find the word in time."}
            </h1>
            <p style={{ margin: 0, maxWidth: "62ch", color: textMuted, fontSize: "1.02rem" }}>
              {activeMode === "setup"
              ? "Study the board, then match each prompt to the right word before the next prompt appears. Missed words come back until you find them all."
              : isGameComplete
                ? ""
                : "Study the board, then match each prompt to the right word before the next prompt appears. Missed words come back until you find them all."}
            </p>
          </div>
        </section>

        {error &&
        error !== chooseDeckErrorMessage &&
        !error.startsWith(notEnoughWordsPrefix) ? (
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
                  Choose words for BingoBlitz
                </h2>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button type="button" onClick={handleSelectAllDecks} style={secondaryButtonStyle}>
                  Select all
                </button>
                <button type="button" onClick={handleClearDeckSelection} style={secondaryButtonStyle}>
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
                You need at least one deck before you can start bingo.
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
                    <div className="quiz-deck-grid" style={{ alignItems: "stretch" }}>
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
                              {isSelected ? "Selected for bingo" : "Tap to include this deck"}
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
                              {gameSize.wordCount} cards
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
                        Choose at least one word strength to build bingo.
                      </p>
                    ) : null}
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
                      Game speed
                    </p>
                    <div className="bingo-option-grid">
                      {gameSpeeds.map((gameSpeed) => {
                        const isSelected = selectedSpeed === gameSpeed.value;

                        return (
                          <button
                            key={gameSpeed.value}
                            type="button"
                            onClick={() => {
                              setSelectedSpeed(gameSpeed.value);
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
                            <span>{gameSpeed.label}</span>
                            <span style={{ color: textMuted, fontSize: "0.8rem" }}>
                              {gameSpeed.seconds}s per prompt
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
                      Translation direction
                    </p>
                    <div className="bingo-option-grid">
                      {gameDirections.map((direction) => {
                        const isSelected = selectedDirection === direction.value;

                        return (
                          <button
                            key={direction.value}
                            type="button"
                            onClick={() => {
                              setSelectedDirection(direction.value);
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
                            }}
                          >
                            {typeof direction.label === "function"
                              ? direction.label(selectedLanguage)
                              : direction.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {error === chooseDeckErrorMessage ? (
              <p style={{ margin: "0 0 -8px", color: "#ffb6d7", fontSize: "0.92rem" }}>
                {chooseDeckErrorMessage}
              </p>
            ) : null}

            {error.startsWith(notEnoughWordsPrefix) ? (
              <p style={{ margin: "0 0 -8px", color: "#ffb6d7", fontSize: "0.92rem" }}>
                {error}
              </p>
            ) : null}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  void buildGameFromSettings();
                }}
                style={primaryButtonStyle}
                disabled={gameLoading || loading || lists.length === 0}
              >
                {gameLoading ? "Building bingoblitz..." : "Start bingo"}
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

        {isBoardVisible ? (
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
            <span ref={gameBoardScrollAnchorRef} style={{ scrollMarginTop: "18px" }} />
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              <div style={{ display: "grid", gap: "6px", textAlign: "center" }}>
                <p
                  style={{
                    margin: 0,
                    color: "#76f7d5",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontSize: "0.76rem",
                  }}
                >
                  Prompt
                </p>
                <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "baseline",
                      gap: "14px",
                      flexWrap: "wrap",
                      minHeight: "3.35rem",
                    }}
                  >
                  <p
                    style={{
                      margin: 0,
                      color: textStrong,
                      fontSize: "clamp(1.65rem, 4.4vw, 3.15rem)",
                      lineHeight: 1,
                      textShadow:
                        "0 0 24px rgba(118, 247, 213, 0.16), 0 0 50px rgba(255, 77, 157, 0.12)",
                    }}
                  >
                    {activeMode === "preview"
                      ? "Study the board before prompts begin."
                      : currentPrompt
                        ? currentPrompt.promptText
                        : "All prompts complete."}
                  </p>
                  {isGameActive ? (
                    <p
                      style={{
                        margin: 0,
                        color: "#76f7d5",
                        fontSize: "clamp(1rem, 2.4vw, 1.45rem)",
                        fontWeight: 700,
                        minWidth: "5ch",
                        textAlign: "left",
                        fontVariantNumeric: "tabular-nums",
                        textShadow: "0 0 18px rgba(118, 247, 213, 0.18)",
                      }}
                    >
                      {formatPromptCountdown(promptSecondsRemaining)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <p style={{ margin: 0, color: "#76f7d5" }}>
                  {foundIds.length} of {cards.length} words found
                </p>
                <p style={{ margin: 0, color: textMuted }}>Misses: {missCount}</p>
                <p style={{ margin: 0, color: textMuted }}>Clicks: {attemptCount}</p>
                <p style={{ margin: 0, color: textMuted }}>
                  Time: {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className={`bingo-grid bingo-grid-${selectedSize}`}>
              {cards.map((card, index) => {
                const isFound = foundIds.includes(card.id);
                const feedback = feedbackById[card.id];
                const isFlipped = activeMode !== "setup";

                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`auth-word-button auth-word-card-${(index % 4) + 1}`}
                    disabled={!isGameActive || clickLocked || isFound}
                    onClick={() => handleCardClick(card.id)}
                  >
                    <span
                      className={`auth-word-card ${isFlipped ? "is-flipped" : ""} ${
                        isFound ? "is-matched" : ""
                      } ${feedback === "correct" ? "is-bingo-correct" : ""} ${
                        feedback === "wrong" ? "is-bingo-wrong" : ""
                      }`}
                    >
                      <span className="auth-word-face auth-word-back">?</span>
                      <span className="auth-word-face auth-word-front">
                        <span className="auth-word-term">{card.cardText}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {isBoardVisible ? (
              <p
                style={{
                  margin: "-4px 0 0",
                  color: textStrong,
                  fontSize: "0.95rem",
                  textAlign: "center",
                }}
              >
                {bonusChallengeText}
              </p>
            ) : null}

            {!isGameComplete ? (
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button type="button" onClick={handleResetToSetup} style={secondaryButtonStyle}>
                  Back to setup
                </button>
              </div>
            ) : null}
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
                Bingo results
              </p>
              <h2 style={{ margin: 0, color: textStrong, fontSize: "2rem" }}>
                You found all {cards.length} words!
              </h2>
              <p style={{ margin: 0, color: textMuted }}>Clicks: {attemptCount}</p>
              <p style={{ margin: 0, color: textMuted }}>Misses: {missCount}</p>
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
                    "0 0 0 1px rgba(118, 247, 213, 0.08), 0 0 34px rgba(72, 183, 255, 0.16)",
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
                  Blitz tempo: mastered.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  You finished in {formatElapsedTime(completedElapsedSeconds)}, under
                  the {formatBonusChallengeTime(bonusChallengeSeconds)} second target.
                </p>
              </div>
            ) : null}

            {didFinishWithoutMisses ? (
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
                  Perfect board
                </p>
                <h3 style={{ margin: 0, color: textStrong, fontSize: "1.45rem" }}>
                  Zero misses. Total command.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  Every prompt found its match on the first try. BingoBlitz just got
                  absolutely handled.
                </p>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  void buildGameFromSettings();
                }}
                style={primaryButtonStyle}
              >
                Play again
              </button>
              <button type="button" onClick={handleResetToSetup} style={secondaryButtonStyle}>
                Back to game setup
              </button>
              <button type="button" onClick={() => navigate("/play")} style={secondaryButtonStyle}>
                Back to game hub
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
