import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import {
  buildQuizQuestions,
  chooseDeckErrorMessage,
  formatElapsedTime,
  formatLastPlayed,
  normalizeAnswer,
  panelBackground,
  panelBorder,
  panelShadow,
  primaryButtonStyle,
  questionTypeOptions,
  secondaryButtonStyle,
  strengthOptions,
  strengthStyles,
  textMuted,
  textSoft,
  textStrong,
} from "./gameShared";

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

export default function QuizPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedStrengths, setSelectedStrengths] = useState([
    "weak",
    "okay",
    "strong",
  ]);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([
    "multiple-choice",
    "translation",
  ]);
  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState("setup");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [translationAnswer, setTranslationAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [quizResults, setQuizResults] = useState([]);
  const [quizStartedAt, setQuizStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0);
  const translationInputRef = useRef(null);

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

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const isQuizActive = activeMode === "play";
  const isQuizComplete = activeMode === "results";
  const isPerfectQuiz =
    isQuizComplete && quizQuestions.length > 0 && score === quizQuestions.length;

  useEffect(() => {
    document.body.classList.toggle("gameplay-active", isQuizActive);

    return () => {
      document.body.classList.remove("gameplay-active");
    };
  }, [isQuizActive]);

  useEffect(() => {
    if (!isQuizActive || !quizStartedAt) {
      return undefined;
    }

    const updateElapsedTime = () => {
      setElapsedSeconds(Math.floor((Date.now() - quizStartedAt.getTime()) / 1000));
    };

    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isQuizActive, quizStartedAt]);

  useEffect(() => {
    if (!isQuizActive || currentQuestion?.type !== "translation" || submittedAnswer) {
      return;
    }

    translationInputRef.current?.focus();
    translationInputRef.current?.select();
  }, [currentQuestionIndex, currentQuestion, isQuizActive, submittedAnswer]);

  useEffect(() => {
    if (!submittedAnswer) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;

      if (isLastQuestion) {
        const finalElapsedSeconds = quizStartedAt
          ? Math.floor((Date.now() - quizStartedAt.getTime()) / 1000)
          : 0;
        setCompletedElapsedSeconds(finalElapsedSeconds);

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
        setActiveMode("results");
        return;
      }

      setCurrentQuestionIndex((currentIndex) => currentIndex + 1);
      setSelectedAnswer(null);
      setTranslationAnswer("");
      setSubmittedAnswer(null);
    }, 1100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    submittedAnswer,
    currentQuestionIndex,
    quizQuestions.length,
    quizResults,
    logout,
    navigate,
    quizStartedAt,
  ]);

  const handleToggleDeck = (deckId) => {
    setSelectedDeckIds((currentDeckIds) =>
      currentDeckIds.includes(deckId)
        ? currentDeckIds.filter((id) => id !== deckId)
        : [...currentDeckIds, deckId],
    );
  };

  const handleSelectLanguage = (language) => {
    setSelectedLanguage(language);
    setError("");
  };

  const handleToggleQuestionType = (questionType) => {
    setSelectedQuestionTypes((currentTypes) => {
      if (currentTypes.includes(questionType)) {
        return currentTypes.filter((type) => type !== questionType);
      }

      return [...currentTypes, questionType];
    });
    setError("");
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

  const handleSelectAllDecks = () => {
    setSelectedDeckIds(visibleDecks.map((deck) => deck.id));
  };

  const handleClearDeckSelection = () => {
    setSelectedDeckIds([]);
  };

  const resetQuizState = () => {
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setTranslationAnswer("");
    setSubmittedAnswer(null);
    setScore(0);
    setQuizResults([]);
    setQuizStartedAt(null);
    setElapsedSeconds(0);
    setCompletedElapsedSeconds(0);
  };

  const handleStartQuiz = async () => {
    if (selectedDeckIds.length === 0) {
      setError(chooseDeckErrorMessage);
      return;
    }

    if (selectedQuestionTypes.length === 0) {
      setError("Choose at least one question format for the quiz.");
      return;
    }

    if (selectedStrengths.length === 0) {
      setError("Choose at least one word strength for the quiz.");
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

      const filteredWords = allWords.filter((word) =>
        selectedStrengths.includes(word.strength || "weak"),
      );

      const quizWords = filteredWords;

      // AI fill-in-the-blank is paused while we think through the OpenAI direction.
      // if (selectedQuestionTypes.includes("fill-blank") && filteredWords.length > 0) {
      //   const fillBlankResponse = await api.post("/lists/words/fill-blank-sentences", {
      //     word_ids: filteredWords.map((word) => word.id),
      //   });
      //
      //   const fillBlankWordsById = new Map(
      //     fillBlankResponse.data.map((word) => [word.id, word.fill_blank_sentence]),
      //   );
      //
      //   quizWords = filteredWords.map((word) => ({
      //     ...word,
      //     fill_blank_sentence:
      //       fillBlankWordsById.get(word.id) ?? word.fill_blank_sentence ?? null,
      //   }));
      // }

      const strengthLabel = selectedStrengths
        .map(
          (strength) =>
            strengthOptions.find((option) => option.value === strength)?.label.toLowerCase() ||
            strength,
        )
        .join(" + ");

      if (filteredWords.length === 0) {
        setError(`There are no ${strengthLabel} in the selected decks yet.`);
        return;
      }

      if (
        selectedQuestionTypes.some((questionType) =>
          ["multiple-choice"].includes(questionType),
        ) &&
        filteredWords.length < 4
      ) {
        setError(
          `You need at least 4 ${strengthLabel} across the selected decks to include multiple-choice questions.`,
        );
        return;
      }

      const nextQuestions = buildQuizQuestions(
        quizWords,
        Math.min(questionCount, quizWords.length),
        selectedQuestionTypes,
      );

      if (nextQuestions.length === 0) {
        setError(
          "We couldn't build a good quiz from those decks yet. Add a few more distinct words first.",
        );
        return;
      }

      resetQuizState();
      setQuizStartedAt(new Date());
      setElapsedSeconds(0);
      setCompletedElapsedSeconds(0);
      setQuizQuestions(nextQuestions);
      setActiveMode("play");
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
    if (
      !currentQuestion ||
      submittedAnswer ||
      !["multiple-choice", "true-false"].includes(currentQuestion.type)
    ) {
      return;
    }

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctAnswer;
    setSubmittedAnswer({ value: answer, isCorrect });
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

  const handleSubmitTranslation = () => {
    if (!currentQuestion || submittedAnswer || currentQuestion.type !== "translation") {
      return;
    }

    const typedAnswer = translationAnswer.trim();
    if (!typedAnswer) {
      setError("Type a translation before submitting your answer.");
      return;
    }

    setError("");
    const isCorrect =
      normalizeAnswer(typedAnswer) === normalizeAnswer(currentQuestion.correctAnswer);
    setSelectedAnswer(typedAnswer);
    setSubmittedAnswer({ value: typedAnswer, isCorrect });
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
    setActiveMode("setup");
    setError("");
  };

  const handlePlayAgain = async () => {
    await handleStartQuiz();
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
                  : "Test your knowledge."}
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "65ch",
                color: textMuted,
                fontSize: "1.02rem",
              }}
            >
              {isQuizActive
                ? ""
                : isQuizComplete
                  ? "Review your score and time, then jump back in with a fresh shuffle whenever you're ready."
                  : "Choose a language, pick your decks, customize the questions, and we'll generate a quiz!"}
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

        {!isQuizActive && !isQuizComplete ? (
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
                  Customize your quiz
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
                      <div
                        style={{
                          border: "1px dashed rgba(130, 151, 255, 0.22)",
                          borderRadius: "22px",
                          padding: "24px",
                          color: textMuted,
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        No decks yet for {selectedLanguage}.
                      </div>
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
                    )}
                  </section>
                ) : null}
              </div>
            )}

            <section
              className="quiz-setup-options"
                style={{
                  borderTop: "1px solid rgba(130, 151, 255, 0.14)",
                  paddingTop: "20px",
                }}
              >
                <label className="quiz-setup-option" style={{ color: textSoft }}>
                  <span className="quiz-setup-option-label">Question count</span>
                  <div className="quiz-count-slider-shell">
                    <div className="quiz-count-slider-value">
                      <strong>{questionCount}</strong>
                      <span>{questionCount === 1 ? "question" : "questions"}</span>
                    </div>
                    <input
                      className="quiz-count-slider"
                      type="range"
                      min="5"
                      max="20"
                      step="1"
                      value={questionCount}
                      onChange={(event) => setQuestionCount(Number(event.target.value))}
                      aria-label="Question count"
                    />
                    <div className="quiz-count-slider-labels" aria-hidden="true">
                      <span>5</span>
                      <span>20</span>
                    </div>
                  </div>
                </label>

                <div className="quiz-setup-option" style={{ color: textSoft }}>
                  <span className="quiz-setup-option-label">Word strength</span>
                  <div className="bingo-option-grid quiz-inline-option-grid">
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
                            padding: "14px 16px",
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
                      Choose at least one word strength to build the quiz.
                    </p>
                  ) : null}
                </div>

                <div className="quiz-setup-option" style={{ color: textSoft }}>
                  <span className="quiz-setup-option-label">Question format</span>
                  <div className="bingo-option-grid quiz-inline-option-grid">
                    {questionTypeOptions.map((option) => {
                      const isActive = selectedQuestionTypes.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleToggleQuestionType(option.value)}
                          style={{
                            borderRadius: "999px",
                            padding: "14px 16px",
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
                  {selectedQuestionTypes.length === 0 ? (
                    <p style={{ margin: 0, color: "#ffb6d7", fontSize: "0.92rem" }}>
                      Choose at least one question format to build the quiz.
                    </p>
                  ) : null}
                </div>
            </section>

            {error === chooseDeckErrorMessage ? (
              <p style={{ margin: "0 0 -8px", color: "#ffb6d7", fontSize: "0.92rem" }}>
                {chooseDeckErrorMessage}
              </p>
            ) : null}

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
                onClick={() => navigate("/play")}
                style={secondaryButtonStyle}
              >
                Back to games
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
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <p style={{ margin: 0, color: textMuted }}>
                  Score: {score}
                </p>
                <p style={{ margin: 0, color: textMuted }}>
                  Time: {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
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
                {currentQuestion.promptLanguage} to {currentQuestion.answerLanguage} -{" "}
                {currentQuestion.deckName} -{" "}
                {currentQuestion.type === "translation"
                  ? "Translation"
                  : currentQuestion.type === "true-false"
                    ? "True / False"
                    : "Multiple choice"}
              </p>
              <h2
                style={{
                  margin: 0,
                  color: textStrong,
                  fontSize: "clamp(2rem, 5vw, 3.2rem)",
                }}
              >
                {currentQuestion.type === "true-false"
                  ? `${currentQuestion.prompt} = ${currentQuestion.statementAnswer}`
                  : currentQuestion.prompt}
              </h2>
              <p style={{ margin: 0, color: textMuted }}>
                {currentQuestion.type === "translation"
                  ? `Type the ${currentQuestion.answerLanguage} translation below.`
                  : currentQuestion.type === "true-false"
                    ? `Decide whether this ${currentQuestion.answerLanguage} translation is true or false.`
                  : `Choose the ${currentQuestion.answerLanguage} translation below.`}
              </p>
            </div>

            {currentQuestion.type === "translation" ? (
              <div
                style={{
                  display: "grid",
                  gap: "14px",
                  maxWidth: "560px",
                }}
              >
                <input
                  ref={translationInputRef}
                  value={translationAnswer}
                  onChange={(event) => {
                    setTranslationAnswer(event.target.value);
                    if (error === "Type a translation before submitting your answer.") {
                      setError("");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSubmitTranslation();
                    }
                  }}
                  disabled={Boolean(submittedAnswer)}
                  placeholder="Type the translation"
                  style={{
                    borderRadius: "20px",
                    border: submittedAnswer?.isCorrect
                      ? "1px solid rgba(118, 247, 213, 0.55)"
                      : submittedAnswer
                        ? "1px solid rgba(255, 96, 146, 0.4)"
                        : "1px solid rgba(130, 151, 255, 0.18)",
                    padding: "18px",
                    background: submittedAnswer?.isCorrect
                      ? "rgba(118, 247, 213, 0.12)"
                      : submittedAnswer
                        ? "rgba(255, 77, 157, 0.12)"
                        : "rgba(255,255,255,0.04)",
                    color: textStrong,
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                  }}
                />
                {submittedAnswer && !submittedAnswer.isCorrect ? (
                  <p style={{ margin: 0, color: textMuted }}>
                    Correct answer: {currentQuestion.correctAnswer}
                  </p>
                ) : null}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleSubmitTranslation}
                    disabled={Boolean(submittedAnswer) || !translationAnswer.trim()}
                    style={primaryButtonStyle}
                  >
                    Submit answer
                  </button>
                </div>
              </div>
            ) : currentQuestion.type === "true-false" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                  maxWidth: "460px",
                }}
              >
                {[true, false].map((option) => {
                  const label = option ? "True" : "False";
                  const isSelected = selectedAnswer === option;
                  const isCorrect =
                    submittedAnswer && option === currentQuestion.correctAnswer;
                  const isWrongSelection =
                    submittedAnswer &&
                    submittedAnswer.value === option &&
                    option !== currentQuestion.correctAnswer;

                  return (
                    <button
                      key={label}
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
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect =
                    submittedAnswer && option === currentQuestion.correctAnswer;
                  const isWrongSelection =
                    submittedAnswer &&
                    submittedAnswer.value === option &&
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
            )}

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
              <p style={{ margin: 0, color: textMuted }}>
                Time: {formatElapsedTime(completedElapsedSeconds)}
              </p>
            </div>

            {isPerfectQuiz ? (
              <div
                style={{
                  border: "1px solid rgba(118, 247, 213, 0.42)",
                  borderRadius: "24px",
                  padding: "18px 20px",
                  background:
                    "linear-gradient(135deg, rgba(118, 247, 213, 0.16), rgba(72, 183, 255, 0.12), rgba(255, 77, 157, 0.12))",
                  boxShadow:
                    "0 0 0 1px rgba(118, 247, 213, 0.08), 0 0 34px rgba(255, 77, 157, 0.16)",
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
                  Perfect run
                </p>
                <h3 style={{ margin: 0, color: textStrong, fontSize: "1.45rem" }}>
                  Flawless vocabulary streak.
                </h3>
                <p style={{ margin: 0, color: textMuted }}>
                  100% accuracy. Every word landed exactly where it needed to.
                </p>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  void handlePlayAgain();
                }}
                disabled={quizLoading}
                style={primaryButtonStyle}
              >
                {quizLoading ? "Building quiz..." : "Play again"}
              </button>
              <button type="button" onClick={handleResetQuiz} style={secondaryButtonStyle}>
                Back to quiz builder
              </button>
              <button
                type="button"
                onClick={() => {
                  resetQuizState();
                  setActiveMode("setup");
                  setError("");
                  navigate("/play");
                }}
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
