import { createContext, useContext, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("etcrm_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("etcrm_user");
    return stored ? JSON.parse(stored) : null;
  });

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("etcrm_token", data.token);
    localStorage.setItem("etcrm_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("etcrm_token");
    localStorage.removeItem("etcrm_user");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ token, user, login, logout, isAuthenticated: Boolean(token && user) }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
