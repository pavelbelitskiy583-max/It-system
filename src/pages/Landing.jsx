import React from "react";
import { Link } from "react-router-dom";
import {
  IcBox, IcCartridge, IcServer, IcTask, IcChat, IcVault, IcArrow,
} from "../components/Icons";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4";
const POSTER_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_132328_5f9029c8-218f-4489-82b6-29ff2849920e.png";

const MODULES = [
  { ic: IcBox, t: "Склад IT", d: "РАСХОДНИКИ И КОМПЛЕКТУЮЩИЕ" },
  { ic: IcCartridge, t: "Картриджи", d: "УЧЁТ И ИСТОРИЯ ЗАПРАВОК" },
  { ic: IcServer, t: "Оборудование", d: "ФИЛИАЛ · ЭТАЖ · КАБИНЕТ" },
  { ic: IcTask, t: "Задачи", d: "ЗАЯВКИ И ИНЦИДЕНТЫ" },
  { ic: IcChat, t: "Мессенджер", d: "ВНУТРЕННИЙ ЧАТ ОТДЕЛА" },
  { ic: IcVault, t: "Доступы", d: "ЗАЩИЩЁННОЕ ХРАНИЛИЩЕ" },
];

const STEPS = [
  { n: "01", t: "Регистрируете организацию", d: "Один администратор создаёт компанию в системе и получает полный доступ ко всем модулям." },
  { n: "02", t: "Настраиваете структуру", d: "Добавляете филиалы, этажи и кабинеты — под них будет привязываться техника и расходники." },
  { n: "03", t: "Создаёте сотрудников", d: "Каждому — логин и сгенерированный пароль, а также свой набор доступных модулей." },
  { n: "04", t: "Работаете в одном месте", d: "Склад, картриджи, оборудование, задачи, чат и защищённые доступы — без Excel и разрозненных чатов." },
];

export default function Landing() {
  return (
    <div className="hero">
      <div className="hero__media">
        <video autoPlay muted loop playsInline preload="auto" poster={POSTER_URL}>
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      </div>
      <div className="hero__scrim" />

      <nav className="nav">
        <div className="brand">ECHOIT<small>IT-мастерская</small></div>
        <div className="nav__right">
          <div className="nav__links">
            <a href="#modules">Модули</a>
            <a href="#how">Как это работает</a>
            <a href="#contact">Контакты</a>
          </div>
          <Link className="btn" to="/auth?mode=login">Войти</Link>
        </div>
      </nav>

      <div className="hero__body">
        <div className="hpanel">
          <div className="chip">[ IT-инфраструктура компании ]</div>
          <h1 className="hero__h1">ECHOIT</h1>
          <div className="hero__tag">Ваша IT-мастерская в одном окне</div>
          <p className="hero__lede">
            Склад, оборудование по кабинетам, картриджи по филиалам с историей заправок, задачи,
            внутренний чат и защищённое хранилище доступов. Регистрируете организацию — и выдаёте
            учётки сотрудникам сами.
          </p>
          <div className="hero__cta">
            <Link className="btn btn--solid" to="/auth?mode=register">
              Создать организацию <IcArrow />
            </Link>
            <Link className="btn" to="/auth?mode=login">Войти в аккаунт</Link>
          </div>
        </div>
      </div>

      <div className="hero__foot" id="modules">
        <div className="modrow">
          {MODULES.map((m) => (
            <div className="modrow__i" key={m.t}>
              <m.ic className="ic" />
              <b>{m.t}</b>
              <span>{m.d}</span>
            </div>
          ))}
        </div>
        <div className="legal">Внутренний контур предприятия. Доступ только для сотрудников IT-отдела.</div>
      </div>

      <section className="section" id="how" style={{ position: "static" }}>
        <div className="section__head">
          <div className="lbl section__eyebrow">Как это работает</div>
          <h2 className="section__title">От регистрации до рабочей системы за один день</h2>
          <p className="section__lede">
            ECHOIT не требует настройки серверов и внешних интеграций — вы создаёте организацию,
            описываете её структуру и раздаёте доступы, полностью управляя тем, кто что видит.
          </p>
        </div>
        <div className="howsteps">
          {STEPS.map((s) => (
            <div className="howstep" key={s.n}>
              <div className="n">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="contact" style={{ position: "static", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <div>
          <div className="lbl section__eyebrow">Готовы начать</div>
          <h2 className="section__title" style={{ fontSize: "clamp(26px,2.8vw,40px)" }}>Создайте организацию за две минуты</h2>
        </div>
        <Link className="btn btn--solid" to="/auth?mode=register">Создать организацию <IcArrow /></Link>
      </section>
    </div>
  );
}
