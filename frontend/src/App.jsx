import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import AuthProvider from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import GameHubPage from "./pages/GameHubPage";
import ListsPage from "./pages/ListsPage";
import LoginPage from "./pages/LoginPage";
import QuizPage from "./pages/QuizPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/lists"
            element={
              <ProtectedRoute>
                <ListsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <GameHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/quiz"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
