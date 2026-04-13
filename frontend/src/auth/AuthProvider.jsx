import { useState } from "react";
import api from "../api/client";
import { AuthContext } from "./auth-context";

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const accessToken = response.data.access_token;
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
  };

  const register = async (email, password) => {
    const response = await api.post("/auth/register", { email, password });
    const accessToken = response.data.access_token;
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}