import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { IcVault, IcPlus, IcEye, IcEyeOff, IcCopy, IcTrash } from "../components/Icons";

export default function Vault() {
  const { data, vaultInitialized, setupVault, unlockVault, addCredential, revealCredential, removeCredential, updateCredentialVisibility } = useData();
  const { user, isAdmin, listEmployees } = useAuth();
  const { showToast } = useOutletContext();

  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwInput2, setPwInput2] = useState("");
  const [err, setErr] = useState("");

  const [revealed, setRevealed] = useState({});
  const [adding, setAdding] = useState(false);
  const employees = listEmployees();
  const [nf, setNf] = useState({ title: "", login: "", password: "", url: "", note: "", visibleTo: [user.id] });

  const canSeeCred = (cred) => isAdmin || cred.visibleTo?.includes(user.id);
  const visibleCreds = (data.vault?.credentials || []).filter(canSeeCred);

  /* ---------- первичная настройка сейфа (только админ) ---------- */
  const doSetup = async () => {
    setErr("");
    if (pwInput.length < 6) return setErr("Код доступа должен быть не короче 6 символов");
    if (pwInput !== pwInput2) return setErr("Коды не совпадают");
    await setupVault(pwInput);
    setPassphrase(pwInput);
    setUnlocked(true);
    showToast("Сейф создан и разблокирован");
  };

  const doUnlock = async () => {
    setErr("");
    const ok = await unlockVault(pwInput);
    if (!ok) return setErr("Неверный код доступа");
    setPassphrase(pwInput);
    setUnlocked(true);
  };

  const toggleReveal = async (credId) => {
    if (revealed[credId]) { setRevealed((r) => ({ ...r, [credId]: undefined })); return; }
    const val = await revealCredential(passphrase, credId);
    setRevealed((r) => ({ ...r, [credId]: val }));
  };

  const copy = async (credId) => {
    let val = revealed[credId];
    if (!val) val = await revealCredential(passphrase, credId);
    try { await navigator.clipboard.writeText(val); } catch {}
    showToast("Пароль скопирован");
  };

  const add = async () => {
    if (!nf.title.trim() || !nf.login.trim()) return showToast("Заполните название и логин");
    await addCredential(passphrase, nf);
    setNf({ title: "", login: "", password: "", url: "", note: "", visibleTo: [user.id] });
    setAdding(false);
    showToast("Доступ сохранён");
  };

  const toggleVisibility = (credId, empId, checked) => {
    const cred = data.vault.credentials.find((c) => c.id === credId);
    const cur = new Set(cred.visibleTo || []);
    checked ? cur.add(empId) : cur.delete(empId);
    updateCredentialVisibility(credId, Array.from(cur));
  };

  return (
    <>
      <PageHeader title="Доступы" crumb="Защищённое хранилище паролей и конфигураций" />
      <div className="content">
        {!vaultInitialized ? (
          isAdmin ? (
            <div className="vault-lock">
              <div className="ic"><IcVault /></div>
              <h2>Создание сейфа</h2>
              <p>Сейф ещё не создан. Задайте код доступа — он потребуется каждый раз при открытии раздела.<br />Данные шифруются на устройстве (AES-256).</p>
              <div className="st">
                <input className="field" type="password" placeholder="Код доступа" value={pwInput} onChange={(e) => setPwInput(e.target.value)} />
                <input className="field" type="password" placeholder="Повторите код доступа" value={pwInput2} onChange={(e) => setPwInput2(e.target.value)} />
                <div className="auth__err" style={{ marginTop: -10 }}>{err}</div>
                <button className="btn btn--solid" style={{ width: "100%", padding: 17 }} onClick={doSetup}>Создать сейф</button>
              </div>
            </div>
          ) : (
            <div className="empty" style={{ padding: "100px 20px" }}>Сейф ещё не настроен администратором</div>
          )
        ) : !unlocked ? (
          <div className="vault-lock">
            <div className="ic"><IcVault /></div>
            <h2>Защищённое хранилище</h2>
            <p>Раздел закрыт кодом доступа.<br />Введите его, чтобы просмотреть учётные данные.</p>
            <div className="st">
              <input className="field" type="password" placeholder="Код доступа" value={pwInput} autoFocus onChange={(e) => { setPwInput(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && doUnlock()} />
              <div className="auth__err" style={{ marginTop: -12 }}>{err}</div>
              <button className="btn btn--solid" style={{ width: "100%", padding: 17 }} onClick={doUnlock}>Разблокировать</button>
            </div>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <div className="warnbar" style={{ margin: 0, flex: 1, minWidth: 220 }}>Код доступа действует только в этой сессии. Не передавайте пароли по внешним каналам.</div>
              <button className="btn btn--sm" onClick={() => { setUnlocked(false); setPwInput(""); setRevealed({}); }}>Закрыть раздел</button>
              {isAdmin && <button className="btn btn--solid btn--sm" onClick={() => setAdding((v) => !v)}><IcPlus /> {adding ? "Отмена" : "Доступ"}</button>}
            </div>

            {adding && (
              <div className="addform">
                <div className="ff full"><span className="lbl">Название</span><input className="field field--box" value={nf.title} onChange={(e) => setNf({ ...nf, title: e.target.value })} placeholder="Напр. Роутер, филиал Юг" /></div>
                <div className="ff"><span className="lbl">Логин</span><input className="field field--box" value={nf.login} onChange={(e) => setNf({ ...nf, login: e.target.value })} placeholder="admin" /></div>
                <div className="ff"><span className="lbl">Пароль</span><input className="field field--box" value={nf.password} onChange={(e) => setNf({ ...nf, password: e.target.value })} placeholder="••••••••" /></div>
                <div className="ff"><span className="lbl">Адрес / хост</span><input className="field field--box" value={nf.url} onChange={(e) => setNf({ ...nf, url: e.target.value })} placeholder="192.168.1.1" /></div>
                <div className="ff full"><span className="lbl">Примечание</span><input className="field field--box" value={nf.note} onChange={(e) => setNf({ ...nf, note: e.target.value })} placeholder="Комментарий, VPN-конфиг, инструкция" /></div>
                <div className="ff full">
                  <span className="lbl">Кому видно (кроме администратора)</span>
                  <div className="permgrid">
                    {employees.filter((e) => e.id !== user.id).map((e) => (
                      <label key={e.id} className="checkline">
                        <input type="checkbox" checked={nf.visibleTo.includes(e.id)}
                          onChange={(ev) => setNf((f) => ({ ...f, visibleTo: ev.target.checked ? [...f.visibleTo, e.id] : f.visibleTo.filter((x) => x !== e.id) }))} />
                        {e.name}
                      </label>
                    ))}
                    {employees.length <= 1 && <span className="mono" style={{ fontSize: 11, color: "var(--dimmer)" }}>Сотрудников пока нет</span>}
                  </div>
                </div>
                <div className="ff"><button className="btn btn--solid" onClick={add}>Сохранить</button></div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {visibleCreds.map((c) => (
                <div className="cred" key={c.id}>
                  <div>
                    <div className="tt">{c.title}</div>
                    <div className="kv">
                      <div><span className="k">Логин</span><span className="val">{c.login}</span></div>
                      <div><span className="k">Пароль</span><span className="val">{revealed[c.id] ? revealed[c.id] : "••••••••"}</span></div>
                      {c.url && <div><span className="k">Адрес</span><span className="val">{c.url}</span></div>}
                      {c.note && <div><span className="k">Примечание</span><span className="val" style={{ textTransform: "none" }}>{c.note}</span></div>}
                    </div>
                    {isAdmin && employees.length > 1 && (
                      <div className="permgrid" style={{ marginTop: 14 }}>
                        {employees.filter((e) => e.id !== user.id).map((e) => (
                          <label key={e.id} className="checkline">
                            <input type="checkbox" checked={c.visibleTo?.includes(e.id) || false} onChange={(ev) => toggleVisibility(c.id, e.id, ev.target.checked)} />
                            {e.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ops">
                    <button className="btn btn--sm" onClick={() => toggleReveal(c.id)}>{revealed[c.id] ? <IcEyeOff style={{ width: 13, height: 13 }} /> : <IcEye style={{ width: 13, height: 13 }} />}</button>
                    <button className="btn btn--sm" onClick={() => copy(c.id)}><IcCopy style={{ width: 12, height: 12 }} /></button>
                    {isAdmin && <button className="btn btn--sm btn--danger" onClick={() => removeCredential(c.id)}><IcTrash style={{ width: 12, height: 12 }} /></button>}
                  </div>
                </div>
              ))}
              {visibleCreds.length === 0 && <div className="empty">Вам не открыто ни одного доступа</div>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
