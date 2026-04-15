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

const fieldStyle = {
  display: "grid",
  gap: "8px",
  fontSize: "0.95rem",
};

const inputStyle = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.08)",
  color: "inherit",
};

const lightInputStyle = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(23,32,51,0.12)",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.9)",
  color: "#172033",
};

const textareaStyle = {
  ...lightInputStyle,
  minHeight: "96px",
  resize: "vertical",
  fontFamily: "inherit",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "#f9c46b",
  color: "#172033",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid rgba(23,32,51,0.16)",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "rgba(255,255,255,0.7)",
  color: "#172033",
  cursor: "pointer",
};

const dangerButtonStyle = {
  border: "1px solid rgba(191, 45, 45, 0.16)",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "#fff1f1",
  color: "#9f1f1f",
  cursor: "pointer",
};

const contextMenuStyle = {
  position: "fixed",
  minWidth: "180px",
  background: "#fffdf8",
  border: "1px solid rgba(23,32,51,0.12)",
  borderRadius: "18px",
  padding: "8px",
  boxShadow: "0 18px 40px rgba(17, 24, 39, 0.18)",
  zIndex: 20,
  display: "grid",
  gap: "6px",
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
  const [loadingWordsByDeck, setLoadingWordsByDeck] = useState({});
  const [activeLanguage, setActiveLanguage] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [languageMenu, setLanguageMenu] = useState(null);
  const [languageModal, setLanguageModal] = useState(null);
  const [languageDraft, setLanguageDraft] = useState("");
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

  const closeLanguageModal = () => {
    setLanguageModal(null);
    setLanguageDraft("");
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
  };

  const handleDeckFormChange = (event) => {
    const { name, value } = event.target;
    setDeckForm((currentForm) => ({ ...currentForm, [name]: value }));
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

      resetWordForm(deckId);
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
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(err.response?.data?.detail || "We couldn't delete that language.");
    }
  };

  const handleSubmitDeck = async (event) => {
    event.preventDefault();

    if (!activeLanguage.trim()) {
      setError("Choose a working language before creating a deck.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      name: deckForm.name.trim(),
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
      } else {
        const response = await api.post("/lists", payload);
        setLists((currentLists) => [response.data, ...currentLists]);
        setLanguages((currentLanguages) =>
          currentLanguages.includes(response.data.language)
            ? currentLanguages
            : [...currentLanguages, response.data.language],
        );
        setActiveLanguage(response.data.language);
      }

      resetDeckForm();
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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
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
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(23,32,51,0.1)",
            borderRadius: "28px",
            padding: "28px 32px",
            boxShadow: "0 18px 50px rgba(44, 62, 95, 0.08)",
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
                  color: "#b26a00",
                }}
              >
                LingoArcade
              </p>

              <button
                type="button"
                onClick={handleLogout}
                style={secondaryButtonStyle}
              >
                Log out
              </button>
            </div>

            <h1
              style={{
                margin: "8px 0 10px",
                fontSize: "clamp(2.3rem, 6vw, 4.5rem)",
                lineHeight: 0.95,
              }}
            >
              Build your language decks.
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "54ch",
                color: "#4d5a73",
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
              <div style={{ ...fieldStyle, color: "#4d5a73" }}>
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
                            ? "#172033"
                            : "rgba(255,255,255,0.7)",
                        color:
                          language === activeLanguage ? "#f5f7fb" : "#172033",
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
                <p style={{ margin: 0, color: "#4d5a73" }}>
                  Start by adding your first language.
                </p>
              ) : (
                <p style={{ margin: 0, color: "#4d5a73", fontSize: "0.92rem" }}>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          <form
            onSubmit={handleSubmitDeck}
            style={{
              background: "#172033",
              color: "#f5f7fb",
              borderRadius: "28px",
              padding: "28px",
              boxShadow: "0 22px 48px rgba(17, 24, 39, 0.18)",
              display: "grid",
              gap: "16px",
              alignSelf: "start",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#f9c46b",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: "0.78rem",
                }}
              >
                {editingId ? "Editing" : "New Deck"}
              </p>
              <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem" }}>
                {editingId ? "Update your deck" : "Start a fresh deck"}
              </h2>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#c8d2e8",
                  fontSize: "0.98rem",
                }}
              >
                {activeLanguage
                  ? `All decks created here will be added to ${activeLanguage}.`
                  : "Choose a working language above to start organizing decks."}
              </p>
            </div>

            <label style={fieldStyle}>
              <span>Name</span>
              <input
                name="name"
                value={deckForm.name}
                onChange={handleDeckFormChange}
                placeholder="Travel essentials"
                required
                disabled={!activeLanguage}
                style={inputStyle}
              />
            </label>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={saving || !activeLanguage}
                style={primaryButtonStyle}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create deck"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetDeckForm}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
              ) : null}
            </div>

            {error ? (
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
          </form>

          <section
            style={{
              background: "rgba(255,255,255,0.82)",
              border: "1px solid rgba(23,32,51,0.1)",
              borderRadius: "28px",
              padding: "28px",
              boxShadow: "0 18px 50px rgba(44, 62, 95, 0.08)",
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
                <p style={{ margin: 0, color: "#b26a00", fontSize: "0.9rem" }}>
                  {activeLanguage ? `${activeLanguage} collection` : "Your collection"}
                </p>
                <h2 style={{ margin: "6px 0 0", fontSize: "1.9rem" }}>
                  Vocabulary decks
                </h2>
              </div>
              <p style={{ margin: 0, color: "#4d5a73" }}>
                {filteredLists.length} {filteredLists.length === 1 ? "deck" : "decks"}
              </p>
            </div>

            {loading ? (
              <p style={{ margin: 0, color: "#4d5a73" }}>Loading your decks...</p>
            ) : !activeLanguage ? (
              <div
                style={{
                  border: "1px dashed rgba(23,32,51,0.15)",
                  borderRadius: "22px",
                  padding: "28px",
                  color: "#4d5a73",
                }}
              >
                Pick the language you want to work on, and this screen will focus
                just on the decks for that language.
              </div>
            ) : filteredLists.length === 0 ? (
              <div
                style={{
                  border: "1px dashed rgba(23,32,51,0.15)",
                  borderRadius: "22px",
                  padding: "28px",
                  color: "#4d5a73",
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
                  const words = wordsByDeck[list.id] || [];

                  return (
                    <article
                      key={list.id}
                      style={{
                        border: "1px solid rgba(23,32,51,0.1)",
                        borderRadius: "22px",
                        padding: "18px",
                        display: "grid",
                        gap: "16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "16px",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: "0",
                              fontSize: "1.3rem",
                            }}
                          >
                            {list.name}
                          </h3>
                          <p
                            style={{
                              margin: "6px 0 0",
                              color: "#4d5a73",
                              fontSize: "0.92rem",
                            }}
                          >
                            {words.length} {words.length === 1 ? "word" : "words"}
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleDeck(list.id)}
                            style={secondaryButtonStyle}
                          >
                            {isExpanded ? "Hide words" : "Open words"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditDeck(list)}
                            style={secondaryButtonStyle}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeck(list.id)}
                            style={dangerButtonStyle}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div
                          style={{
                            borderTop: "1px solid rgba(23,32,51,0.08)",
                            paddingTop: "18px",
                            display: "grid",
                            gap: "18px",
                          }}
                        >
                          <section
                            style={{
                              background: "#f9fbff",
                              borderRadius: "18px",
                              padding: "18px",
                              display: "grid",
                              gap: "12px",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  margin: 0,
                                  color: "#b26a00",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.12em",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {editingWord ? "Editing word" : "New word"}
                              </p>
                              <h4 style={{ margin: "8px 0 0", fontSize: "1.2rem" }}>
                                {editingWord
                                  ? `Update ${editingWord.term}`
                                  : "Add a word and definition"}
                              </h4>
                            </div>

                            <label style={{ ...fieldStyle, color: "#4d5a73" }}>
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

                            <label style={{ ...fieldStyle, color: "#4d5a73" }}>
                              <span>Definition</span>
                              <textarea
                                value={wordForm.definition}
                                onChange={(event) =>
                                  handleWordFormChange(
                                    list.id,
                                    "definition",
                                    event.target.value,
                                  )
                                }
                                placeholder="hello"
                                style={textareaStyle}
                              />
                            </label>

                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => handleSubmitWord(list.id)}
                                style={primaryButtonStyle}
                              >
                                {editingWord ? "Save word" : "Add word"}
                              </button>
                              {editingWord ? (
                                <button
                                  type="button"
                                  onClick={() => resetWordForm(list.id)}
                                  style={secondaryButtonStyle}
                                >
                                  Cancel
                                </button>
                              ) : null}
                            </div>
                          </section>

                          <section style={{ display: "grid", gap: "12px" }}>
                            {loadingWordsByDeck[list.id] ? (
                              <p style={{ margin: 0, color: "#4d5a73" }}>
                                Loading words...
                              </p>
                            ) : words.length === 0 ? (
                              <div
                                style={{
                                  border: "1px dashed rgba(23,32,51,0.15)",
                                  borderRadius: "18px",
                                  padding: "18px",
                                  color: "#4d5a73",
                                }}
                              >
                                No words in this deck yet. Add the first one above.
                              </div>
                            ) : (
                              words.map((word) => (
                                <article
                                  key={word.id}
                                  style={{
                                    border: "1px solid rgba(23,32,51,0.08)",
                                    borderRadius: "18px",
                                    padding: "16px",
                                    display: "grid",
                                    gap: "10px",
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
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: "1.1rem" }}>
                                        {word.term}
                                      </h4>
                                      <p
                                        style={{
                                          margin: "8px 0 0",
                                          color: "#4d5a73",
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
                                        onClick={() => handleDeleteWord(list.id, word.id)}
                                        style={dangerButtonStyle}
                                      >
                                        Delete word
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))
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
            background: "rgba(23,32,51,0.28)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              background: "#fffdf8",
              borderRadius: "28px",
              padding: "28px",
              boxShadow: "0 24px 70px rgba(17, 24, 39, 0.2)",
              display: "grid",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#b26a00",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: "0.78rem",
                }}
              >
                Add language
              </p>
              <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem" }}>
                What language are you studying?
              </h2>
            </div>

            <label style={{ ...fieldStyle, color: "#4d5a73" }}>
              <span>Language name</span>
              <input
                value={newLanguage}
                onChange={(event) => setNewLanguage(event.target.value)}
                placeholder="Spanish"
                autoFocus
                style={{
                  width: "100%",
                  borderRadius: "16px",
                  border: "1px solid rgba(23,32,51,0.12)",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.9)",
                  color: "#172033",
                }}
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

      {languageModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(23,32,51,0.28)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "min(460px, 100%)",
              background: "#fffdf8",
              borderRadius: "28px",
              padding: "28px",
              boxShadow: "0 24px 70px rgba(17, 24, 39, 0.2)",
              display: "grid",
              gap: "16px",
            }}
          >
            {languageModal.type === "rename" ? (
              <>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#b26a00",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      fontSize: "0.78rem",
                    }}
                  >
                    Edit language
                  </p>
                  <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem" }}>
                    Rename {languageModal.language}
                  </h2>
                </div>

                <label style={{ ...fieldStyle, color: "#4d5a73" }}>
                  <span>New language name</span>
                  <input
                    value={languageDraft}
                    onChange={(event) => setLanguageDraft(event.target.value)}
                    autoFocus
                    style={{
                      width: "100%",
                      borderRadius: "16px",
                      border: "1px solid rgba(23,32,51,0.12)",
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.9)",
                      color: "#172033",
                    }}
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
              </>
            ) : (
              <>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#b26a00",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      fontSize: "0.78rem",
                    }}
                  >
                    Delete language
                  </p>
                  <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem" }}>
                    Delete {languageModal.language}?
                  </h2>
                </div>

                <p style={{ margin: 0, color: "#4d5a73" }}>
                  This will permanently delete the language and all decks inside
                  it. This action cannot be undone.
                </p>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleDeleteLanguage}
                    style={dangerButtonStyle}
                  >
                    Delete language and decks
                  </button>
                  <button
                    type="button"
                    onClick={closeLanguageModal}
                    style={secondaryButtonStyle}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
