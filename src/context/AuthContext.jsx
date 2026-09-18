import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AuthCtx = createContext(null);

export const ALL_MODULES = [
  { id: "warehouse", name: "Склад IT" },
  { id: "cartridges", name: "Картриджи" },
  { id: "equipment", name: "Оборудование" },
  { id: "tasks", name: "Задачи" },
  { id: "messenger", name: "Мессенджер" },
  { id: "vault", name: "Доступы" },
  { id: "settings", name: "Настройки организации" },
];

function fullPermissions() {
  const p = {};
  for (const m of ALL_MODULES) p[m.id] = true;
  return p;
}
function emptyPermissions() {
  const p = {};
  for (const m of ALL_MODULES) p[m.id] = false;
  return p;
}

export function AuthProvider({ children }) {
  const [org, setOrg] = useState(null);
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [ready, setReady] = useState(false);

  const refreshEmployees = useCallback(async () => {
    try {
      const list = await api.get("/employees");
      setEmployees(list);
    } catch {
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { user: u, org: o } = await api.get("/auth");
        setUser(u); setOrg(o);
        await refreshEmployees();
      } catch {
        setUser(null); setOrg(null);
      } finally {
        setReady(true);
      }
    })();
  }, []); // eslint-disable-line

  const registerOrg = async ({ orgName, adminName, login, password }) => {
    const { user: u, org: o } = await api.post("/auth", { action: "register", orgName, adminName, login, password });
    setUser(u); setOrg(o);
    await refreshEmployees();
    return o;
  };

  const login = async ({ login, password }) => {
    const { user: u, org: o } = await api.post("/auth", { action: "login", login, password });
    setUser(u); setOrg(o);
    await refreshEmployees();
    return u;
  };

  const logout = async () => {
    try { await api.post("/auth", { action: "logout" }); } catch { /* ignore */ }
    setUser(null); setOrg(null); setEmployees([]);
  };

  const createEmployee = async ({ name, login, branchId = null, permissions }) => {
    const res = await api.post("/employees", { action: "create", name, login, branchId, permissions: permissions || emptyPermissions() });
    await refreshEmployees();
    return res; // { user, password }
  };

  const updateEmployee = async (userId, patch) => {
    await api.post("/employees", { action: "update", id: userId, ...patch });
    await refreshEmployees();
  };

  const regeneratePassword = async (userId) => {
    const { password } = await api.post("/employees", { action: "reset-password", id: userId });
    await refreshEmployees();
    return password;
  };

  const removeEmployee = async (userId) => {
    await api.post("/employees", { action: "delete", id: userId });
    await refreshEmployees();
  };

  const listEmployees = () => employees;

  const changeOwnPassword = async (newPassword) => {
    await api.post("/auth", { action: "change-password", newPassword });
    setUser((u) => ({ ...u, mustChangePassword: false }));
  };

  const can = (moduleId) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return !!user.permissions?.[moduleId];
  };

  const value = {
    ready, org, user, isAdmin: user?.role === "admin",
    registerOrg, login, logout,
    createEmployee, updateEmployee, removeEmployee, regeneratePassword, listEmployees,
    changeOwnPassword, can,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return ctx;
}

export { fullPermissions, emptyPermissions };
