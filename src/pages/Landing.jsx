import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTypewriter } from "../hooks/useTypewriter";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4";
const CONTACT_EMAIL = "hello@echoit.app";
const SENSITIVITY = 0.8;

const NAV_LINKS = [
  { href: "#modules", label: "Модули" },
  { href: "#how", label: "Как это работает" },
  { href: "#contact", label: "Контакты" },
];

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="12" height="12" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15V4a1 1 0 0 1 1-1h11" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function Landing() {
  const videoRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pillsVisible, setPillsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const { displayed, done } = useTypewriter(
    "Рады, что заглянули. Склад, оборудование, задачи и доступы — теперь в одном месте. Что настроим сегодня?",
    38,
    600
  );

  /* --- пилюли появляются через 400мс, независимо от печатной машинки --- */
  useEffect(() => {
    const t = setTimeout(() => setPillsVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  /* --- видео: скраб по движению мыши (десктоп) + touch-скраб (мобильные) --- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let prevX = null;
    let targetTime = 0;
    let seeking = false;
    let ready = false;

    const onLoaded = () => {
      ready = true;
      // показываем не пустой первый кадр, а лёгкий сдвиг вперёд — видео не автоплеится,
      // но и не остаётся чёрным прямоугольником до первого движения мыши
      try { video.currentTime = video.duration * 0.04; } catch { /* noop */ }
    };
    video.addEventListener("loadedmetadata", onLoaded);

    const seekTo = (t) => {
      if (!ready || !video.duration) return;
      targetTime = Math.min(Math.max(t, 0), video.duration);
      if (!seeking) {
        seeking = true;
        video.currentTime = targetTime;
      }
    };
    const onSeeked = () => {
      if (Math.abs(video.currentTime - targetTime) > 0.02) {
        video.currentTime = targetTime;
      } else {
        seeking = false;
      }
    };
    video.addEventListener("seeked", onSeeked);

    const onMouseMove = (e) => {
      if (prevX === null) { prevX = e.clientX; return; }
      const delta = e.clientX - prevX;
      prevX = e.clientX;
      if (!ready || !video.duration) return;
      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      seekTo((seeking ? targetTime : video.currentTime) + offset);
    };
    const onTouchMove = (e) => {
      const x = e.touches[0]?.clientX;
      if (x == null) return;
      if (prevX === null) { prevX = x; return; }
      const delta = x - prevX;
      prevX = x;
      if (!ready || !video.duration) return;
      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      seekTo((seeking ? targetTime : video.currentTime) + offset);
    };
    const onTouchEnd = () => { prevX = null; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(CONTACT_EMAIL); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mf-page">
      <video ref={videoRef} className="mf-video" muted playsInline preload="auto">
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* ---------- NAVBAR ---------- */}
      <nav className="mf-nav">
        <div className="mf-logo">
          <span className="mf-logo__text" style={{ fontFamily: "var(--font-heading)" }}>ECHOIT</span>
          <span className="mf-logo__star">✳︎</span>
        </div>

        <div className="mf-nav__links">
          {NAV_LINKS.map((l, i) => (
            <React.Fragment key={l.href}>
              <a href={l.href} onClick={(e) => { e.preventDefault(); document.querySelector(l.href)?.scrollIntoView({ behavior: "smooth" }); }}>{l.label}</a>
              {i < NAV_LINKS.length - 1 && <span>,&nbsp;</span>}
            </React.Fragment>
          ))}
        </div>

        <Link className="mf-nav__cta" to="/auth?mode=login">Войти</Link>

        <button className={"mf-burger" + (menuOpen ? " open" : "")} onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={menuOpen}>
          <span /><span /><span />
        </button>
      </nav>

      {/* ---------- MOBILE OVERLAY ---------- */}
      <div className="mf-overlay" style={{ opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? "auto" : "none" }} role="dialog" aria-modal="true" aria-hidden={!menuOpen}>
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); setMenuOpen(false); document.querySelector(l.href)?.scrollIntoView({ behavior: "smooth" }); }}>{l.label}</a>
        ))}
        <Link className="cta" to="/auth?mode=login" onClick={() => setMenuOpen(false)}>Войти</Link>
      </div>

      {/* ---------- HERO ---------- */}
      <section className="mf-hero">
        <div className="mf-hero__inner">
          <p className="mf-blurlabel">
            Здравствуйте, это ECHOIT,<br />
            IT-мастерская, которая наводит порядок в вашей инфраструктуре
          </p>

          <p className="mf-type">
            {displayed}
            {!done && <span className="mf-cursor" />}
          </p>

          <div className={"mf-pills" + (pillsVisible ? " show" : "")}>
            <Link className="mf-pill" to="/auth?mode=register">Создать организацию</Link>
            <Link className="mf-pill" to="/auth?mode=login">Войти в систему</Link>
            <a className="mf-pill" href="#modules" onClick={(e) => { e.preventDefault(); document.querySelector("#modules")?.scrollIntoView({ behavior: "smooth" }); }}>Смотреть модули</a>
            <a className="mf-pill" href="#how" onClick={(e) => { e.preventDefault(); document.querySelector("#how")?.scrollIntoView({ behavior: "smooth" }); }}>Как это работает</a>
            <button className="mf-pill mf-pill--outline" onClick={copyEmail}>
              <u>{copied ? "Скопировано" : `Написать нам: ${CONTACT_EMAIL}`}</u>
              <CopyIcon />
            </button>
          </div>
        </div>
      </section>

      {/* ---------- MODULES ---------- */}
      <section id="modules" style={sectionStyle}>
        <div style={{ maxWidth: 640 }}>
          <div className="lbl">Что внутри</div>
          <h2 style={sectionTitleStyle}>Шесть модулей одного отдела</h2>
        </div>
        <div style={modRowStyle}>
          {MODULES.map((m) => (
            <div key={m.t} style={modItemStyle}>
              <b style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 16, color: "#000" }}>{m.t}</b>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", color: "var(--dimmer)", lineHeight: 1.6 }}>{m.d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how" style={sectionStyle}>
        <div style={{ maxWidth: 640 }}>
          <div className="lbl">Как это работает</div>
          <h2 style={sectionTitleStyle}>От регистрации до рабочей системы за один день</h2>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--dim)", fontSize: 15, lineHeight: 1.7, marginTop: 18, maxWidth: "56ch" }}>
            Вы создаёте организацию, описываете её структуру и раздаёте доступы, полностью управляя
            тем, кто что видит.
          </p>
        </div>
        <div style={stepsRowStyle}>
          {STEPS.map((s) => (
            <div key={s.n} style={stepItemStyle}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dimmer)" }}>{s.n}</div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 18, color: "#000", marginTop: 14 }}>{s.t}</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--dim)", lineHeight: 1.6, marginTop: 10 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" style={{ ...sectionStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24, borderBottom: 0 }}>
        <div>
          <div className="lbl">Готовы начать</div>
          <h2 style={{ ...sectionTitleStyle, fontSize: "clamp(24px,2.6vw,36px)" }}>Создайте организацию за две минуты</h2>
        </div>
        <button className="btn btn--solid" onClick={() => navigate("/auth?mode=register")}>Создать организацию</button>
      </section>
    </div>
  );
}

const MODULES = [
  { t: "Склад IT", d: "РАСХОДНИКИ И КОМПЛЕКТУЮЩИЕ" },
  { t: "Картриджи", d: "УЧЁТ И ИСТОРИЯ ЗАПРАВОК" },
  { t: "Оборудование", d: "ФИЛИАЛ · ЭТАЖ · КАБИНЕТ" },
  { t: "Задачи", d: "ЗАЯВКИ И ИНЦИДЕНТЫ" },
  { t: "Мессенджер", d: "ВНУТРЕННИЙ ЧАТ ОТДЕЛА" },
  { t: "Доступы", d: "ЗАЩИЩЁННОЕ ХРАНИЛИЩЕ" },
];
const STEPS = [
  { n: "01", t: "Регистрируете организацию", d: "Один администратор создаёт компанию и получает полный доступ ко всем модулям." },
  { n: "02", t: "Настраиваете структуру", d: "Добавляете филиалы, этажи и кабинеты — под них привязывается техника и расходники." },
  { n: "03", t: "Создаёте сотрудников", d: "Каждому — логин и сгенерированный пароль, а также свой набор доступных модулей." },
  { n: "04", t: "Работаете в одном месте", d: "Склад, картриджи, оборудование, задачи, чат и защищённые доступы — без Excel и разрозненных чатов." },
];

const sectionStyle = { position: "relative", zIndex: 1, background: "#fff", padding: "clamp(64px,8vw,110px) clamp(20px,5vw,90px)", borderBottom: "1px solid var(--line)" };
const sectionTitleStyle = { fontFamily: "var(--font-heading)", fontWeight: 500, color: "#000", fontSize: "clamp(28px,3.2vw,46px)", marginTop: 14, lineHeight: 1.1, letterSpacing: "-0.01em" };
const modRowStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 1, marginTop: 44, background: "var(--line)" };
const modItemStyle = { background: "#fff", padding: "22px 20px", display: "flex", flexDirection: "column", gap: 10 };
const stepsRowStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 30, marginTop: 48 };
const stepItemStyle = { borderTop: "1px solid var(--line)", paddingTop: 22 };
