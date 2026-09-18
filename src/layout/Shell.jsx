import React, { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import {
  IcDash, IcBox, IcCartridge, IcServer, IcTask, IcChat, IcVault, IcSettings,
} from "../components/Icons";

const NAV = [
  { id: "dashboard", to: "/app", end: true, ic: IcDash, name: "Дашборд" },
  { id: "warehouse", to: "/app/warehouse", ic: IcBox, name: "Склад IT" },
  { id: "cartridges", to: "/app/cartridges", ic: IcCartridge, name: "Картриджи" },
  { id: "equipment", to: "/app/equipment", ic: IcServer, name: "Оборудование" },
  { id: "tasks", to: "/app/tasks", ic: IcTask, name: "Задачи" },
  { id: "messenger", to: "/app/messenger", ic: IcChat, name: "Мессенджер" },
  { id: "vault", to: "/app/vault", ic: IcVault, name: "Доступы", lock: true },
];

export default function Shell() {
  const { org, user, logout, can, isAdmin, changeOwnPassword } = useAuth();
  const { data, error, loading, refresh, vaultInitialized } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwErr, setPwErr] = useState("");

  const showToast = useCallback((msg) => setToast(msg), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const openTasks = (data?.tasks || []).filter((t) => t.status !== "done").length;

  const visibleNav = NAV.filter((n) => n.id === "dashboard" || can(n.id));

  const initials = (user?.name || "??").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const handleLogout = () => { logout(); navigate("/"); };

  if (!org || !user) return null;

  const submitPwChange = async (e) => {
    e.preventDefault();
    setPwErr("");
    if (pw.length < 6) return setPwErr("Пароль должен быть не короче 6 символов");
    if (pw !== pw2) return setPwErr("Пароли не совпадают");
    await changeOwnPassword(pw);
    setPw(""); setPw2("");
  };

  if (user.mustChangePassword) {
    return (
      <div className="modal-wrap">
        <div className="modal">
          <h3>Смена пароля</h3>
          <div className="sub">Это ваш первый вход — задайте собственный пароль</div>
          <form onSubmit={submitPwChange} style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 26 }}>
            <div className="ff"><span className="lbl">Новый пароль</span><input className="field field--box" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></div>
            <div className="ff"><span className="lbl">Повторите пароль</span><input className="field field--box" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
            <div className="auth__err">{pwErr}</div>
            <button className="btn btn--solid">Сохранить и продолжить</button>
            <button type="button" className="mono" style={{ fontSize: 11, color: "var(--dimmer)", letterSpacing: "0.1em", textAlign: "center" }} onClick={handleLogout}>Выйти</button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) {
    if (error) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div className="lbl" style={{ color: "var(--crit)" }}>Ошибка загрузки данных</div>
            <p style={{ marginTop: 16, fontSize: 14, color: "var(--dim)", lineHeight: 1.6, fontFamily: "var(--mono)", wordBreak: "break-word" }}>{error}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
              <button className="btn btn--solid" onClick={() => refresh()}>Повторить</button>
              <button className="btn" onClick={handleLogout}>Выйти</button>
            </div>
          </div>
        </div>
      );
    }
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }} className="mono lbl">Загрузка…</div>;
  }

  return (
    <div className="app">
      <aside className="side">
        <div className="side__brand">
          <div className="brand" style={{ fontSize: 20 }}>ECHOIT</div>
          <div className="lbl" style={{ marginTop: 8, color: "var(--dim)", letterSpacing: "0.1em" }}>{org.name}</div>
        </div>
        <nav className="side__nav">
          <div className="navsec lbl">Модули</div>
          {visibleNav.map((n) => (
            <NavLink key={n.id} to={n.to} end={n.end} className={({ isActive }) => "navbtn" + (isActive ? " on" : "")}>
              <span className="ic"><n.ic /></span>{n.name}
              {n.id === "tasks" && openTasks > 0 && <span className="badge">{openTasks}</span>}
              {n.lock && <span className="lock">{vaultInitialized ? "" : "•"}</span>}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="navsec lbl">Организация</div>
              <NavLink to="/app/settings" className={({ isActive }) => "navbtn" + (isActive ? " on" : "")}>
                <span className="ic"><IcSettings /></span>Настройки
              </NavLink>
            </>
          )}
        </nav>
        <div className="side__user">
          <div className="avatar">{initials}</div>
          <div className="who">
            <b>{user.name}</b>
            <span>{user.role === "admin" ? "Администратор" : "Сотрудник"}</span>
          </div>
          <button onClick={handleLogout}>Выход</button>
        </div>
      </aside>

      <main className="main">
        <Outlet context={{ showToast }} />
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
