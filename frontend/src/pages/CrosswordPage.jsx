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
  { value: "small", label: "Small", gridSize: 11, wordCount: 6 },
  { value: "medium", label: "Medium", gridSize: 13, wordCount: 10 },
  { value: "large", label: "Large", gridSize: 15, wordCount: 14 },
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

const notEnoughCrosswordWordsPrefix = "You need at least";

const normalizeForGrid = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

const cellKey = (row, col) => `${row}-${col}`;

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

const getCrosswordDirection = (selectedDirection) => {
  if (selectedDirection !== "both") {
    return selectedDirection;
  }

  return Math.random() >= 0.5 ? "english-to-language" : "language-to-english";
};

const createEmptyGrid = (size) =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => null));

const getEntryCells = (entry) =>
  Array.from({ length: entry.answer.length }, (_, index) => ({
    row: entry.row + (entry.orientation === "down" ? index : 0),
    col: entry.col + (entry.orientation === "across" ? index : 0),
  }));

const canPlaceEntry = (grid, answer, row, col, orientation, shouldIntersect) => {
  const size = grid.length;
  let intersections = 0;

  for (let index = 0; index < answer.length; index += 1) {
    const nextRow = row + (orientation === "down" ? index : 0);
    const nextCol = col + (orientation === "across" ? index : 0);

    if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) {
      return false;
    }

    const currentCell = grid[nextRow][nextCol];
    if (currentCell && currentCell.letter !== answer[index]) {
      return false;
    }

    if (currentCell?.letter === answer[index]) {
      intersections += 1;
    }
  }

  if (shouldIntersect && intersections === 0) {
    return false;
  }

  const beforeRow = row - (orientation === "down" ? 1 : 0);
  const beforeCol = col - (orientation === "across" ? 1 : 0);
  const afterRow = row + (orientation === "down" ? answer.length : 0);
  const afterCol = col + (orientation === "across" ? answer.length : 0);

  if (grid[beforeRow]?.[beforeCol] || grid[afterRow]?.[afterCol]) {
    return false;
  }

  return true;
};

const placeEntry = (grid, entry) => {
  getEntryCells(entry).forEach((cell, index) => {
    const currentCell = grid[cell.row][cell.col] || {
      letter: entry.answer[index],
      entryIds: [],
    };

    grid[cell.row][cell.col] = {
      ...currentCell,
      letter: entry.answer[index],
      entryIds: [...new Set([...currentCell.entryIds, entry.id])],
    };
  });
};

const findPlacement = (grid, answer, placedEntries) => {
  if (placedEntries.length === 0) {
    const row = Math.floor(grid.length / 2);
    const col = Math.max(0, Math.floor((grid.length - answer.length) / 2));
    return { row, col, orientation: "across" };
  }

  const placements = [];

  placedEntries.forEach((placedEntry) => {
    getEntryCells(placedEntry).forEach((cell, placedIndex) => {
      answer.split("").forEach((letter, answerIndex) => {
        if (letter !== placedEntry.answer[placedIndex]) {
          return;
        }

        const orientation = placedEntry.orientation === "across" ? "down" : "across";
        const row = cell.row - (orientation === "down" ? answerIndex : 0);
        const col = cell.col - (orientation === "across" ? answerIndex : 0);

        if (canPlaceEntry(grid, answer, row, col, orientation, true)) {
          placements.push({ row, col, orientation });
        }
      });
    });
  });

  if (placements.length > 0) {
    return shuffle(placements)[0];
  }

  return null;
};

const findFallbackPlacement = (grid, answer) => {
  const placementOptions = shuffle(
    ["across", "down"].flatMap((orientation) =>
      Array.from({ length: grid.length }, (_, row) =>
        Array.from({ length: grid.length }, (_, col) => ({
          row,
          col,
          orientation,
        })),
      ).flat(),
    ),
  );

  for (const placement of placementOptions) {
    if (
      canPlaceEntry(
        grid,
        answer,
        placement.row,
        placement.col,
        placement.orientation,
        false,
      )
    ) {
      return placement;
    }
  }

  return null;
};

const buildCrossword = (
  words,
  gameSize,
  selectedDirection,
  recentWordIds = new Set(),
) => {
  const grid = createEmptyGrid(gameSize.gridSize);
  const entries = [];
  const numberByStartCell = {};
  const candidates = shuffle(words)
    .map((word) => {
      const direction = getCrosswordDirection(selectedDirection);
      const clueText =
        direction === "english-to-language" ? word.definition : word.term;
      const answerText =
        direction === "english-to-language" ? word.term : word.definition;

      return {
        id: word.id,
        clueText,
        answerText,
        answer: normalizeForGrid(answerText),
        direction,
        wasRecentlyUsed: recentWordIds.has(word.id),
      };
    })
    .filter(
      (word, index, allWords) =>
        word.answer.length >= 3 &&
        word.answer.length <= gameSize.gridSize &&
        allWords.findIndex((candidate) => candidate.answer === word.answer) === index,
    )
    .sort((left, right) => {
      if (left.wasRecentlyUsed !== right.wasRecentlyUsed) {
        return left.wasRecentlyUsed ? 1 : -1;
      }

      return right.answer.length - left.answer.length;
    });

  for (const word of candidates) {
    if (entries.length >= gameSize.wordCount) {
      break;
    }

    const placement =
      entries.length === 0
        ? findFallbackPlacement(grid, word.answer)
        : findPlacement(grid, word.answer, entries);

    if (!placement) {
      continue;
    }

    const startKey = cellKey(placement.row, placement.col);
    const entryNumber =
      numberByStartCell[startKey] || Object.keys(numberByStartCell).length + 1;
    numberByStartCell[startKey] = entryNumber;

    const entry = {
      ...word,
      ...placement,
      number: entryNumber,
    };

    placeEntry(grid, entry);
    entries.push(entry);
  }

  return { grid, entries };
};

const getEntryValue = (entry, userLetters) =>
  getEntryCells(entry)
    .map((cell) => userLetters[cellKey(cell.row, cell.col)] || "")
    .join("");

export default function CrosswordPage() {
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
  const [entries, setEntries] = useState([]);
  const [userLetters, setUserLetters] = useState({});
  const [wrongCellKeys, setWrongCellKeys] = useState([]);
  const [checkedCorrectEntryIds, setCheckedCorrectEntryIds] = useState([]);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [checkCount, setCheckCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [gameStartedAt, setGameStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0);
  const [performanceRecorded, setPerformanceRecorded] = useState(false);
  const [recentCrosswordIds, setRecentCrosswordIds] = useState([]);
  const boardRef = useRef(null);
  const resultsRef = useRef(null);

  const selectedGameSize =
    gameSizes.find((gameSize) => gameSize.value === selectedSize) || gameSizes[0];
  const isGameActive = activeMode === "play";
  const isGameComplete = activeMode === "results";
  const checkedCorrectEntryIdSet = useMemo(
    () => new Set(checkedCorrectEntryIds),
    [checkedCorrectEntryIds],
  );
  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === activeEntryId) || null,
    [activeEntryId, entries],
  );
  const activeCellKeys = useMemo(() => {
    if (!activeEntry) {
      return new Set();
    }

    return new Set(getEntryCells(activeEntry).map((cell) => cellKey(cell.row, cell.col)));
  }, [activeEntry]);
  const lockedCellKeys = useMemo(() => {
    const keys = new Set();

    entries
      .filter((entry) => checkedCorrectEntryIdSet.has(entry.id))
      .forEach((entry) => {
        getEntryCells(entry).forEach((cell) => keys.add(cellKey(cell.row, cell.col)));
      });

    return keys;
  }, [checkedCorrectEntryIdSet, entries]);
  const acrossEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.orientation === "across")
        .sort((left, right) => left.number - right.number),
    [entries],
  );
  const downEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.orientation === "down")
        .sort((left, right) => left.number - right.number),
    [entries],
  );
  const didBeatBonusChallenge =
    isGameComplete && checkCount <= 1;

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
          "We couldn't save your crossword results, but your game results are still shown here.",
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
      entries.length === 0 ||
      checkedCorrectEntryIds.length !== entries.length ||
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
    void recordGamePerformance(checkedCorrectEntryIds);
    setActiveMode("results");
  }, [
    checkedCorrectEntryIds,
    checkedCorrectEntryIds.length,
    entries.length,
    gameStartedAt,
    performanceRecorded,
  ]);

  const resetGameState = () => {
    setGrid([]);
    setEntries([]);
    setUserLetters({});
    setWrongCellKeys([]);
    setCheckedCorrectEntryIds([]);
    setActiveEntryId(null);
    setCheckCount(0);
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
      setError("Choose at least one word strength for crossword.");
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
      const puzzle = buildCrossword(
        usableWords,
        selectedGameSize,
        selectedDirection,
        new Set(recentCrosswordIds),
      );

      if (puzzle.entries.length < selectedGameSize.wordCount) {
        setError(
          `${notEnoughCrosswordWordsPrefix} ${selectedGameSize.wordCount} crossword-friendly words for a ${selectedGameSize.label.toLowerCase()} puzzle. Answers need to use letters A-Z and fit inside the grid.`,
        );
        return;
      }

      resetGameState();
      setGrid(puzzle.grid);
      setEntries(puzzle.entries);
      setRecentCrosswordIds((currentIds) => {
        const nextIds = [
          ...puzzle.entries.map((entry) => entry.id),
          ...currentIds.filter(
            (wordId) => !puzzle.entries.some((entry) => entry.id === wordId),
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

      setError(err.response?.data?.detail || "We couldn't start crossword.");
    } finally {
      setGameLoading(false);
    }
  };

  const focusCell = (row, col) => {
    window.requestAnimationFrame(() => {
      const nextInput = document.querySelector(
        `[data-crossword-cell="${cellKey(row, col)}"]`,
      );

      nextInput?.focus();
      nextInput?.select();
    });
  };

  const focusNextOpenCell = (entry, row, col, direction = 1) => {
    const activeCells = getEntryCells(entry);
    const currentCellIndex = activeCells.findIndex(
      (cell) => cell.row === row && cell.col === col,
    );

    for (
      let index = currentCellIndex + direction;
      index >= 0 && index < activeCells.length;
      index += direction
    ) {
      const nextCell = activeCells[index];

      if (!lockedCellKeys.has(cellKey(nextCell.row, nextCell.col))) {
        focusCell(nextCell.row, nextCell.col);
        return;
      }
    }
  };

  const handleCellClick = (row, col, cell) => {
    if (!cell || isGameComplete) {
      return;
    }

    const cellEntries = cell.entryIds
      .map((entryId) => entries.find((entry) => entry.id === entryId))
      .filter(Boolean)
      .sort((left, right) => {
        if (left.orientation !== right.orientation) {
          return left.orientation === "across" ? -1 : 1;
        }

        return left.number - right.number;
      });

    if (cellEntries.length === 0) {
      return;
    }

    const activeIndex = cellEntries.findIndex((entry) => entry.id === activeEntryId);
    const nextEntry = activeIndex >= 0 ? cellEntries[(activeIndex + 1) % cellEntries.length] : cellEntries[0];

    setActiveEntryId(nextEntry.id);

    if (lockedCellKeys.has(cellKey(row, col))) {
      focusNextOpenCell(nextEntry, row, col);
      return;
    }

    focusCell(row, col);
  };

  const handleCellChange = (row, col, value) => {
    const nextLetter = normalizeForGrid(value).slice(-1);
    const key = cellKey(row, col);
    const touchedEntryIds = grid[row][col]?.entryIds || [];

    if (lockedCellKeys.has(key)) {
      return;
    }

    setUserLetters((currentLetters) => ({
      ...currentLetters,
      [key]: nextLetter,
    }));
    setWrongCellKeys((currentKeys) => {
      const touchedCellKeys = entries
        .filter((entry) => touchedEntryIds.includes(entry.id))
        .flatMap((entry) => getEntryCells(entry).map((cell) => cellKey(cell.row, cell.col)));
      const touchedCellKeySet = new Set(touchedCellKeys);

      return currentKeys.filter((cell) => !touchedCellKeySet.has(cell));
    });
    setCheckedCorrectEntryIds((currentIds) =>
      currentIds.filter((entryId) => !touchedEntryIds.includes(entryId)),
    );

    if (!nextLetter || !activeEntry) {
      return;
    }

    focusNextOpenCell(activeEntry, row, col);
  };

  const handleCellKeyDown = (row, col, event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCheckPuzzle();
      return;
    }

    if (event.key !== "Backspace" || !activeEntry || userLetters[cellKey(row, col)]) {
      return;
    }

    focusNextOpenCell(activeEntry, row, col, -1);
  };

  const handleCheckPuzzle = () => {
    const nextWrongCellKeys = [];
    const nextCorrectEntryIds = [];

    setCheckCount((currentCheckCount) => currentCheckCount + 1);

    entries.forEach((entry) => {
      const currentValue = getEntryValue(entry, userLetters);
      if (currentValue.length !== entry.answer.length) {
        return;
      }

      if (currentValue === entry.answer) {
        nextCorrectEntryIds.push(entry.id);
        return;
      }

      getEntryCells(entry).forEach((cell) => {
        nextWrongCellKeys.push(cellKey(cell.row, cell.col));
      });
    });

    setWrongCellKeys([...new Set(nextWrongCellKeys)]);
    setCheckedCorrectEntryIds(nextCorrectEntryIds);

    if (nextWrongCellKeys.length > 0) {
      setMissCount((currentMissCount) => currentMissCount + 1);
    }
  };

  const handleResetToSetup = () => {
    resetGameState();
    setActiveMode("setup");
    setError("");
  };

  const handlePlayAgain = () => {
    void buildGameFromSettings();
  };

  const renderClueCard = (entry) => {
    const isSolved = checkedCorrectEntryIdSet.has(entry.id);

    return (
      <div
        key={entry.id}
        style={{
          border: isSolved
            ? "1px solid rgba(118, 247, 213, 0.42)"
            : "1px solid rgba(130, 151, 255, 0.16)",
          borderRadius: "16px",
          padding: "10px 12px",
          background: isSolved
            ? "rgba(118, 247, 213, 0.12)"
            : "rgba(255,255,255,0.04)",
          color: isSolved ? "#8ff8de" : textStrong,
          display: "grid",
          gap: "4px",
        }}
      >
        <span style={{ textDecoration: isSolved ? "line-through" : "none" }}>
          <strong>{entry.number}</strong>&nbsp;&nbsp;{entry.clueText}
        </span>
      </div>
    );
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
              Crossword
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
              {isGameComplete
                ? "Crossword complete."
                : isGameActive
                  ? "Fill in the puzzle."
                  : "Build a clue grid."}
            </h1>
            <p style={{ margin: 0, maxWidth: "62ch", color: textMuted, fontSize: "1.02rem" }}>
              {isGameActive
                ? ""
                : "Use vocabulary clues to fill a crossword made from your deck words."}
            </p>
          </div>
        </section>

        {error &&
        error !== chooseDeckErrorMessage &&
        !error.startsWith(notEnoughCrosswordWordsPrefix) ? (
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
                  Create a crossword
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
                You need at least one deck before you can start crossword.
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
                              {gameSize.wordCount} clues
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

            {error.startsWith(notEnoughCrosswordWordsPrefix) ? (
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
                {gameLoading ? "Building crossword..." : "Start crossword"}
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
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <p style={{ margin: 0, color: "#76f7d5" }}>
                  {checkedCorrectEntryIds.length} of {entries.length} clues solved
                </p>
                <span className="crossword-info-tooltip" tabIndex={0}>
                  i
                  <span className="crossword-info-tooltip-text">
                    In this version, every clue answer is valid, but not every adjacent
                    group of letters forms a crossword word.
                  </span>
                </span>
              </div>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <p style={{ margin: 0, color: textMuted }}>Checks: {checkCount}</p>
                <p style={{ margin: 0, color: textMuted }}>
                  Time: {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="crossword-play-area">
              <div
                className={`crossword-grid crossword-grid-${selectedSize}`}
                style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
              >
                {grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const key = cellKey(rowIndex, colIndex);
                    const startingEntries = entries.filter(
                      (entry) => entry.row === rowIndex && entry.col === colIndex,
                    );
                    const isLocked = lockedCellKeys.has(key);
                    const isWrong = !isLocked && wrongCellKeys.includes(key);
                    const isActive = activeCellKeys.has(key);

                    if (!cell) {
                      return (
                        <button
                          key={key}
                          type="button"
                          className="crossword-cell crossword-cell-block"
                          aria-label="Clear selected crossword word"
                          onClick={() => {
                            setActiveEntryId(null);
                            setWrongCellKeys([]);
                          }}
                        />
                      );
                    }

                    return (
                      <label
                        key={key}
                        className={`crossword-cell ${isWrong ? "is-wrong" : ""} ${
                          isLocked ? "is-solved" : ""
                        } ${isActive ? "is-active" : ""}`}
                        onClick={() => handleCellClick(rowIndex, colIndex, cell)}
                      >
                        {startingEntries.length > 0 ? (
                          <span className="crossword-cell-number">
                            {startingEntries[0].number}
                          </span>
                        ) : null}
                        <input
                          data-crossword-cell={key}
                          value={userLetters[key] || ""}
                          maxLength={1}
                          disabled={isGameComplete}
                          readOnly={isLocked}
                          onChange={(event) =>
                            handleCellChange(rowIndex, colIndex, event.target.value)
                          }
                          onKeyDown={(event) => handleCellKeyDown(rowIndex, colIndex, event)}
                          aria-label={`Crossword cell ${rowIndex + 1}, ${colIndex + 1}`}
                        />
                      </label>
                    );
                  }),
                )}
              </div>

              <aside className="crossword-clue-list">
                <p
                  style={{
                    margin: 0,
                    color: "#76f7d5",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontSize: "0.75rem",
                  }}
                >
                  Clues
                </p>
                <div style={{ display: "grid", gap: "16px" }}>
                  <section style={{ display: "grid", gap: "8px" }}>
                    <h3
                      style={{
                        margin: 0,
                        color: textStrong,
                        fontSize: "1rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Across
                    </h3>
                    {acrossEntries.length > 0 ? (
                      acrossEntries.map(renderClueCard)
                    ) : (
                      <p style={{ margin: 0, color: textMuted }}>No across clues this round.</p>
                    )}
                  </section>

                  <section style={{ display: "grid", gap: "8px" }}>
                    <h3
                      style={{
                        margin: 0,
                        color: textStrong,
                        fontSize: "1rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Down
                    </h3>
                    {downEntries.length > 0 ? (
                      downEntries.map(renderClueCard)
                    ) : (
                      <p style={{ margin: 0, color: textMuted }}>No down clues this round.</p>
                    )}
                  </section>
                </div>
              </aside>
            </div>

            <p style={{ margin: "-4px 0 0", color: textStrong, textAlign: "center" }}>
              Bonus challenge: Solve the entire board without checking more than once.
            </p>

            {!isGameComplete ? (
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button type="button" onClick={handleCheckPuzzle} style={primaryButtonStyle}>
                  Check puzzle
                </button>
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
                Crossword results
              </p>
              <h2 style={{ margin: 0, color: textStrong, fontSize: "2rem" }}>
                You solved all {entries.length} clues!
              </h2>
              <p style={{ margin: 0, color: textMuted }}>Checks: {checkCount}</p>
              <p style={{ margin: 0, color: textMuted }}>Wrong checks: {missCount}</p>
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
                  First-check finish. Beautifully clean.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  You solved the whole board with {checkCount} check
                  {checkCount === 1 ? "" : "s"}. That is crossword confidence.
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
                  Perfect grid
                </p>
                <h3 style={{ margin: 0, color: textStrong, fontSize: "1.45rem" }}>
                  No wrong checks. Clean solve.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  Every clue clicked into place without needing a correction.
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
