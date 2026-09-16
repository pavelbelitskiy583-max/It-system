import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { lsGet, lsSet } from "../lib/storage";
import { hashPassword, verifyPassword } from "../lib/crypto";
import { makeId, genPassword } from "../lib/id";

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
  const [session, setSession] = useState(() => lsGet("session"));
  const [org, setOrg] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const loadSession = useCallback((s) => {
    if (!s) { setOrg(null); setUser(null); return; }
    const o = lsGet(`org:${s.orgId}`);
    const users = lsGet(`users:${s.orgId}`, []);
    const u = users.find((x) => x.id === s.userId);
    setOrg(o || null);
    setUser(u || null);
  }, []);

  useEffect(() => {
    loadSession(session);
    setReady(true);
  }, []); // eslint-disable-line

  const persistSession = (s) => {
    setSession(s);
    if (s) lsSet("session", s); else lsSet("session", null);
    loadSession(s);
  };

  /* ---------- регистрация организации + админа ---------- */
  const registerOrg = async ({ orgName, adminName, login, password }) => {
    const logins = lsGet("logins", {});
    const key = login.trim().toLowerCase();
    if (logins[key]) throw new Error("Такой логин уже занят");

    const orgId = makeId("org");
    const adminId = makeId("usr");
    const { hash, salt } = await hashPassword(password);

    const orgRecord = { id: orgId, name: orgName.trim(), createdAt: new Date().toISOString(), adminId };
    const adminUser = {
      id: adminId,
      login: login.trim(),
      name: adminName.trim(),
      role: "admin",
      permissions: fullPermissions(),
      branchId: null,
      passHash: hash,
      passSalt: salt,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    };

    lsSet(`org:${orgId}`, orgRecord);
    lsSet(`users:${orgId}`, [adminUser]);
    lsSet(`data:${orgId}`, defaultOrgData());

    const orgs = lsGet("orgs", []);
    lsSet("orgs", [...orgs, { id: orgId, name: orgRecord.name }]);

    logins[key] = { orgId, userId: adminId };
    lsSet("logins", logins);

    persistSession({ orgId, userId: adminId });
    return orgRecord;
  };

  /* ---------- вход ---------- */
  const login = async ({ login, password }) => {
    const logins = lsGet("logins", {});
    const key = login.trim().toLowerCase();
    const entry = logins[key];
    if (!entry) throw new Error("Пользователь с таким логином не найден");
    const users = lsGet(`users:${entry.orgId}`, []);
    const u = users.find((x) => x.id === entry.userId);
    if (!u) throw new Error("Учётная запись не найдена");
    const ok = await verifyPassword(password, u.passHash, u.passSalt);
    if (!ok) throw new Error("Неверный пароль");
    persistSession({ orgId: entry.orgId, userId: entry.userId });
    return u;
  };

  const logout = () => persistSession(null);

  /* ---------- сотрудники (доступно только админу) ---------- */
  const createEmployee = async ({ name, login, role = "staff", branchId = null, permissions }) => {
    if (!org) throw new Error("Нет активной организации");
    const logins = lsGet("logins", {});
    const key = login.trim().toLowerCase();
    if (logins[key]) throw new Error("Такой логин уже занят");

    const password = genPassword(10);
    const { hash, salt } = await hashPassword(password);
    const userId = makeId("usr");
    const newUser = {
      id: userId,
      login: login.trim(),
      name: name.trim(),
      role,
      permissions: permissions || emptyPermissions(),
      branchId,
      passHash: hash,
      passSalt: salt,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };
    const users = lsGet(`users:${org.id}`, []);
    lsSet(`users:${org.id}`, [...users, newUser]);
    logins[key] = { orgId: org.id, userId };
    lsSet("logins", logins);
    return { user: newUser, password };
  };

  const updateEmployee = (userId, patch) => {
    const users = lsGet(`users:${org.id}`, []);
    const next = users.map((u) => (u.id === userId ? { ...u, ...patch } : u));
    lsSet(`users:${org.id}`, next);
    if (userId === user?.id) setUser((u) => ({ ...u, ...patch }));
    return next;
  };

  const regeneratePassword = async (userId) => {
    const password = genPassword(10);
    const { hash, salt } = await hashPassword(password);
    updateEmployee(userId, { passHash: hash, passSalt: salt, mustChangePassword: true });
    return password;
  };

  const removeEmployee = (userId) => {
    const users = lsGet(`users:${org.id}`, []);
    const target = users.find((u) => u.id === userId);
    lsSet(`users:${org.id}`, users.filter((u) => u.id !== userId));
    if (target) {
      const logins = lsGet("logins", {});
      delete logins[target.login.trim().toLowerCase()];
      lsSet("logins", logins);
    }
  };

  const listEmployees = () => (org ? lsGet(`users:${org.id}`, []) : []);

  const changeOwnPassword = async (newPassword) => {
    const { hash, salt } = await hashPassword(newPassword);
    updateEmployee(user.id, { passHash: hash, passSalt: salt, mustChangePassword: false });
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

function defaultOrgData() {
  return {
    branches: [],
    warehouse: [],
    cartridges: [],
    equipment: [],
    tasks: [],
    channels: [
      { id: "general", name: "# общий", desc: "Все сотрудники", branchId: null },
    ],
    messages: { general: [] },
    vault: null, // инициализируется при первом открытии раздела
  };
}
