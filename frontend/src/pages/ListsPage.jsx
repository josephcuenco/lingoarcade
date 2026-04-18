import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";

const emptyDeckForm = {
  name: "",
};

const emptyWordForm = {
  term: "",
  definition: "",
};

const createEmptyStagedWord = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  term: "",
  definition: "",
});

const fieldStyle = {
  display: "grid",
  gap: "8px",
  fontSize: "0.95rem",
};

const textMuted = "#bfc7e6";
const textSoft = "#cfd6ef";
const textStrong = "#f7f8ff";
const panelBackground =
  "linear-gradient(180deg, rgba(17, 21, 36, 0.92), rgba(12, 15, 28, 0.92))";
const panelBorder = "1px solid rgba(130, 151, 255, 0.18)";
const panelShadow =
  "0 24px 70px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)";

const inputStyle = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(130, 151, 255, 0.18)",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.06)",
  color: textStrong,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
};

const lightInputStyle = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(130, 151, 255, 0.18)",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.06)",
  color: textStrong,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
};

// const textareaStyle = {
//   ...lightInputStyle,
//   minHeight: "96px",
//   resize: "vertical",
//   fontFamily: "inherit",
// };

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

const dangerButtonStyle = {
  border: "1px solid rgba(255, 96, 146, 0.28)",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "rgba(255, 77, 157, 0.12)",
  color: "#ffb6d7",
  cursor: "pointer",
};

const contextMenuStyle = {
  position: "fixed",
  minWidth: "180px",
  background: "linear-gradient(180deg, rgba(20, 24, 42, 0.96), rgba(12, 15, 28, 0.96))",
  border: "1px solid rgba(130, 151, 255, 0.18)",
  borderRadius: "18px",
  padding: "8px",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.3)",
  zIndex: 20,
  display: "grid",
  gap: "6px",
};

const deckDraftWordErrorMessage =
  "Add both the word and the translation before creating the entry.";

const strengthStyles = {
  weak: {
    label: "Weak",
    color: "#ffb5d5",
    border: "1px solid rgba(255, 92, 156, 0.28)",
    background: "rgba(255, 77, 157, 0.14)",
    glow: "0 0 0 1px rgba(255, 92, 156, 0.08), 0 12px 24px rgba(255, 77, 157, 0.1)",
  },
  okay: {
    label: "Okay",
    color: "#ffe3a3",
    border: "1px solid rgba(255, 197, 74, 0.26)",
    background: "rgba(255, 197, 74, 0.12)",
    glow: "0 0 0 1px rgba(255, 197, 74, 0.08), 0 12px 24px rgba(255, 197, 74, 0.09)",
  },
  strong: {
    label: "Strong",
    color: "#8ff8de",
    border: "1px solid rgba(118, 247, 213, 0.3)",
    background: "rgba(118, 247, 213, 0.12)",
    glow: "0 0 0 1px rgba(118, 247, 213, 0.08), 0 12px 24px rgba(118, 247, 213, 0.09)",
  },
};

const getStrengthStyle = (strength) => strengthStyles[strength] || strengthStyles.weak;

const formatAccuracy = (accuracy, attempts) => {
  if (!attempts) {
    return "New word";
  }

  return `${Math.round((accuracy || 0) * 100)}% accuracy`;
};

export default function ListsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [deckForm, setDeckForm] = useState(emptyDeckForm);
  const [expandedDeckId, setExpandedDeckId] = useState(null);
  const [wordsByDeck, setWordsByDeck] = useState({});
  const [wordFormsByDeck, setWordFormsByDeck] = useState({});
  const [editingWordByDeck, setEditingWordByDeck] = useState({});
  const [showAddWordFormByDeck, setShowAddWordFormByDeck] = useState({});
  const [loadingWordsByDeck, setLoadingWordsByDeck] = useState({});
  const [activeLanguage, setActiveLanguage] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [languageMenu, setLanguageMenu] = useState(null);
  const [languageModal, setLanguageModal] = useState(null);
  const [languageDraft, setLanguageDraft] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [deckDraftWord, setDeckDraftWord] = useState(emptyWordForm);
  const [deckDraftWords, setDeckDraftWords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableLanguages = useMemo(
    () =>
      [...new Set([...languages, ...lists.map((list) => list.language)])].sort(
        (left, right) => left.localeCompare(right),
      ),
    [languages, lists],
  );

  const filteredLists = useMemo(
    () =>
      activeLanguage
        ? lists.filter((list) => list.language === activeLanguage)
        : [],
    [activeLanguage, lists],
  );

  useEffect(() => {
    const loadLists = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/lists");
        const nextLists = response.data;
        setLists(nextLists);
        setLanguages([...new Set(nextLists.map((list) => list.language))]);
        setActiveLanguage((currentLanguage) => {
          if (
            currentLanguage &&
            nextLists.some((list) => list.language === currentLanguage)
          ) {
            return currentLanguage;
          }

          return nextLists[0]?.language || "";
        });
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        setError(err.response?.data?.detail || "We couldn't load your lists.");
      } finally {
        setLoading(false);
      }
    };

    loadLists();
  }, [logout, navigate]);

  useEffect(() => {
    if (!languageMenu) {
      return undefined;
    }

    const closeMenu = () => setLanguageMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [languageMenu]);

  const handleUnauthorized = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const resetDeckForm = () => {
    setDeckForm(emptyDeckForm);
    setEditingId(null);
  };

  const closeDeckModal = () => {
    setShowDeckModal(false);
    setDeckDraftWord(emptyWordForm);
    setDeckDraftWords([]);
    resetDeckForm();
    setError("");
  };

  const closeLanguageModal = () => {
    setLanguageModal(null);
    setLanguageDraft("");
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const syncActiveLanguageAfterRemoval = (nextLanguages, removedLanguage) => {
    if (activeLanguage !== removedLanguage) {
      return;
    }

    setActiveLanguage(nextLanguages[0] || "");
  };

  const setWordFormForDeck = (deckId, form) => {
    setWordFormsByDeck((currentForms) => ({
      ...currentForms,
      [deckId]: form,
    }));
  };

  const resetWordForm = (deckId) => {
    setWordFormForDeck(deckId, emptyWordForm);
    setEditingWordByDeck((currentEditing) => ({
      ...currentEditing,
      [deckId]: null,
    }));
    setShowAddWordFormByDeck((currentVisible) => ({
      ...currentVisible,
      [deckId]: false,
    }));
  };

  const handleDeckFormChange = (event) => {
    const { name, value } = event.target;
    setDeckForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleDeckDraftWordChange = (field, value) => {
    setDeckDraftWord((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setError((currentError) =>
      currentError === deckDraftWordErrorMessage ? "" : currentError,
    );
  };

  const handleAddDeckDraftWord = () => {
    const nextWord = {
      ...createEmptyStagedWord(),
      term: deckDraftWord.term.trim(),
      definition: deckDraftWord.definition.trim(),
    };

    if (!nextWord.term || !nextWord.definition) {
      setError(deckDraftWordErrorMessage);
      return;
    }

    setDeckDraftWords((currentDrafts) => [...currentDrafts, nextWord]);
    setDeckDraftWord(emptyWordForm);
    setError("");
  };

  const handleRemoveDeckDraftWord = (draftId) => {
    setDeckDraftWords((currentDrafts) =>
      currentDrafts.filter((draft) => draft.id !== draftId),
    );
  };

  const handleWordFormChange = (deckId, field, value) => {
    setWordFormsByDeck((currentForms) => ({
      ...currentForms,
      [deckId]: {
        ...(currentForms[deckId] || emptyWordForm),
        [field]: value,
      },
    }));
  };

  const loadWords = async (deckId) => {
    setLoadingWordsByDeck((currentLoading) => ({
      ...currentLoading,
      [deckId]: true,
    }));

    try {
      const response = await api.get(`/lists/${deckId}/words`);
      setWordsByDeck((currentWords) => ({
        ...currentWords,
        [deckId]: response.data,
      }));
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(err.response?.data?.detail || "We couldn't load the words for that deck.");
    } finally {
      setLoadingWordsByDeck((currentLoading) => ({
        ...currentLoading,
        [deckId]: false,
      }));
    }
  };

  const handleToggleDeck = async (deckId) => {
    if (expandedDeckId === deckId) {
      setExpandedDeckId(null);
      return;
    }

    setExpandedDeckId(deckId);

    if (!wordsByDeck[deckId]) {
      await loadWords(deckId);
    }

    if (!wordFormsByDeck[deckId]) {
      setWordFormForDeck(deckId, emptyWordForm);
    }
  };

  const handleSubmitWord = async (deckId) => {
    const currentForm = wordFormsByDeck[deckId] || emptyWordForm;
    const payload = {
      term: currentForm.term.trim(),
      definition: currentForm.definition.trim(),
    };

    if (!payload.term || !payload.definition) {
      setError("Both the word and definition are required.");
      return;
    }

    const editingWord = editingWordByDeck[deckId];

    try {
      if (editingWord) {
        const response = await api.put(
          `/lists/${deckId}/words/${editingWord.id}`,
          payload,
        );
        setWordsByDeck((currentWords) => ({
          ...currentWords,
          [deckId]: (currentWords[deckId] || []).map((word) =>
            word.id === editingWord.id ? response.data : word,
          ),
        }));
      } else {
        const response = await api.post(`/lists/${deckId}/words`, payload);
        setWordsByDeck((currentWords) => ({
          ...currentWords,
          [deckId]: [response.data, ...(currentWords[deckId] || [])],
        }));
      }

      if (editingWord) {
        resetWordForm(deckId);
      } else {
        setWordFormForDeck(deckId, emptyWordForm);
      }

      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(err.response?.data?.detail || "We couldn't save that word.");
    }
  };

  const handleStartEditWord = (deckId, word) => {
    setEditingWordByDeck((currentEditing) => ({
      ...currentEditing,
      [deckId]: word,
    }));
    setShowAddWordFormByDeck((currentVisible) => ({
      ...currentVisible,
      [deckId]: true,
    }));
    setWordFormForDeck(deckId, {
      term: word.term,
      definition: word.definition,
    });
    setError("");
  };

  const handleDeleteWord = async (deckId, wordId) => {
    try {
      await api.delete(`/lists/${deckId}/words/${wordId}`);
      setWordsByDeck((currentWords) => ({
        ...currentWords,
        [deckId]: (currentWords[deckId] || []).filter((word) => word.id !== wordId),
      }));

      const editingWord = editingWordByDeck[deckId];
      if (editingWord?.id === wordId) {
        resetWordForm(deckId);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(err.response?.data?.detail || "We couldn't delete that word.");
    }
  };

  const handleRequestDeleteWord = (deckId, word) => {
    setConfirmDialog({
      title: `Delete ${word.term}?`,
      kicker: "Delete word",
      message: "This will permanently remove this word and its translation from the deck.",
      confirmLabel: "Delete word",
      onConfirm: () => handleDeleteWord(deckId, word.id),
    });
    setError("");
  };

  const handleOpenAddWordForm = (deckId) => {
    setEditingWordByDeck((currentEditing) => ({
      ...currentEditing,
      [deckId]: null,
    }));
    setWordFormForDeck(deckId, emptyWordForm);
    setShowAddWordFormByDeck((currentVisible) => ({
      ...currentVisible,
      [deckId]: true,
    }));
    setError("");
  };

  const handleLanguageSelect = (language) => {
    setActiveLanguage(language);
    setEditingId(null);
    setExpandedDeckId(null);
    setError("");
    setLanguageMenu(null);
  };

  const handleOpenAddLanguage = () => {
    setNewLanguage("");
    setShowAddLanguage(true);
    setEditingId(null);
    setError("");
    setLanguageMenu(null);
  };

  const handleOpenCreateDeck = () => {
    if (!activeLanguage.trim()) {
      setError("Choose a working language before creating a deck.");
      return;
    }

    resetDeckForm();
    setDeckDraftWord(emptyWordForm);
    setDeckDraftWords([]);
    setShowDeckModal(true);
    setError("");
  };

  const handleCloseAddLanguage = () => {
    setNewLanguage("");
    setShowAddLanguage(false);
  };

  const handleCreateLanguage = () => {
    const trimmedLanguage = newLanguage.trim();

    if (!trimmedLanguage) {
      setError("Enter a language name first.");
      return;
    }

    const existingLanguage = availableLanguages.find(
      (language) => language.toLowerCase() === trimmedLanguage.toLowerCase(),
    );

    setLanguages((currentLanguages) =>
      existingLanguage
        ? currentLanguages
        : [...currentLanguages, trimmedLanguage],
    );
    setActiveLanguage(existingLanguage || trimmedLanguage);
    setShowAddLanguage(false);
    setNewLanguage("");
    setEditingId(null);
    setExpandedDeckId(null);
    setError("");
  };

  const handleLanguageContextMenu = (event, language) => {
    event.preventDefault();
    setLanguageMenu({
      language,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleOpenRenameLanguage = () => {
    setLanguageDraft(languageMenu.language);
    setLanguageModal({
      type: "rename",
      language: languageMenu.language,
    });
    setLanguageMenu(null);
    setError("");
  };

  const handleOpenDeleteLanguage = () => {
    setLanguageModal({
      type: "delete",
      language: languageMenu.language,
    });
    setConfirmDialog({
      title: `Delete ${languageMenu.language}?`,
      kicker: "Delete language",
      message:
        "This will permanently delete the language and all decks inside it. This action cannot be undone.",
      confirmLabel: "Delete language and decks",
      onConfirm: handleDeleteLanguage,
    });
    setLanguageMenu(null);
    setError("");
  };

  const handleRenameLanguage = async () => {
    if (!languageModal) {
      return;
    }

    const currentLanguage = languageModal.language;
    const nextLanguage = languageDraft.trim();

    if (!nextLanguage) {
      setError("Enter a language name first.");
      return;
    }

    if (currentLanguage.toLowerCase() === nextLanguage.toLowerCase()) {
      setLanguages((currentLanguages) =>
        currentLanguages.map((language) =>
          language === currentLanguage ? nextLanguage : language,
        ),
      );
      setLists((currentLists) =>
        currentLists.map((list) =>
          list.language === currentLanguage
            ? { ...list, language: nextLanguage }
            : list,
        ),
      );
      if (activeLanguage === currentLanguage) {
        setActiveLanguage(nextLanguage);
      }
      closeLanguageModal();
      return;
    }

    const hasDecks = lists.some((list) => list.language === currentLanguage);

    try {
      if (hasDecks) {
        const response = await api.post("/lists/languages/rename", {
          current_language: currentLanguage,
          new_language: nextLanguage,
        });

        setLists((currentLists) => {
          const untouchedLists = currentLists.filter(
            (list) => list.language !== currentLanguage && list.language !== nextLanguage,
          );
          return [...response.data, ...untouchedLists];
        });
      } else {
        setLists((currentLists) =>
          currentLists.map((list) =>
            list.language === currentLanguage
              ? { ...list, language: nextLanguage }
              : list,
          ),
        );
      }

      setLanguages((currentLanguages) =>
        currentLanguages.map((language) =>
          language === currentLanguage ? nextLanguage : language,
        ),
      );

      if (activeLanguage === currentLanguage) {
        setActiveLanguage(nextLanguage);
      }

      closeLanguageModal();
      closeConfirmDialog();
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(err.response?.data?.detail || "We couldn't rename that language.");
    }
  };

  const handleDeleteLanguage = async () => {
    if (!languageModal) {
      return;
    }

    const languageToDelete = languageModal.language;
    const hasDecks = lists.some((list) => list.language === languageToDelete);

    try {
      if (hasDecks) {
        await api.post("/lists/languages/delete", {
          language: languageToDelete,
        });
      }

      setLists((currentLists) =>
        currentLists.filter((list) => list.language !== languageToDelete),
      );
      setLanguages((currentLanguages) => {
        const nextLanguages = currentLanguages.filter(
          (language) => language !== languageToDelete,
        );
        syncActiveLanguageAfterRemoval(nextLanguages, languageToDelete);
        return nextLanguages;
      });

      if (editingId) {
        const editingList = lists.find((list) => list.id === editingId);
        if (editingList?.language === languageToDelete) {
          resetDeckForm();
        }
      }

      setWordsByDeck((currentWords) => {
        const nextWords = { ...currentWords };
        lists
          .filter((list) => list.language === languageToDelete)
          .forEach((list) => {
            delete nextWords[list.id];
          });
        return nextWords;
      });

      if (
        expandedDeckId &&
        lists.some(
          (list) => list.id === expandedDeckId && list.language === languageToDelete,
        )
      ) {
        setExpandedDeckId(null);
      }

      closeLanguageModal();
      closeConfirmDialog();
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(err.response?.data?.detail || "We couldn't delete that language.");
    }
  };

  const handleSubmitDeck = async () => {
    if (!activeLanguage.trim()) {
      setError("Choose a working language before creating a deck.");
      return;
    }

    const trimmedName = deckForm.name.trim();

    if (!trimmedName) {
      setError("Enter a deck name first.");
      return;
    }

    const starterWords = deckDraftWords
      .map((draft) => ({
        ...draft,
        term: draft.term.trim(),
        definition: draft.definition.trim(),
      }))
      .filter((draft) => draft.term || draft.definition);

    setSaving(true);
    setError("");

    const payload = {
      name: trimmedName,
      language: activeLanguage.trim(),
    };

    try {
      if (editingId) {
        const response = await api.put(`/lists/${editingId}`, payload);
        setLists((currentLists) =>
          currentLists.map((list) =>
            list.id === editingId ? response.data : list,
          ),
        );
        closeDeckModal();
      } else {
        const response = await api.post("/lists", payload);
        const createdWords = await Promise.all(
          starterWords.map((draft) =>
            api.post(`/lists/${response.data.id}/words`, {
              term: draft.term,
              definition: draft.definition,
            }),
          ),
        );
        const nextWords = createdWords.map((wordResponse) => wordResponse.data);
        setLists((currentLists) => [response.data, ...currentLists]);
        setLanguages((currentLanguages) =>
          currentLanguages.includes(response.data.language)
            ? currentLanguages
            : [...currentLanguages, response.data.language],
        );
        setActiveLanguage(response.data.language);
        setWordsByDeck((currentWords) => ({
          ...currentWords,
          [response.data.id]: nextWords,
        }));
        setExpandedDeckId(response.data.id);
        if (!wordFormsByDeck[response.data.id]) {
          setWordFormForDeck(response.data.id, emptyWordForm);
        }
        closeDeckModal();
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(
        err.response?.data?.detail ||
          (editingId
            ? "We couldn't update that deck."
            : "We couldn't create that deck."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditDeck = (list) => {
    setActiveLanguage(list.language);
    setEditingId(list.id);
    setDeckForm({
      name: list.name,
    });
    setDeckDraftWord(emptyWordForm);
    setDeckDraftWords([]);
    setShowDeckModal(true);
    setError("");
  };

  const handleDeleteDeck = async (listId) => {
    setError("");

    try {
      await api.delete(`/lists/${listId}`);
      setLists((currentLists) => {
        const nextLists = currentLists.filter((list) => list.id !== listId);

        if (
          activeLanguage &&
          !nextLists.some((list) => list.language === activeLanguage)
        ) {
          setActiveLanguage(nextLists[0]?.language || "");
        }

        return nextLists;
      });

      if (editingId === listId) {
        resetDeckForm();
      }

      setWordsByDeck((currentWords) => {
        const nextWords = { ...currentWords };
        delete nextWords[listId];
        return nextWords;
      });

      if (expandedDeckId === listId) {
        setExpandedDeckId(null);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(err.response?.data?.detail || "We couldn't delete that deck.");
    }
  };

  const handleRequestDeleteDeck = (list) => {
    setConfirmDialog({
      title: `Delete ${list.name}?`,
      kicker: "Delete deck",
      message: "This will permanently remove the deck and all words inside it.",
      confirmLabel: "Delete deck",
      onConfirm: () => handleDeleteDeck(list.id),
    });
    setError("");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleOpenGames = () => {
    navigate("/games");
  };

  return (
    <main
      className="app-shell"
      style={{
        padding: "48px 20px 64px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gap: "24px",
        }}
      >
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            background: panelBackground,
            border: panelBorder,
            borderRadius: "28px",
            padding: "28px 32px",
            boxShadow: panelShadow,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ width: "100%" }}>
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
                  onClick={handleOpenGames}
                  style={primaryButtonStyle}
                >
                  Game on!
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

            <h1
              style={{
                margin: "8px 0 10px",
                fontSize: "clamp(2.3rem, 6vw, 4.5rem)",
                lineHeight: 0.95,
                color: textStrong,
                textShadow:
                  "0 0 24px rgba(81, 183, 255, 0.18), 0 0 60px rgba(255, 72, 176, 0.14)",
              }}
            >
              Build your language decks.
            </h1>
            <p
                style={{
                  margin: 0,
                  maxWidth: "54ch",
                  color: textMuted,
                  fontSize: "1.05rem",
                }}
              >
              Switch between languages to organize your decks, then open a deck to
              start adding words and definitions.
            </p>
            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "22px",
                maxWidth: "100%",
              }}
            >
              <div style={{ ...fieldStyle, color: textSoft }}>
                <span>Select a language</span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {availableLanguages.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => handleLanguageSelect(language)}
                      onContextMenu={(event) =>
                        handleLanguageContextMenu(event, language)
                      }
                      title="Right-click for language options"
                      style={{
                        ...secondaryButtonStyle,
                        background:
                          language === activeLanguage
                            ? "linear-gradient(135deg, rgba(72, 183, 255, 0.24), rgba(255, 77, 157, 0.22))"
                            : "rgba(255,255,255,0.06)",
                        color:
                          language === activeLanguage ? textStrong : textSoft,
                        borderColor:
                          language === activeLanguage
                            ? "rgba(118, 247, 213, 0.45)"
                            : "rgba(130, 151, 255, 0.18)",
                        boxShadow:
                          language === activeLanguage
                            ? "0 0 24px rgba(118, 247, 213, 0.12)"
                            : secondaryButtonStyle.boxShadow,
                      }}
                    >
                      {language}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleOpenAddLanguage}
                    style={{
                      ...secondaryButtonStyle,
                      borderStyle: "dashed",
                    }}
                  >
                    Add language
                  </button>
                </div>
              </div>

              {availableLanguages.length === 0 ? (
                <p style={{ margin: 0, color: textMuted }}>
                  Start by adding your first language.
                </p>
              ) : (
                <p style={{ margin: 0, color: textMuted, fontSize: "0.92rem" }}>
                  Right-click a language to rename it or delete it with all of its
                  decks.
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: "24px",
          }}
        >
          <section
            style={{
              background: panelBackground,
              border: panelBorder,
              borderRadius: "28px",
              padding: "28px",
              boxShadow: panelShadow,
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "baseline",
                flexWrap: "wrap",
                marginBottom: "18px",
              }}
            >
              <div>
                <p style={{ margin: 0, color: "#76f7d5", fontSize: "0.9rem" }}>
                  {activeLanguage ? `${activeLanguage} collection` : "Your collection"}
                </p>
                <h2 style={{ margin: "6px 0 0", fontSize: "1.9rem", color: textStrong }}>
                  Vocabulary decks
                </h2>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <p style={{ margin: 0, color: textMuted }}>
                  {filteredLists.length} {filteredLists.length === 1 ? "deck" : "decks"}
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateDeck}
                  disabled={!activeLanguage}
                  style={primaryButtonStyle}
                >
                  Create deck
                </button>
              </div>
            </div>

            {loading ? (
              <p style={{ margin: 0, color: textMuted }}>Loading your decks...</p>
            ) : !activeLanguage ? (
              <div
                style={{
                  border: "1px dashed rgba(130, 151, 255, 0.22)",
                  borderRadius: "22px",
                  padding: "28px",
                  color: textMuted,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                Pick the language you want to work on, and this screen will focus
                just on the decks for that language.
              </div>
            ) : filteredLists.length === 0 ? (
              <div
                style={{
                  border: "1px dashed rgba(130, 151, 255, 0.22)",
                  borderRadius: "22px",
                  padding: "28px",
                  color: textMuted,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                No decks for {activeLanguage} yet. Try one for verbs, travel
                phrases, or food vocabulary.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                {filteredLists.map((list) => {
                  const isExpanded = expandedDeckId === list.id;
                  const wordForm = wordFormsByDeck[list.id] || emptyWordForm;
                  const editingWord = editingWordByDeck[list.id];
                  const isWordFormVisible =
                    showAddWordFormByDeck[list.id] || Boolean(editingWord);
                  const words = wordsByDeck[list.id] || [];
                  const hasLoadedWords = Object.prototype.hasOwnProperty.call(
                    wordsByDeck,
                    list.id,
                  );
                  const deckWordCount = hasLoadedWords ? words.length : list.word_count || 0;
                  const strengthCounts = hasLoadedWords
                    ? words.reduce(
                        (counts, word) => {
                          const key = word.strength || "weak";
                          counts[key] = (counts[key] || 0) + 1;
                          return counts;
                        },
                        { weak: 0, okay: 0, strong: 0 },
                      )
                    : {
                        weak: list.weak_word_count || 0,
                        okay: list.okay_word_count || 0,
                        strong: list.strong_word_count || 0,
                      };

                  return (
                    <article
                      key={list.id}
                      className="deck-card"
                      style={{
                        border: "1px solid rgba(130, 151, 255, 0.16)",
                        borderRadius: "22px",
                        padding: "18px",
                        display: "grid",
                        gap: "16px",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
                        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleDeck(list.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleToggleDeck(list.id);
                          }
                        }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "16px",
                          flexWrap: "wrap",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: "0",
                              fontSize: "1.3rem",
                              color: textStrong,
                            }}
                          >
                            {list.name}
                          </h3>
                          <p
                            style={{
                              margin: "6px 0 0",
                              color: textMuted,
                              fontSize: "0.92rem",
                            }}
                          >
                            {deckWordCount} {deckWordCount === 1 ? "word" : "words"}
                          </p>
                          {deckWordCount > 0 ? (
                            <div
                              style={{
                                marginTop: "12px",
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              {["weak", "okay", "strong"].map((strength) => {
                                const strengthStyle = getStrengthStyle(strength);
                                return (
                                  <span
                                    key={strength}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "7px 12px",
                                      borderRadius: "999px",
                                      fontSize: "0.8rem",
                                      color: strengthStyle.color,
                                      border: strengthStyle.border,
                                      background: strengthStyle.background,
                                    }}
                                  >
                                    {strengthStyle.label}
                                    <strong style={{ color: textStrong }}>
                                      {strengthCounts[strength]}
                                    </strong>
                                  </span>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "flex-end",
                          }}
                        >
                          {isExpanded ? (
                            <>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEditDeck(list);
                                }}
                                style={secondaryButtonStyle}
                              >
                                Edit Name
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRequestDeleteDeck(list);
                                }}
                                style={dangerButtonStyle}
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenAddWordForm(list.id);
                                }}
                                style={primaryButtonStyle}
                              >
                                Add word
                              </button>
                            </>
                          ) : null}
                          <p style={{ margin: 0, color: "#76f7d5", fontSize: "0.92rem" }}>
                            {isExpanded ? "" : "Open deck"}
                          </p>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div
                          style={{
                            borderTop: "1px solid rgba(130, 151, 255, 0.14)",
                            paddingTop: "18px",
                            display: "grid",
                            gap: "18px",
                          }}
                        >
                          {isWordFormVisible ? (
                            <section
                              style={{
                                background:
                                  "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                                border: "1px solid rgba(130, 151, 255, 0.14)",
                                borderRadius: "18px",
                                padding: "18px",
                                display: "grid",
                                gap: "12px",
                              }}
                            >
                              {editingWord ? (
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
                                    Editing word
                                  </p>
                                  <h4
                                    style={{
                                      margin: "8px 0 0",
                                      fontSize: "1.2rem",
                                      color: textStrong,
                                    }}
                                  >
                                    {`Update ${editingWord.term}`}
                                  </h4>
                                </div>
                              ) : null}

                              <label style={{ ...fieldStyle, color: textSoft }}>
                                <span>Word</span>
                                <input
                                  value={wordForm.term}
                                  onChange={(event) =>
                                    handleWordFormChange(
                                      list.id,
                                      "term",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="hola"
                                  style={lightInputStyle}
                                />
                              </label>

                              <label style={{ ...fieldStyle, color: textSoft }}>
                                <span>Translation</span>
                                <input
                                  value={wordForm.definition}
                                  onChange={(event) =>
                                    handleWordFormChange(
                                      list.id,
                                      "definition",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="hello"
                                  style={lightInputStyle}
                                />
                              </label>

                              <div
                                style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSubmitWord(list.id)}
                                  style={primaryButtonStyle}
                                >
                                  Save word
                                </button>
                                <button
                                  type="button"
                                  onClick={() => resetWordForm(list.id)}
                                  style={secondaryButtonStyle}
                                >
                                  Done
                                </button>
                              </div>
                            </section>
                          ) : null}

                          <section style={{ display: "grid", gap: "12px" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ display: "grid", gap: "6px" }}>
                                <p
                                  style={{
                                    margin: 0,
                                    color: textStrong,
                                    fontSize: "1rem",
                                  }}
                                >
                                  Word progress
                                </p>
                                <p style={{ margin: 0, color: textMuted, fontSize: "0.92rem" }}>
                                  Track which words need more quiz time.
                                </p>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              />
                            </div>

                            {loadingWordsByDeck[list.id] ? (
                              <p style={{ margin: 0, color: textMuted }}>
                                Loading words...
                              </p>
                            ) : words.length === 0 ? (
                              <div
                                style={{
                                  border: "1px dashed rgba(130, 151, 255, 0.22)",
                                  borderRadius: "18px",
                                  padding: "18px",
                                  color: textMuted,
                                  background: "rgba(255,255,255,0.03)",
                                }}
                              >
                                No words in this deck yet. Add the first one above.
                              </div>
                            ) : (
                              <div className="deck-word-scroll">
                                {words.map((word) => (
                                  (() => {
                                    const strengthStyle = getStrengthStyle(word.strength);

                                    return (
                                      <article
                                        key={word.id}
                                        style={{
                                          border: strengthStyle.border,
                                          borderRadius: "18px",
                                          padding: "16px",
                                          display: "grid",
                                          gap: "12px",
                                          background:
                                            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.03))",
                                          boxShadow: strengthStyle.glow,
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: "12px",
                                            alignItems: "start",
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <div style={{ display: "grid", gap: "10px" }}>
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: "8px",
                                                flexWrap: "wrap",
                                                alignItems: "center",
                                              }}
                                            >
                                              <h4
                                                style={{
                                                  margin: 0,
                                                  fontSize: "1.1rem",
                                                  color: textStrong,
                                                }}
                                              >
                                                {word.term}
                                              </h4>
                                              <span
                                                style={{
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  padding: "6px 10px",
                                                  borderRadius: "999px",
                                                  fontSize: "0.78rem",
                                                  color: strengthStyle.color,
                                                  border: strengthStyle.border,
                                                  background: strengthStyle.background,
                                                }}
                                              >
                                                {strengthStyle.label}
                                              </span>
                                            </div>
                                            <p
                                              style={{
                                                margin: 0,
                                                color: textMuted,
                                                whiteSpace: "pre-wrap",
                                              }}
                                            >
                                              {word.definition}
                                            </p>
                                          </div>

                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "8px",
                                              flexWrap: "wrap",
                                            }}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => handleStartEditWord(list.id, word)}
                                              style={secondaryButtonStyle}
                                            >
                                              Edit word
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleRequestDeleteWord(list.id, word)}
                                              style={dangerButtonStyle}
                                            >
                                              Delete word
                                            </button>
                                          </div>
                                        </div>

                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "10px",
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <span
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              padding: "6px 10px",
                                              borderRadius: "999px",
                                              fontSize: "0.78rem",
                                              color: textMuted,
                                              border: "1px solid rgba(130, 151, 255, 0.16)",
                                              background: "rgba(255,255,255,0.03)",
                                            }}
                                          >
                                            {formatAccuracy(word.accuracy, word.practice_attempts)}
                                          </span>
                                          <span
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              padding: "6px 10px",
                                              borderRadius: "999px",
                                              fontSize: "0.78rem",
                                              color: textMuted,
                                              border: "1px solid rgba(130, 151, 255, 0.16)",
                                              background: "rgba(255,255,255,0.03)",
                                            }}
                                          >
                                            {word.correct_attempts || 0}/{word.practice_attempts || 0}{" "}
                                            correct
                                          </span>
                                        </div>
                                      </article>
                                    );
                                  })()
                                ))}
                              </div>
                            )}
                          </section>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>

      {showDeckModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 7, 13, 0.62)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "min(680px, 100%)",
              maxHeight: "min(88vh, 920px)",
              overflowY: "auto",
              background: panelBackground,
              border: panelBorder,
              borderRadius: "28px",
              padding: "28px",
              boxShadow: panelShadow,
              display: "grid",
              gap: "18px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#76f7d5",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: "0.78rem",
                }}
              >
                {editingId ? "Edit deck" : "Create deck"}
              </p>
              <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem", color: textStrong }}>
                {editingId ? "Update your deck" : "Build a new deck"}
              </h2>
              <p
                style={{
                  margin: "10px 0 0",
                  color: textMuted,
                  fontSize: "0.98rem",
                }}
              >
                {editingId
                  ? `This deck will stay in ${activeLanguage}.`
                  : `Create a deck for ${activeLanguage} and add word pairs right away.`}
              </p>
            </div>

            <label style={{ ...fieldStyle, color: textSoft }}>
              <span>Deck name</span>
              <input
                name="name"
                value={deckForm.name}
                onChange={handleDeckFormChange}
                placeholder="Travel essentials"
                autoFocus
                style={inputStyle}
              />
            </label>

            {!editingId ? (
              <section
                style={{
                  display: "grid",
                  gap: "14px",
                  borderTop: "1px solid rgba(130, 151, 255, 0.14)",
                  paddingTop: "18px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  {/* <p
                    style={{
                      margin: 0,
                      color: "#76f7d5",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontSize: "0.75rem",
                    }}
                  >
                    Starter words
                  </p> */}
                  <h3 style={{ margin: 0, color: textStrong, fontSize: "1.15rem" }}>
                    Add words and translations
                  </h3>
                  <p style={{ margin: 0, color: textMuted }}>
                    Add each word pair to the list below, then create the deck when
                    you&apos;re ready.
                  </p>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  <label style={{ ...fieldStyle, color: textSoft }}>
                    <span>Word</span>
                    <input
                      value={deckDraftWord.term}
                      onChange={(event) =>
                        handleDeckDraftWordChange("term", event.target.value)
                      }
                      placeholder="hola"
                      style={lightInputStyle}
                    />
                  </label>

                  <label style={{ ...fieldStyle, color: textSoft }}>
                    <span>Translation</span>
                    <input
                      value={deckDraftWord.definition}
                      onChange={(event) =>
                        handleDeckDraftWordChange("definition", event.target.value)
                      }
                      placeholder="hello"
                      style={lightInputStyle}
                    />
                  </label>

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={handleAddDeckDraftWord}
                      style={secondaryButtonStyle}
                    >
                      Add word
                    </button>
                  </div>

                  {error === deckDraftWordErrorMessage ? (
                    <p
                      style={{
                        margin: 0,
                        color: "#ffb6d7",
                        fontSize: "0.92rem",
                      }}
                    >
                      {deckDraftWordErrorMessage}
                    </p>
                  ) : null}

                  {deckDraftWords.length > 0 ? (
                    <div style={{ display: "grid", gap: "12px" }}>
                      <p style={{ margin: 0, color: textMuted, fontSize: "0.92rem" }}>
                        {deckDraftWords.length}{" "}
                        {deckDraftWords.length === 1 ? "word" : "words"} added
                      </p>
                      {deckDraftWords.map((draft) => (
                        <div
                          key={draft.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "16px",
                            alignItems: "start",
                            flexWrap: "wrap",
                            padding: "16px",
                            borderRadius: "20px",
                            border: "1px solid rgba(130, 151, 255, 0.14)",
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gap: "10px",
                              minWidth: "0",
                              flex: "1 1 220px",
                            }}
                          >
                            <p style={{ margin: 0, color: textStrong }}>
                              {draft.term}
                            </p>
                            <p style={{ margin: 0, color: textMuted }}>
                              {draft.definition}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDeckDraftWord(draft.id)}
                            style={dangerButtonStyle}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px dashed rgba(130, 151, 255, 0.22)",
                        borderRadius: "18px",
                        padding: "16px",
                        color: textMuted,
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      Your added words will appear here as you build the deck.
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {error && error !== deckDraftWordErrorMessage ? (
              <p
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "rgba(246, 89, 89, 0.18)",
                  color: "#ffd6d6",
                }}
              >
                {error}
              </p>
            ) : null}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSubmitDeck}
                disabled={saving}
                style={primaryButtonStyle}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save"
                    : "Create deck"}
              </button>
              <button
                type="button"
                onClick={closeDeckModal}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {languageMenu ? (
        <div
          style={{
            ...contextMenuStyle,
            left: `${languageMenu.x}px`,
            top: `${languageMenu.y}px`,
          }}
        >
          <button
            type="button"
            onClick={handleOpenRenameLanguage}
            style={{
              ...secondaryButtonStyle,
              width: "100%",
              textAlign: "left",
              justifyContent: "flex-start",
              borderRadius: "12px",
            }}
          >
            Edit language name
          </button>
          <button
            type="button"
            onClick={handleOpenDeleteLanguage}
            style={{
              ...dangerButtonStyle,
              width: "100%",
              textAlign: "left",
              justifyContent: "flex-start",
              borderRadius: "12px",
            }}
          >
            Delete language
          </button>
        </div>
      ) : null}

      {showAddLanguage ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 7, 13, 0.62)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              background: panelBackground,
              border: panelBorder,
              borderRadius: "28px",
              padding: "28px",
              boxShadow: panelShadow,
              display: "grid",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#76f7d5",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: "0.78rem",
                }}
              >
                Add language
              </p>
              <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem", color: textStrong }}>
                What language are you studying?
              </h2>
            </div>

            <label style={{ ...fieldStyle, color: textSoft }}>
              <span>Language name</span>
              <input
                value={newLanguage}
                onChange={(event) => setNewLanguage(event.target.value)}
                placeholder="Spanish"
                autoFocus
                style={lightInputStyle}
              />
            </label>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleCreateLanguage}
                style={primaryButtonStyle}
              >
                Use this language
              </button>
              <button
                type="button"
                onClick={handleCloseAddLanguage}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDialog ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 7, 13, 0.62)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "min(460px, 100%)",
              background: panelBackground,
              border: panelBorder,
              borderRadius: "28px",
              padding: "28px",
              boxShadow: panelShadow,
              display: "grid",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#76f7d5",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: "0.78rem",
                }}
              >
                {confirmDialog.kicker}
              </p>
              <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem", color: textStrong }}>
                {confirmDialog.title}
              </h2>
            </div>

            <p style={{ margin: 0, color: textMuted }}>
              {confirmDialog.message}
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                style={dangerButtonStyle}
              >
                {confirmDialog.confirmLabel}
              </button>
              <button
                type="button"
                onClick={closeConfirmDialog}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {languageModal?.type === "rename" ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 7, 13, 0.62)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "min(460px, 100%)",
              background: panelBackground,
              border: panelBorder,
              borderRadius: "28px",
              padding: "28px",
              boxShadow: panelShadow,
              display: "grid",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#76f7d5",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: "0.78rem",
                }}
              >
                Edit language
              </p>
              <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem", color: textStrong }}>
                Rename {languageModal.language}
              </h2>
            </div>

            <label style={{ ...fieldStyle, color: textSoft }}>
              <span>New language name</span>
              <input
                value={languageDraft}
                onChange={(event) => setLanguageDraft(event.target.value)}
                autoFocus
                style={lightInputStyle}
              />
            </label>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleRenameLanguage}
                style={primaryButtonStyle}
              >
                Save language
              </button>
              <button
                type="button"
                onClick={closeLanguageModal}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
