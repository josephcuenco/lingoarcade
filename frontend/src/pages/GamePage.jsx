import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";

const textMuted = "#bfc7e6";
const textSoft = "#cfd6ef";
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
    status: "available",
  },
  {
    name: "Word Search",
    accent: "#48b7ff",
    description: "Find hidden vocabulary terms in a puzzle grid built from your study words.",
    status: "coming-soon",
  },
  {
    name: "Bingo",
    accent: "#ffb86c",
    description: "Match prompts to the right words and fill a board as you play.",
    status: "coming-soon",
  },
  {
    name: "Crossword",
    accent: "#ff79c6",
    description: "Solve clue-based grids using the words and translations from your decks.",
    status: "coming-soon",
  },
  {
    name: "Word Builder",
    accent: "#b388ff",
    description: "Assemble words from fragments and practice spelling and recognition.",
    status: "coming-soon",
  },
];

const strengthOptions = [
  { value: "all", label: "All words" },
  { value: "weak", label: "Weak words" },
  { value: "okay", label: "Okay words" },
  { value: "strong", label: "Strong words" },
];

const strengthStyles = {
  weak: {
    label: "Weak",
    color: "#ffb5d5",
    border: "1px solid rgba(255, 92, 156, 0.28)",
    background: "rgba(255, 77, 157, 0.14)",
  },
  okay: {
    label: "Okay",
    color: "#ffe3a3",
    border: "1px solid rgba(255, 197, 74, 0.26)",
    background: "rgba(255, 197, 74, 0.12)",
  },
  strong: {
    label: "Strong",
    color: "#8ff8de",
    border: "1px solid rgba(118, 247, 213, 0.3)",
    background: "rgba(118, 247, 213, 0.12)",
  },
};

function formatLastPlayed(lastPracticedAt) {
  if (!lastPracticedAt) {
    return "Not played yet";
  }

  const practicedDate = new Date(lastPracticedAt);
  const currentDate = new Date();
  practicedDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);

  const dayDifference = Math.round(
    (currentDate.getTime() - practicedDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDifference <= 0) {
    return "Played today";
  }

  if (dayDifference === 1) {
    return "Played yesterday";
  }

  return `Played ${dayDifference} days ago`;
}

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

function buildQuizQuestions(words, limit) {
  const eligibleWords = words.filter((word) => word.definition);
  const shuffledWords = shuffle(eligibleWords).slice(0, limit);

  return shuffledWords.map((word) => {
    const distractors = shuffle(
      eligibleWords
        .filter((candidate) => candidate.id !== word.id)
        .map((candidate) => candidate.definition),
    )
      .filter((definition, index, definitions) =>
        definitions.indexOf(definition) === index,
      )
      .slice(0, 3);

    const options = shuffle([word.definition, ...distractors]).slice(0, 4);

    return {
      id: word.id,
      prompt: word.term,
      correctAnswer: word.definition,
      options,
      deckName: word.deckName,
      language: word.language,
    };
  });
}

export default function GamePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [strengthFilter, setStrengthFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState("hub");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [quizResults, setQuizResults] = useState([]);

  const handleUnauthorized = () => {
    logout();
    navigate("/login", { replace: true });
  };

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

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const isQuizActive = activeMode === "quiz-play";
  const isQuizComplete = activeMode === "quiz-results";

  useEffect(() => {
    if (!submittedAnswer) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;

      if (isLastQuestion) {
        void (async () => {
          if (quizResults.length === 0) {
            return;
          }

          try {
            await api.post("/lists/words/performance", {
              results: quizResults,
            });
            await loadLists({ silent: true });
          } catch (err) {
            if (err.response?.status === 401) {
              logout();
              navigate("/login", { replace: true });
              return;
            }

            setError(
              err.response?.data?.detail ||
                "We couldn't save your quiz results, but your score is still shown here.",
            );
          }
        })();
        setActiveMode("quiz-results");
        return;
      }

      setCurrentQuestionIndex((currentIndex) => currentIndex + 1);
      setSelectedAnswer(null);
      setSubmittedAnswer(null);
    }, 1100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [submittedAnswer, currentQuestionIndex, quizQuestions.length, quizResults, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleToggleDeck = (deckId) => {
    setSelectedDeckIds((currentDeckIds) =>
      currentDeckIds.includes(deckId)
        ? currentDeckIds.filter((id) => id !== deckId)
        : [...currentDeckIds, deckId],
    );
  };

  const handleSelectAllDecks = () => {
    setSelectedDeckIds(lists.map((list) => list.id));
  };

  const handleClearDeckSelection = () => {
    setSelectedDeckIds([]);
  };

  const resetQuizState = () => {
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setSubmittedAnswer(null);
    setScore(0);
    setQuizResults([]);
  };

  const handleStartQuiz = async () => {
    if (selectedDeckIds.length === 0) {
      setError("Choose at least one deck for the quiz.");
      return;
    }

    setQuizLoading(true);
    setError("");

    try {
      const responses = await Promise.all(
        selectedDeckIds.map((deckId) => api.get(`/lists/${deckId}/words`)),
      );

      const allWords = responses.flatMap((response, index) =>
        response.data.map((word) => ({
          ...word,
          deckName: lists.find((list) => list.id === selectedDeckIds[index])?.name,
          language: lists.find((list) => list.id === selectedDeckIds[index])?.language,
        })),
      );

      const filteredWords =
        strengthFilter === "all"
          ? allWords
          : allWords.filter((word) => word.strength === strengthFilter);

      if (filteredWords.length < 4) {
        const strengthLabel =
          strengthFilter === "all" ? "" : `${strengthFilter} `;
        setError(
          `You need at least 4 ${strengthLabel}words across the selected decks to build a quiz.`,
        );
        return;
      }

      const nextQuestions = buildQuizQuestions(
        filteredWords,
        Math.min(questionCount, filteredWords.length),
      ).filter((question) => question.options.length === 4);

      if (nextQuestions.length === 0) {
        setError(
          "We couldn't build a good quiz from those decks yet. Add a few more distinct words first.",
        );
        return;
      }

      resetQuizState();
      setQuizQuestions(nextQuestions);
      setActiveMode("quiz-play");
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(err.response?.data?.detail || "We couldn't start the quiz.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectAnswer = (answer) => {
    if (!currentQuestion || submittedAnswer) {
      return;
    }

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctAnswer;
    setSubmittedAnswer(answer);
    setQuizResults((currentResults) => [
      ...currentResults,
      {
        word_id: currentQuestion.id,
        is_correct: isCorrect,
      },
    ]);

    if (isCorrect) {
      setScore((currentScore) => currentScore + 1);
    }
  };

  const handleResetQuiz = () => {
    resetQuizState();
    setActiveMode("quiz-setup");
    setError("");
  };

  const handleOpenQuizSetup = () => {
    resetQuizState();
    setActiveMode("quiz-setup");
    setError("");
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
              {isQuizActive
                ? "Quiz in progress."
                : isQuizComplete
                  ? "Quiz complete."
                  : activeMode === "quiz-setup"
                    ? "Build your quiz session."
                    : "Pick how you want to practice."}
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "58ch",
                color: textMuted,
                fontSize: "1.02rem",
              }}
            >
              {isQuizActive
                ? "Choose the best translation for each prompt and work your way through the deck mix."
                : isQuizComplete
                  ? "Review your score, then jump back in with a fresh shuffle whenever you're ready."
                  : activeMode === "quiz-setup"
                    ? "Choose one or more decks, set the quiz size, and we'll build a multiple-choice round from your words."
                    : "This is the first version of the game page. Quiz is ready to play now, and the other formats are staged for the next rounds of development."}
            </p>
          </div>
        </section>

        {error ? (
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

        {activeMode === "hub" ? (
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
                      onClick={handleOpenQuizSetup}
                    >
                      Play quiz
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
        ) : null}

        {activeMode === "quiz-setup" ? (
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
                  Quiz setup
                </p>
                <h2 style={{ margin: "8px 0 0", color: textStrong, fontSize: "1.9rem" }}>
                  Choose your decks
                </h2>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleSelectAllDecks}
                  style={secondaryButtonStyle}
                >
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
                You need at least one deck before you can start a quiz.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "18px" }}>
                {Object.entries(decksByLanguage).map(([language, languageDecks]) => (
                  <section key={language} style={{ display: "grid", gap: "12px" }}>
                    <p
                      style={{
                        margin: 0,
                        color: "#76f7d5",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        fontSize: "0.74rem",
                      }}
                    >
                      {language}
                    </p>

                    <div
                      className="quiz-deck-grid"
                      style={{
                        alignItems: "stretch",
                      }}
                    >
                      {languageDecks.map((deck) => {
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

                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
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
                                    <strong style={{ color: textStrong }}>{count}</strong>
                                  </span>
                                );
                              })}
                            </div>

                            <p style={{ margin: 0, color: textMuted, fontSize: "0.88rem" }}>
                              {formatLastPlayed(deck.last_practiced_at)}
                            </p>

                            <p style={{ margin: 0, color: textMuted }}>
                              {isSelected ? "Selected for this quiz" : "Tap to include this deck"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            <section
              style={{
                borderTop: "1px solid rgba(130, 151, 255, 0.14)",
                paddingTop: "20px",
                display: "grid",
                gap: "12px",
                maxWidth: "360px",
              }}
            >
              <label style={{ display: "grid", gap: "8px", color: textSoft }}>
                <span>Question count</span>
                <select
                  className="game-select"
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  style={{
                    appearance: "none",
                    borderRadius: "16px",
                    border: "1px solid rgba(130, 151, 255, 0.18)",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.06)",
                    color: textStrong,
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                  }}
                >
                  <option value={5}>5 questions</option>
                  <option value={10}>10 questions</option>
                  <option value={15}>15 questions</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: "8px", color: textSoft }}>
                <span>Word strength</span>
                <select
                  className="game-select"
                  value={strengthFilter}
                  onChange={(event) => setStrengthFilter(event.target.value)}
                  style={{
                    appearance: "none",
                    borderRadius: "16px",
                    border: "1px solid rgba(130, 151, 255, 0.18)",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.06)",
                    color: textStrong,
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                  }}
                >
                  {strengthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleStartQuiz}
                style={primaryButtonStyle}
                disabled={quizLoading || loading || lists.length === 0}
              >
                {quizLoading ? "Building quiz..." : "Start quiz"}
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("hub")}
                style={secondaryButtonStyle}
              >
                Back
              </button>
            </div>
          </section>
        ) : null}

        {isQuizActive && currentQuestion ? (
          <section
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
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </p>
              <p style={{ margin: 0, color: textMuted }}>
                Score: {score}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                padding: "22px",
                borderRadius: "24px",
                border: "1px solid rgba(130, 151, 255, 0.14)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#76f7d5",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontSize: "0.75rem",
                }}
              >
                {currentQuestion.language} - {currentQuestion.deckName}
              </p>
              <h2
                style={{
                  margin: 0,
                  color: textStrong,
                  fontSize: "clamp(2rem, 5vw, 3.2rem)",
                }}
              >
                {currentQuestion.prompt}
              </h2>
              <p style={{ margin: 0, color: textMuted }}>
                Choose the best translation below.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = submittedAnswer && option === currentQuestion.correctAnswer;
                const isWrongSelection =
                  submittedAnswer &&
                  submittedAnswer === option &&
                  option !== currentQuestion.correctAnswer;

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={Boolean(submittedAnswer)}
                    onClick={() => handleSelectAnswer(option)}
                    style={{
                      textAlign: "left",
                      borderRadius: "20px",
                      border: isCorrect
                        ? "1px solid rgba(118, 247, 213, 0.55)"
                        : isWrongSelection
                          ? "1px solid rgba(255, 96, 146, 0.4)"
                          : isSelected
                            ? "1px solid rgba(72, 183, 255, 0.48)"
                            : "1px solid rgba(130, 151, 255, 0.18)",
                      padding: "18px",
                      background: isCorrect
                        ? "rgba(118, 247, 213, 0.12)"
                        : isWrongSelection
                          ? "rgba(255, 77, 157, 0.12)"
                          : isSelected
                            ? "rgba(72, 183, 255, 0.12)"
                            : "rgba(255,255,255,0.04)",
                      color: textStrong,
                      cursor: submittedAnswer ? "default" : "pointer",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" onClick={handleResetQuiz} style={secondaryButtonStyle}>
                Back to setup
              </button>
            </div>
          </section>
        ) : null}

        {isQuizComplete ? (
          <section
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
                Quiz results
              </p>
              <h2 style={{ margin: 0, color: textStrong, fontSize: "2rem" }}>
                You scored {score} out of {quizQuestions.length}
              </h2>
              <p style={{ margin: 0, color: textMuted }}>
                Accuracy: {Math.round((score / quizQuestions.length) * 100)}%
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" onClick={handleResetQuiz} style={primaryButtonStyle}>
                Play again
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("hub")}
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
