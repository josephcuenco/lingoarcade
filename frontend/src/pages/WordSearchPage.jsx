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
  { value: "small", label: "Small", gridSize: 10, wordCount: 6, bonusSeconds: 40 },
  { value: "medium", label: "Medium", gridSize: 12, wordCount: 10, bonusSeconds: 80 },
  { value: "large", label: "Large", gridSize: 14, wordCount: 14, bonusSeconds: 120 },
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
  {
    value: "both",
    label: "Both",
  },
];

const directions = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: -1 },
  { row: 1, col: -1 },
];

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const notEnoughSearchableWordsPrefix = "You need at least";

const normalizeForGrid = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

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

const createEmptyGrid = (size) =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => ""));

const getLineCells = (start, end) => {
  const rowDifference = end.row - start.row;
  const colDifference = end.col - start.col;
  const rowStep = Math.sign(rowDifference);
  const colStep = Math.sign(colDifference);
  const rowDistance = Math.abs(rowDifference);
  const colDistance = Math.abs(colDifference);

  if (
    !(
      rowDistance === 0 ||
      colDistance === 0 ||
      rowDistance === colDistance
    )
  ) {
    return [];
  }

  const length = Math.max(rowDistance, colDistance) + 1;
  return Array.from({ length }, (_, index) => ({
    row: start.row + rowStep * index,
    col: start.col + colStep * index,
  }));
};

const cellKey = (cell) => `${cell.row}-${cell.col}`;

const placeWord = (grid, word) => {
  const size = grid.length;
  const attempts = 220;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const direction = shuffle(directions)[0];
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);
    const endRow = row + direction.row * (word.length - 1);
    const endCol = col + direction.col * (word.length - 1);

    if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) {
      continue;
    }

    const cells = Array.from({ length: word.length }, (_, index) => ({
      row: row + direction.row * index,
      col: col + direction.col * index,
    }));
    const canPlace = cells.every((cell, index) => {
      const currentValue = grid[cell.row][cell.col];
      return !currentValue || currentValue === word[index];
    });

    if (!canPlace) {
      continue;
    }

    cells.forEach((cell, index) => {
      grid[cell.row][cell.col] = word[index];
    });

    return cells;
  }

  return null;
};

const getWordSearchDirection = (selectedDirection) => {
  if (selectedDirection !== "both") {
    return selectedDirection;
  }

  return Math.random() >= 0.5 ? "english-to-language" : "language-to-english";
};

const buildWordSearch = (
  words,
  gameSize,
  selectedDirection,
  recentWordIds = new Set(),
) => {
  const grid = createEmptyGrid(gameSize.gridSize);
  const placedWords = [];
  const candidates = shuffle(words)
    .map((word) => {
      const direction = getWordSearchDirection(selectedDirection);
      const clueText =
        direction === "english-to-language" ? word.definition : word.term;
      const hiddenText =
        direction === "english-to-language" ? word.term : word.definition;

      return {
        id: word.id,
        term: word.term,
        definition: word.definition,
        clueText,
        hiddenText,
        direction,
        gridWord: normalizeForGrid(hiddenText),
        wasRecentlyUsed: recentWordIds.has(word.id),
      };
    })
    .filter(
      (word, index, allWords) =>
        word.gridWord.length >= 3 &&
        word.gridWord.length <= gameSize.gridSize &&
        allWords.findIndex((candidate) => candidate.gridWord === word.gridWord) === index,
    )
    .sort((left, right) => {
      if (left.wasRecentlyUsed !== right.wasRecentlyUsed) {
        return left.wasRecentlyUsed ? 1 : -1;
      }

      return right.gridWord.length - left.gridWord.length;
    });

  for (const word of candidates) {
    if (placedWords.length >= gameSize.wordCount) {
      break;
    }

    const cells = placeWord(grid, word.gridWord);

    if (cells) {
      placedWords.push({ ...word, cells });
    }
  }

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      if (!grid[row][col]) {
        grid[row][col] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return { grid, placedWords: shuffle(placedWords) };
};

export default function WordSearchPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [selectedSize, setSelectedSize] = useState("small");
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
  const [grid, setGrid] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWordIds, setFoundWordIds] = useState([]);
  const [missCount, setMissCount] = useState(0);
  const [gameStartedAt, setGameStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0);
  const [performanceRecorded, setPerformanceRecorded] = useState(false);
  const [recentWordSearchIds, setRecentWordSearchIds] = useState([]);
  const boardRef = useRef(null);
  const resultsRef = useRef(null);

  const selectedGameSize =
    gameSizes.find((gameSize) => gameSize.value === selectedSize) || gameSizes[0];
  const bonusChallengeText = `Bonus challenge: Find every word in ${formatElapsedTime(
    selectedGameSize.bonusSeconds,
  )} or less.`;
  const isGameActive = activeMode === "play";
  const isGameComplete = activeMode === "results";
  const didBeatBonusChallenge =
    isGameComplete && completedElapsedSeconds <= selectedGameSize.bonusSeconds;
  const foundCellKeys = useMemo(() => {
    const keys = new Set();
    targetWords
      .filter((word) => foundWordIds.includes(word.id))
      .forEach((word) => {
        word.cells.forEach((cell) => keys.add(cellKey(cell)));
      });
    return keys;
  }, [foundWordIds, targetWords]);
  const selectedCellKeys = useMemo(
    () => new Set(selectedCells.map((cell) => cellKey(cell))),
    [selectedCells],
  );

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
          "We couldn't save your word search results, but your game results are still shown here.",
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
    if (
      targetWords.length === 0 ||
      foundWordIds.length !== targetWords.length ||
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
    void recordGamePerformance(foundWordIds);
    setActiveMode("results");
  }, [foundWordIds, foundWordIds.length, gameStartedAt, performanceRecorded, targetWords.length]);

  const resetGameState = () => {
    setGrid([]);
    setTargetWords([]);
    setSelectedStart(null);
    setSelectedCells([]);
    setFoundWordIds([]);
    setMissCount(0);
    setGameStartedAt(null);
    setElapsedSeconds(0);
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
      setError("Choose at least one word strength for word search.");
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
      const recentWordIds = new Set(recentWordSearchIds);
      const puzzle = buildWordSearch(
        usableWords,
        selectedGameSize,
        selectedDirection,
        recentWordIds,
      );

      if (puzzle.placedWords.length < selectedGameSize.wordCount) {
        setError(
          `You need at least ${selectedGameSize.wordCount} searchable answers for a ${selectedGameSize.label.toLowerCase()} word search. Hidden answers should use letters A-Z and fit inside a ${selectedGameSize.gridSize}x${selectedGameSize.gridSize} grid.`,
        );
        return;
      }

      resetGameState();
      setGrid(puzzle.grid);
      setTargetWords(puzzle.placedWords);
      setRecentWordSearchIds((currentIds) => {
        const nextIds = [
          ...puzzle.placedWords.map((word) => word.id),
          ...currentIds.filter(
            (wordId) => !puzzle.placedWords.some((word) => word.id === wordId),
          ),
        ];

        return nextIds.slice(0, Math.max(selectedGameSize.wordCount * 3, 24));
      });
      setGameStartedAt(new Date());
      setActiveMode("play");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(err.response?.data?.detail || "We couldn't start word search.");
    } finally {
      setGameLoading(false);
    }
  };

  const handleCellClick = (row, col) => {
    if (!isGameActive) {
      return;
    }

    const clickedCell = { row, col };

    if (!selectedStart) {
      setSelectedStart(clickedCell);
      setSelectedCells([clickedCell]);
      return;
    }

    const nextSelectedCells = getLineCells(selectedStart, clickedCell);

    if (nextSelectedCells.length === 0) {
      setMissCount((currentMissCount) => currentMissCount + 1);
      setSelectedStart(clickedCell);
      setSelectedCells([clickedCell]);
      return;
    }

    const selectedForward = nextSelectedCells
      .map((cell) => grid[cell.row][cell.col])
      .join("");
    const selectedBackward = [...nextSelectedCells]
      .reverse()
      .map((cell) => grid[cell.row][cell.col])
      .join("");
    const matchingWord = targetWords.find(
      (word) =>
        !foundWordIds.includes(word.id) &&
        (word.gridWord === selectedForward || word.gridWord === selectedBackward),
    );

    setSelectedCells(nextSelectedCells);
    setSelectedStart(null);

    if (matchingWord) {
      setFoundWordIds((currentFoundIds) => [...currentFoundIds, matchingWord.id]);
      return;
    }

    setMissCount((currentMissCount) => currentMissCount + 1);
    window.setTimeout(() => {
      setSelectedCells([]);
    }, 450);
  };

  const handleResetToSetup = () => {
    resetGameState();
    setActiveMode("setup");
    setError("");
  };

  const handlePlayAgain = () => {
    void buildGameFromSettings();
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
              Word Search
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
              ? "Find every hidden word."
              : isGameComplete
              ? "Find every hidden word."
              : "Create a word search."} 
            </h1>
            <p style={{ margin: 0, maxWidth: "62ch", color: textMuted, fontSize: "1.02rem" }}>
              {isGameActive
              ? ""
              : "Use the word list as your clue, then find each hidden translation in the grid."}
            </p>
          </div>
        </section>

        {error &&
        error !== chooseDeckErrorMessage &&
        !error.startsWith(notEnoughSearchableWordsPrefix) ? (
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
                  Build a word search
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
                You need at least one deck before you can start word search.
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
                      fontSize: "0.74rem",
                    }}
                  >
                    Pick a language
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {availableLanguages.map((language) => {
                      const isActive = selectedLanguage === language;

                      return (
                        <button
                          key={language}
                          type="button"
                          onClick={() => handleSelectLanguage(language)}
                          style={{
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
                        fontSize: "0.74rem",
                      }}
                    >
                      {selectedLanguage}
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
                              padding: "12px 14px",
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
                              textAlign: "center",
                            }}
                          >
                            <span>
                              {typeof direction.label === "function"
                                ? direction.label(selectedLanguage)
                                : direction.label}
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

            {error.startsWith(notEnoughSearchableWordsPrefix) ? (
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
                {gameLoading ? "Building word search..." : "Start word search"}
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
                {foundWordIds.length} of {targetWords.length} words found
              </p>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <p style={{ margin: 0, color: textMuted }}>Misses: {missCount}</p>
                <p style={{ margin: 0, color: textMuted }}>
                  Time: {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="word-search-play-area">
              <div
                className="word-search-grid"
                style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
              >
                {grid.map((row, rowIndex) =>
                  row.map((letter, colIndex) => {
                    const key = `${rowIndex}-${colIndex}`;
                    const isSelected = selectedCellKeys.has(key);
                    const isFound = foundCellKeys.has(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`word-search-cell ${isSelected ? "is-selected" : ""} ${
                          isFound ? "is-found" : ""
                        }`}
                        disabled={isGameComplete}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      >
                        {letter}
                      </button>
                    );
                  }),
                )}
              </div>

              <aside className="word-search-word-list">
                <p
                  style={{
                    margin: 0,
                    color: "#76f7d5",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontSize: "0.75rem",
                  }}
                >
                  Find these translated words
                </p>
                <div style={{ display: "grid", gap: "8px" }}>
                  {targetWords.map((word) => {
                    const isFound = foundWordIds.includes(word.id);

                    return (
                      <div
                        key={word.id}
                        style={{
                          border: isFound
                            ? "1px solid rgba(118, 247, 213, 0.42)"
                            : "1px solid rgba(130, 151, 255, 0.16)",
                          borderRadius: "16px",
                          padding: "10px 12px",
                          background: isFound
                            ? "rgba(118, 247, 213, 0.12)"
                            : "rgba(255,255,255,0.04)",
                          color: isFound ? "#8ff8de" : textStrong,
                          display: "grid",
                          gap: "3px",
                        }}
                      >
                        <span style={{ textDecoration: isFound ? "line-through" : "none" }}>
                          {word.clueText}
                        </span>
                        
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>

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
                Word search results
              </p>
              <h2 style={{ margin: 0, color: textStrong, fontSize: "2rem" }}>
                You found all {targetWords.length} words!
              </h2>
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
                  Speed-reader mode: activated.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  You solved the {selectedGameSize.label.toLowerCase()} grid in{" "}
                  {formatElapsedTime(completedElapsedSeconds)}, beating the{" "}
                  {formatElapsedTime(selectedGameSize.bonusSeconds)} target.
                </p>
              </div>
            ) : null}

            {missCount === 0 ? (
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
                  Perfect search
                </p>
                <h3 style={{ margin: 0, color: textStrong, fontSize: "1.45rem" }}>
                  Laser focus. Zero misses.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  You tracked every hidden word without a single false selection.
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
