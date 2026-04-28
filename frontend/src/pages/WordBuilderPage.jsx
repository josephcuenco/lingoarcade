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
  {
    value: "small",
    label: "Small",
    wordCount: 6,
    gridSize: 5,
    distractionCount: 3,
    distractionRetryCount: 2,
  },
  {
    value: "medium",
    label: "Medium",
    wordCount: 10,
    gridSize: 6,
    distractionCount: 5,
    distractionRetryCount: 4,
  },
  {
    value: "large",
    label: "Large",
    wordCount: 14,
    gridSize: 7,
    distractionCount: 7,
    distractionRetryCount: 5,
  },
];

const gameSpeeds = [
  { value: "slow", label: "Slow", seconds: 14 },
  { value: "medium", label: "Medium", seconds: 10 },
  { value: "fast", label: "Fast", seconds: 7 },
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

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const notEnoughWordsPrefix = "You need at least";

const normalizeForGrid = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

const formatPromptCountdown = (seconds) => {
  if (seconds >= 10) {
    return `${Math.ceil(seconds)}s`;
  }

  return `${Math.max(0, seconds).toFixed(1)}s`;
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

const getBuilderDirection = (selectedDirection) => {
  if (selectedDirection !== "both") {
    return selectedDirection;
  }

  return Math.random() >= 0.5 ? "english-to-language" : "language-to-english";
};

const getNextPrompt = (queue, completedIds) => {
  const nextId = queue.find((wordId) => !completedIds.includes(wordId));
  const nextQueue = queue.filter((wordId) => wordId !== nextId);

  return { nextId: nextId || null, nextQueue };
};

const createDistractionLetters = (answer, distractionCount) => {
  const answerLetters = new Set(answer.split(""));
  const distractionAlphabet = alphabet
    .split("")
    .filter((letter) => !answerLetters.has(letter));
  const availableLetters = distractionAlphabet.length ? distractionAlphabet : alphabet.split("");

  return Array.from({ length: distractionCount }, (_, index) => ({
    id: `distraction-${index}-${Math.random().toString(16).slice(2)}`,
    letter: availableLetters[Math.floor(Math.random() * availableLetters.length)],
    isDistraction: true,
    isEmpty: false,
  }));
};

const createLetterTiles = (answer, gridSize, distractionCount = 0) => {
  const answerTiles = answer.split("").map((letter, index) => ({
    id: `answer-${index}-${letter}`,
    letter,
    isEmpty: false,
    isDistraction: false,
  }));
  const distractionTiles = createDistractionLetters(answer, distractionCount);
  const emptyCellCount = Math.max(
    0,
    gridSize * gridSize - answerTiles.length - distractionTiles.length,
  );
  const emptyTiles = Array.from({ length: emptyCellCount }, (_, index) => ({
    id: `empty-${index}-${Math.random().toString(16).slice(2)}`,
    letter: "",
    isEmpty: true,
    isDistraction: false,
  }));

  return shuffle([...answerTiles, ...distractionTiles, ...emptyTiles]);
};

const buildWordBuilderPrompts = (words, gameSize, selectedDirection, includeDistractions) => {
  const distractionCount = includeDistractions ? gameSize.distractionCount : 0;

  const candidates = shuffle(words)
    .map((word) => {
      const direction = getBuilderDirection(selectedDirection);
      const promptText =
        direction === "english-to-language" ? word.definition : word.term;
      const answerText =
        direction === "english-to-language" ? word.term : word.definition;
      const answer = normalizeForGrid(answerText);

      return {
        id: word.id,
        promptText,
        answerText,
        answer,
        direction,
      };
    })
    .filter(
      (word, index, allWords) =>
        word.answer.length >= 2 &&
        word.answer.length <= gameSize.gridSize * gameSize.gridSize - distractionCount &&
        allWords.findIndex((candidate) => candidate.answer === word.answer) === index,
    );

  return candidates.slice(0, gameSize.wordCount).map((word) => ({
    ...word,
    letters: createLetterTiles(word.answer, gameSize.gridSize, distractionCount),
  }));
};

export default function WordBuilderPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [selectedSize, setSelectedSize] = useState("small");
  const [selectedSpeed, setSelectedSpeed] = useState("medium");
  const [selectedDirection, setSelectedDirection] = useState("language-to-english");
  const [includeDistractions, setIncludeDistractions] = useState(false);
  const [selectedStrengths, setSelectedStrengths] = useState([
    "weak",
    "okay",
    "strong",
  ]);
  const [loading, setLoading] = useState(true);
  const [gameLoading, setGameLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState("setup");
  const [prompts, setPrompts] = useState([]);
  const [promptQueue, setPromptQueue] = useState([]);
  const [currentPromptId, setCurrentPromptId] = useState(null);
  const [promptRound, setPromptRound] = useState(0);
  const [completedIds, setCompletedIds] = useState([]);
  const [selectedTileIds, setSelectedTileIds] = useState([]);
  const [hiddenTileIds, setHiddenTileIds] = useState([]);
  const [builtAnswer, setBuiltAnswer] = useState("");
  const [feedbackById, setFeedbackById] = useState({});
  const [clickLocked, setClickLocked] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [gameStartedAt, setGameStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [promptSecondsRemaining, setPromptSecondsRemaining] = useState(0);
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0);
  const [performanceRecorded, setPerformanceRecorded] = useState(false);
  const boardRef = useRef(null);
  const resultsRef = useRef(null);

  const selectedGameSize =
    gameSizes.find((gameSize) => gameSize.value === selectedSize) || gameSizes[0];
  const selectedGameSpeed =
    gameSpeeds.find((gameSpeed) => gameSpeed.value === selectedSpeed) || gameSpeeds[1];
  const currentPrompt = prompts.find((prompt) => prompt.id === currentPromptId);
  const isGameActive = activeMode === "play";
  const isGameComplete = activeMode === "results";
  const didFinishWithoutMisses = isGameComplete && missCount === 0;

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

  const recordWordBuilderPerformance = useEffectEvent(async (completedPromptIds) => {
    const practiceWordIds = buildPracticeWordIds(completedPromptIds);

    if (!practiceWordIds.length) {
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
          "We couldn't save your word builder results, but your game results are still shown here.",
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
      boardRef.current?.scrollIntoView({
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
      setPromptSecondsRemaining(
        Math.max(0, (promptDurationMs - (Date.now() - promptStartedAt)) / 1000),
      );
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

      const { nextId, nextQueue } = getNextPrompt(
        [...promptQueue, currentPromptId],
        completedIds,
      );

      setCurrentPromptId(nextId);
      setPromptQueue(nextQueue);
      setPromptRound((currentRound) => currentRound + 1);
      setSelectedTileIds([]);
      setHiddenTileIds([]);
      setBuiltAnswer("");
      setFeedbackById({});
      setClickLocked(false);
    }, selectedGameSpeed.seconds * 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    completedIds,
    currentPromptId,
    isGameActive,
    promptQueue,
    promptRound,
    selectedGameSpeed.seconds,
  ]);

  useEffect(() => {
    if (
      activeMode !== "play" ||
      prompts.length === 0 ||
      completedIds.length !== prompts.length ||
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
    void recordWordBuilderPerformance(completedIds);
    setActiveMode("results");
  }, [
    activeMode,
    completedIds,
    completedIds.length,
    gameStartedAt,
    performanceRecorded,
    prompts.length,
  ]);

  const resetPromptState = () => {
    setSelectedTileIds([]);
    setHiddenTileIds([]);
    setBuiltAnswer("");
    setFeedbackById({});
    setClickLocked(false);
  };

  const resetGameState = () => {
    setPrompts([]);
    setPromptQueue([]);
    setCurrentPromptId(null);
    setPromptRound(0);
    setCompletedIds([]);
    resetPromptState();
    setClickCount(0);
    setMissCount(0);
    setGameStartedAt(null);
    setElapsedSeconds(0);
    setPromptSecondsRemaining(0);
    setCompletedElapsedSeconds(0);
    setPerformanceRecorded(false);
  };

  const advancePrompt = (nextCompletedIds = completedIds) => {
    const { nextId, nextQueue } = getNextPrompt(promptQueue, nextCompletedIds);

    setCurrentPromptId(nextId);
    setPromptQueue(nextQueue);
    setPromptRound((currentRound) => currentRound + 1);
    resetPromptState();
  };

  const recycleCurrentPrompt = () => {
    if (!currentPrompt) {
      return;
    }

    const distractionCount = includeDistractions ? selectedGameSize.distractionCount : 0;
    const refreshedPrompt = {
      ...currentPrompt,
      letters: createLetterTiles(currentPrompt.answer, selectedGameSize.gridSize, distractionCount),
    };
    const nextQueueWithRetry = [...promptQueue, currentPrompt.id];
    const { nextId, nextQueue } = getNextPrompt(nextQueueWithRetry, completedIds);

    setPrompts((currentPrompts) =>
      currentPrompts.map((prompt) =>
        prompt.id === currentPrompt.id ? refreshedPrompt : prompt,
      ),
    );
    setCurrentPromptId(nextId);
    setPromptQueue(nextQueue);
    setPromptRound((currentRound) => currentRound + 1);
    resetPromptState();
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
      setError("Choose at least one word strength for word builder.");
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
      const nextPrompts = buildWordBuilderPrompts(
        usableWords,
        selectedGameSize,
        selectedDirection,
        includeDistractions,
      );

      if (nextPrompts.length < selectedGameSize.wordCount) {
        setError(
          `${notEnoughWordsPrefix} ${selectedGameSize.wordCount} spellable words for a ${selectedGameSize.label.toLowerCase()} word builder game.`,
        );
        return;
      }

      resetGameState();
      setPrompts(nextPrompts);
      const promptIds = shuffle(nextPrompts.map((prompt) => prompt.id));
      setPromptQueue(promptIds.slice(1));
      setCurrentPromptId(promptIds[0]);
      setGameStartedAt(new Date());
      setActiveMode("play");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(err.response?.data?.detail || "We couldn't start word builder.");
    } finally {
      setGameLoading(false);
    }
  };

  const handleLetterClick = (tile) => {
    if (
      !isGameActive ||
      clickLocked ||
      tile.isEmpty ||
      hiddenTileIds.includes(tile.id) ||
      selectedTileIds.includes(tile.id) ||
      !currentPrompt
    ) {
      return;
    }

    setClickCount((currentClickCount) => currentClickCount + 1);

    if (tile.isDistraction) {
      const nextHiddenTileIds = [...hiddenTileIds, tile.id];
      const clickedDistractionCount = currentPrompt.letters.filter(
        (letterTile) =>
          letterTile.isDistraction && nextHiddenTileIds.includes(letterTile.id),
      );
      const shouldRetryPrompt =
        clickedDistractionCount.length >= selectedGameSize.distractionRetryCount;

      setMissCount((currentMissCount) => currentMissCount + 1);
      setClickLocked(true);
      setFeedbackById((currentFeedback) => ({ ...currentFeedback, [tile.id]: "wrong" }));

      window.setTimeout(() => {
        setHiddenTileIds(nextHiddenTileIds);
        setFeedbackById((currentFeedback) => {
          const nextFeedback = { ...currentFeedback };
          delete nextFeedback[tile.id];
          return nextFeedback;
        });

        if (shouldRetryPrompt) {
          recycleCurrentPrompt();
          return;
        }

        setClickLocked(false);
      }, 420);
      return;
    }

    const expectedLetter = currentPrompt.answer[builtAnswer.length];

    if (tile.letter !== expectedLetter) {
      setMissCount((currentMissCount) => currentMissCount + 1);
      setClickLocked(true);
      setFeedbackById((currentFeedback) => ({ ...currentFeedback, [tile.id]: "wrong" }));

      window.setTimeout(() => {
        setFeedbackById((currentFeedback) => {
          const nextFeedback = { ...currentFeedback };
          delete nextFeedback[tile.id];
          return nextFeedback;
        });
        setClickLocked(false);
      }, 420);
      return;
    }

    const nextBuiltAnswer = `${builtAnswer}${tile.letter}`;
    const nextSelectedTileIds = [...selectedTileIds, tile.id];
    setBuiltAnswer(nextBuiltAnswer);
    setSelectedTileIds(nextSelectedTileIds);
    setFeedbackById((currentFeedback) => ({ ...currentFeedback, [tile.id]: "correct" }));

    if (nextBuiltAnswer !== currentPrompt.answer) {
      return;
    }

    const nextCompletedIds = [...completedIds, currentPrompt.id];
    setCompletedIds(nextCompletedIds);
    setClickLocked(true);

    window.setTimeout(() => {
      advancePrompt(nextCompletedIds);
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
              Word Builder
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
                ? "Rebuild scattered letters."
                : isGameComplete
                  ? "Word build complete."
                  : "Click the letters in order."}
            </h1>
            <p style={{ margin: 0, maxWidth: "62ch", color: textMuted, fontSize: "1.02rem" }}>
              {activeMode === "setup"
                ? "Spell each translation from scattered letters before the countdown runs out."
                : isGameComplete
                  ? ""
                  : "Use the prompt, find the translation letters, and build the word before time runs out."}
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
                  Choose words for Word Builder
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
                  padding: "22px",
                  color: textMuted,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                You need at least one deck before you can start word builder.
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
                            padding: "10px 16px",
                            border: isSelected
                              ? "1px solid rgba(118, 247, 213, 0.42)"
                              : "1px solid rgba(130, 151, 255, 0.18)",
                            background: isSelected
                              ? "linear-gradient(135deg, rgba(72, 183, 255, 0.18), rgba(255, 77, 157, 0.12))"
                              : "rgba(255,255,255,0.04)",
                            color: textStrong,
                            cursor: "pointer",
                          }}
                        >
                          {language}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {selectedLanguage ? (
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
                      Decks for {selectedLanguage}
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
                              <p style={{ margin: 0, color: textMuted, fontSize: "0.88rem" }}>
                                {formatLastPlayed(deck.last_practiced_at)}
                              </p>
                              <p style={{ margin: 0, color: textMuted }}>
                                {isSelected ? "Selected for this game" : "Tap to include this deck"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ) : null}

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
                              {gameSize.wordCount} words
                            </span>
                            <span style={{ color: textMuted, fontSize: "0.8rem" }}>
                              {gameSize.gridSize}x{gameSize.gridSize}
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
                      Distraction letters
                    </p>
                    <div className="bingo-option-grid">
                      {[
                        { value: false, label: "Off" },
                        { value: true, label: "On" },
                      ].map((option) => {
                        const isSelected = includeDistractions === option.value;

                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => {
                              setIncludeDistractions(option.value);
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
                            <span>{option.label}</span>
                            <span style={{ color: textMuted, fontSize: "0.8rem" }}>
                              {option.value
                                ? `${selectedGameSize.distractionCount} extra letters`
                                : "Only answer letters"}
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
                              {gameSpeed.seconds}s per word
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
                            }}
                          >
                            {option.label}
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
                {gameLoading ? "Building word builder..." : "Start word builder"}
              </button>
              <button type="button" onClick={() => navigate("/play")} style={secondaryButtonStyle}>
                Back to games
              </button>
            </div>
          </section>
        ) : null}

        {isGameActive || isGameComplete ? (
          <section
            ref={boardRef}
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
            <div style={{ display: "grid", gap: "10px", textAlign: "center" }}>
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
                  minHeight: "2.85rem",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: textStrong,
                    fontSize: "clamp(1.25rem, 3.2vw, 2.35rem)",
                    lineHeight: 1,
                    textShadow:
                      "0 0 24px rgba(118, 247, 213, 0.16), 0 0 50px rgba(255, 77, 157, 0.12)",
                  }}
                >
                  {currentPrompt?.promptText || "All words complete."}
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
                    }}
                  >
                    {formatPromptCountdown(promptSecondsRemaining)}
                  </p>
                ) : null}
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
                  {completedIds.length} of {prompts.length} words built
                </p>
                <p style={{ margin: 0, color: textMuted }}>Misses: {missCount}</p>
                <p style={{ margin: 0, color: textMuted }}>Clicks: {clickCount}</p>
                <p style={{ margin: 0, color: textMuted }}>
                  Time: {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="word-builder-answer">
              {currentPrompt
                ? currentPrompt.answer.split("").map((letter, index) => (
                    <span
                      key={`${letter}-${index}`}
                      className={index < builtAnswer.length ? "is-filled" : ""}
                    >
                      {builtAnswer[index] || ""}
                    </span>
                  ))
                : null}
            </div>

            <div
              className={`word-builder-grid word-builder-grid-${selectedSize}`}
              style={{
                gridTemplateColumns: `repeat(${selectedGameSize.gridSize}, minmax(0, 1fr))`,
              }}
            >
              {currentPrompt?.letters.map((tile, index) => {
                if (tile.isEmpty || hiddenTileIds.includes(tile.id)) {
                  return (
                    <span
                      key={tile.id}
                      className="word-builder-empty-cell"
                      aria-hidden="true"
                    />
                  );
                }

                const isSelected = selectedTileIds.includes(tile.id);
                const feedback = feedbackById[tile.id];

                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`word-builder-tile word-builder-tile-${(index % 5) + 1} ${
                      isSelected ? "is-selected" : ""
                    } ${feedback === "correct" ? "is-correct" : ""} ${
                      feedback === "wrong" ? "is-wrong" : ""
                    }`}
                    disabled={!isGameActive || isSelected || clickLocked}
                    onClick={() => handleLetterClick(tile)}
                  >
                    {tile.letter}
                  </button>
                );
              })}
            </div>

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
                Word builder results
              </p>
              <h2 style={{ margin: 0, color: textStrong, fontSize: "2rem" }}>
                You built all {prompts.length} words!
              </h2>
              <p style={{ margin: 0, color: textMuted }}>Clicks: {clickCount}</p>
              <p style={{ margin: 0, color: textMuted }}>Misses: {missCount}</p>
              <p style={{ margin: 0, color: textMuted }}>
                Time: {formatElapsedTime(completedElapsedSeconds)}
              </p>
            </div>

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
                  Perfect build
                </p>
                <h3 style={{ margin: 0, color: textStrong, fontSize: "1.45rem" }}>
                  Every letter landed.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  You built every answer without a wrong click or timeout.
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
