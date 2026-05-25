import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("expense_user") || "null"));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("expense_token")));

  useEffect(() => {
    async function loadProfile() {
      if (!localStorage.getItem("expense_token")) return;
      try {
        const { data } = await api.get("/profile");
        setUser(data);
        localStorage.setItem("expense_user", JSON.stringify(data));
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function authenticate(path, payload) {
    const { data } = await api.post(path, payload);
    localStorage.setItem("expense_token", data.access_token);
    localStorage.setItem("expense_user", JSON.stringify(data.user));
    setUser(data.user);
    toast.success(path === "/login" ? "Welcome back" : "Account created");
  }

  function logout() {
    localStorage.removeItem("expense_token");
    localStorage.removeItem("expense_user");
    setUser(null);
  }

  async function updateProfile(payload) {
    const { data } = await api.put("/profile", payload);
    setUser(data);
    localStorage.setItem("expense_user", JSON.stringify(data));
    toast.success("Profile updated");
  }

  const value = useMemo(() => ({ user, loading, login: (p) => authenticate("/login", p), register: (p) => authenticate("/register", p), logout, updateProfile }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
