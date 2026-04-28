import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const navItems = [
  { to: "/build", label: "Build", icon: "build" },
  { to: "/play", label: "Play", icon: "play" },
  { to: "/quiz", label: "Quiz", icon: "quiz" },
  { to: "/stats", label: "Stats", icon: "stats" },
];

function SidebarIcon({ name }) {
  if (name === "build") {
    return (
      <svg
        className="app-sidebar-icon app-sidebar-icon-build"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M8 4.5h11a1.8 1.8 0 0 1 1.8 1.8v5.2" />
        <path d="M5.5 8h11a1.8 1.8 0 0 1 1.8 1.8V15" />
        <rect x="3" y="11.5" width="13" height="8" rx="1.8" />
        <path d="M6.2 15.5h6" />
      </svg>
    );
  }

  if (name === "quiz") {
    return (
      <svg
        className="app-sidebar-icon app-sidebar-icon-quiz"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="5" y="5" width="14" height="14" rx="2.2" />
        <path d="M9.5 10.1a2.5 2.5 0 1 1 3.9 2.1c-.82.5-1.15.88-1.15 1.6" />
        <circle cx="12.25" cy="16.2" r="0.7" />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg
        className="app-sidebar-icon app-sidebar-icon-play"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M7.4 7.8h9.2a4.2 4.2 0 0 1 4 2.9l.85 3.2a3.45 3.45 0 0 1-5.85 3.32L14 15.2h-4l-1.6 2.02a3.45 3.45 0 0 1-5.85-3.32l.85-3.2a4.2 4.2 0 0 1 4-2.9z" />
        <path d="M8 10.7v3.4" />
        <path d="M6.3 12.4h3.4" />
        <circle cx="15.7" cy="11.7" r="0.75" />
        <circle cx="18.1" cy="14.2" r="0.75" />
      </svg>
    );
  }

  if (name === "stats") {
    return (
      <svg
        className="app-sidebar-icon app-sidebar-icon-stats"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="4.5" y="4.5" width="15" height="15" rx="2.4" />
        <path d="M7.2 15.8l3.2-3.4 2.6 2.1 3.8-5.2" />
        <path d="M14.5 9.3h2.3v2.3" />
      </svg>
    );
  }

  return (
    <svg
      className="app-sidebar-icon app-sidebar-icon-logout"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M10 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19H10" />
      <path d="M13 8l4 4-4 4" />
      <path d="M17 12H9" />
    </svg>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-layout">
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-sidebar-brand">
          <span className="app-sidebar-mark">LA</span>
          <span className="app-sidebar-name">LingoArcade</span>
        </div>

        <nav className="app-sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `app-sidebar-link ${isActive ? "is-active" : ""}`
              }
            >
              <SidebarIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="app-sidebar-logout"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <SidebarIcon name="logout" />
          Log out
        </button>
      </aside>

      <div className="app-layout-content">
        <Outlet />
      </div>

      {showLogoutConfirm ? (
        <div className="app-confirm-overlay" role="presentation">
          <section
            className="app-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <div>
              <p className="app-confirm-kicker">Don't go...
              </p>
              <h2 id="logout-confirm-title" className="app-confirm-title">
                Are you sure?
              </h2>
            </div>

            <p className="app-confirm-message">
              You will be returned to the login screen.
            </p>

            <div className="app-confirm-actions">
              <button
                type="button"
                className="app-confirm-danger"
                onClick={handleLogout}
              >
                Log out
              </button>
              <button
                type="button"
                className="app-confirm-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
