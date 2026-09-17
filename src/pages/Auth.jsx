import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IcArrow } from "../components/Icons";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4";
const POSTER_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_132328_5f9029c8-218f-4489-82b6-29ff2849920e.png";

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const { registerOrg, login } = useAuth();
  const navigate = useNavigate();

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // register fields
  const [orgName, setOrgName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [rLogin, setRLogin] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");

  // login fields
  const [lLogin, setLLogin] = useState("");
  const [lPass, setLPass] = useState("");

  const submitRegister = async (e) => {
    e.preventDefault();
    setErr("");
    if (!orgName.trim() || !adminName.trim() || !rLogin.trim() || !rPass) {
      return setErr("Заполните все поля");
    }
    if (rPass.length < 6) return setErr("Пароль должен быть не короче 6 символов");
    if (rPass !== rPass2) return setErr("Пароли не совпадают");
    setBusy(true);
    try {
      await registerOrg({ orgName, adminName, login: rLogin, password: rPass });
      navigate("/app");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setErr("");
    if (!lLogin.trim() || !lPass) return setErr("Введите логин и пароль");
    setBusy(true);
    try {
      await login({ login: lLogin, password: lPass });
      navigate("/app");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__art">
        <video autoPlay muted loop playsInline preload="auto" poster={POSTER_URL}>
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="scrim" />
        <div className="auth__artcopy">
          <div className="brand">ECHOIT</div>
          <p>Единая IT-мастерская вашей компании —<br />склад, оборудование, задачи и доступы</p>
        </div>
      </div>

      <div className="auth__form">
        <div className="auth__inner">
          <h2>{mode === "register" ? "Создание организации" : "Вход в систему"}</h2>
          <div className="sub">{mode === "register" ? "Регистрирует администратор" : "Учётная запись сотрудника"}</div>

          <div className="auth__tabs">
            <button className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); }}>Вход</button>
            <button className={mode === "register" ? "on" : ""} onClick={() => { setMode("register"); setErr(""); }}>Создать организацию</button>
          </div>

          {mode === "register" ? (
            <form className="auth__stack" onSubmit={submitRegister} noValidate>
              <div>
                <label className="lbl" style={{ display: "block", marginBottom: 12 }}>Название организации</label>
                <input className="field" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Напр. ООО «Ромашка»" />
              </div>
              <div>
                <label className="lbl" style={{ display: "block", marginBottom: 12 }}>Ваше имя (администратор)</label>
                <input className="field" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Иванов Иван" />
              </div>
              <div>
                <label className="lbl" style={{ display: "block", marginBottom: 12 }}>Логин</label>
                <input className="field" value={rLogin} onChange={(e) => setRLogin(e.target.value)} placeholder="admin" autoCapitalize="off" />
              </div>
              <div>
                <label className="lbl" style={{ display: "block", marginBottom: 12 }}>Пароль</label>
                <input className="field" type="password" value={rPass} onChange={(e) => setRPass(e.target.value)} placeholder="Минимум 6 символов" />
              </div>
              <div>
                <label className="lbl" style={{ display: "block", marginBottom: 12 }}>Повторите пароль</label>
                <input className="field" type="password" value={rPass2} onChange={(e) => setRPass2(e.target.value)} placeholder="Ещё раз пароль" />
              </div>
              <div className="auth__err">{err}</div>
              <button className="btn btn--solid btn--block" disabled={busy} style={{ padding: 18 }}>
                {busy ? "Создаём…" : "Создать организацию"}
              </button>
              <div className="auth__hint">
                Вы станете администратором организации: сможете добавлять филиалы, этажи, кабинеты
                и создавать учётные записи сотрудникам с индивидуальными правами доступа.
              </div>
            </form>
          ) : (
            <form className="auth__stack" onSubmit={submitLogin} noValidate>
              <div>
                <label className="lbl" style={{ display: "block", marginBottom: 12 }}>Логин</label>
                <input className="field" value={lLogin} onChange={(e) => setLLogin(e.target.value)} placeholder="Введите логин" autoFocus />
              </div>
              <div>
                <label className="lbl" style={{ display: "block", marginBottom: 12 }}>Пароль</label>
                <input className="field" type="password" value={lPass} onChange={(e) => setLPass(e.target.value)} placeholder="Введите пароль" />
              </div>
              <div className="auth__err">{err}</div>
              <button className="btn btn--solid btn--block" disabled={busy} style={{ padding: 18 }}>
                {busy ? "Входим…" : "Войти"}
              </button>
              <div className="auth__hint">
                Нет учётной записи? Логин и пароль сотрудника выдаёт администратор вашей организации.
              </div>
            </form>
          )}

          <div style={{ marginTop: 26 }}>
            <Link className="back-link" to="/"><IcArrow style={{ transform: "rotate(180deg)" }} /> На главную</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
