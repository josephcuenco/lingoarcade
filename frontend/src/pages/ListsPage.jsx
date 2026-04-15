import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";

const emptyForm = {
  name: "",
  language: "",
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

export default function ListsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLists = async () => {
      setLoading(true);
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

        setError(err.response?.data?.detail || "We couldn't load your lists.");
      } finally {
        setLoading(false);
      }
    };

    loadLists();
  }, [logout, navigate]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      language: form.language.trim(),
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
      }

      resetForm();
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.detail ||
          (editingId
            ? "We couldn't update that list."
            : "We couldn't create that list."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (list) => {
    setEditingId(list.id);
    setForm({
      name: list.name,
      language: list.language,
    });
    setError("");
  };

  const handleDelete = async (listId) => {
    setError("");

    try {
      await api.delete(`/lists/${listId}`);
      setLists((currentLists) =>
        currentLists.filter((list) => list.id !== listId),
      );

      if (editingId === listId) {
        resetForm();
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(err.response?.data?.detail || "We couldn't delete that list.");
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
          <div>
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
                maxWidth: "50ch",
                color: "#4d5a73",
                fontSize: "1.05rem",
              }}
            >
              Create focused vocabulary lists by language, then keep shaping them
              as your study routine grows.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={secondaryButtonStyle}
          >
            Log out
          </button>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          <form
            onSubmit={handleSubmit}
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
                {editingId ? "Editing" : "New list"}
              </p>
              <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem" }}>
                {editingId ? "Update your list" : "Start a fresh list"}
              </h2>
            </div>

            <label style={fieldStyle}>
              <span>Name</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Travel essentials"
                required
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Language</span>
              <input
                name="language"
                value={form.language}
                onChange={handleChange}
                placeholder="Spanish"
                required
                style={inputStyle}
              />
            </label>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="submit" disabled={saving} style={primaryButtonStyle}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create list"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
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
                  Your collection
                </p>
                <h2 style={{ margin: "6px 0 0", fontSize: "1.9rem" }}>
                  Vocabulary lists
                </h2>
              </div>
              <p style={{ margin: 0, color: "#4d5a73" }}>
                {lists.length} {lists.length === 1 ? "list" : "lists"}
              </p>
            </div>

            {loading ? (
              <p style={{ margin: 0, color: "#4d5a73" }}>Loading your lists...</p>
            ) : lists.length === 0 ? (
              <div
                style={{
                  border: "1px dashed rgba(23,32,51,0.15)",
                  borderRadius: "22px",
                  padding: "28px",
                  color: "#4d5a73",
                }}
              >
                Your first list will show up here. Try one for verbs, travel
                phrases, or food vocabulary.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                {lists.map((list) => (
                  <article
                    key={list.id}
                    style={{
                      border: "1px solid rgba(23,32,51,0.1)",
                      borderRadius: "22px",
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.85rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#b26a00",
                        }}
                      >
                        {list.language}
                      </p>
                      <h3
                        style={{
                          margin: "8px 0 0",
                          fontSize: "1.3rem",
                        }}
                      >
                        {list.name}
                      </h3>
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => handleEdit(list)}
                        style={secondaryButtonStyle}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(list.id)}
                        style={dangerButtonStyle}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
