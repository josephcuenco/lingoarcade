import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import AuthProvider from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import BingoPage from "./pages/BingoPage";
import BuildPage from "./pages/BuildPage";
import CardMatchingPage from "./pages/CardMatchingPage";
import CrosswordPage from "./pages/CrosswordPage";
import GameHubPage from "./pages/GameHubPage";
import LoginPage from "./pages/LoginPage";
import QuizPage from "./pages/QuizPage";
import RegisterPage from "./pages/RegisterPage";
import StatsPage from "./pages/StatsPage";
import WordBuilderPage from "./pages/WordBuilderPage";
import WordSearchPage from "./pages/WordSearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/build" element={<BuildPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/play" element={<GameHubPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/play/card-matching" element={<CardMatchingPage />} />
            <Route path="/play/bingo" element={<BingoPage />} />
            <Route path="/play/word-search" element={<WordSearchPage />} />
            <Route path="/play/crossword" element={<CrosswordPage />} />
            <Route path="/play/word-builder" element={<WordBuilderPage />} />
          </Route>
          <Route path="/lists" element={<Navigate to="/build" replace />} />
          <Route path="/games" element={<Navigate to="/play" replace />} />
          <Route path="/games/quiz" element={<Navigate to="/quiz" replace />} />
          <Route
            path="/games/card-matching"
            element={<Navigate to="/play/card-matching" replace />}
          />
          <Route path="/games/bingo" element={<Navigate to="/play/bingo" replace />} />
          <Route
            path="/games/word-search"
            element={<Navigate to="/play/word-search" replace />}
          />
          <Route
            path="/games/crossword"
            element={<Navigate to="/play/crossword" replace />}
          />
          <Route
            path="/games/word-builder"
            element={<Navigate to="/play/word-builder" replace />}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
