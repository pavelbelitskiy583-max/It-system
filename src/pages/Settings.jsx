import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useAuth, ALL_MODULES, emptyPermissions } from "../context/AuthContext";
import { exportOrgJson, importOrgJson } from "../lib/storage";
import PageHeader from "../components/PageHeader";
import { IcPlus, IcTrash, IcRefresh, IcBuilding, IcUsers } from "../components/Icons";

export default function Settings() {
  const [tab, setTab] = useState("branches");
  return (
    <>
      <PageHeader title="Настройки" crumb="Структура организации, сотрудники и данные" />
      <div className="content">
        <div className="toolbar">
          <button className={"btn btn--sm" + (tab === "branches" ? " btn--solid" : "")} onClick={() => setTab("branches")}><IcBuilding style={{ width: 13, height: 13 }} /> Филиалы</button>
          <button className={"btn btn--sm" + (tab === "employees" ? " btn--solid" : "")} onClick={() => setTab("employees")}><IcUsers style={{ width: 13, height: 13 }} /> Сотрудники</button>
          <button className={"btn btn--sm" + (tab === "data" ? " btn--solid" : "")} onClick={() => setTab("data")}>Данные</button>
        </div>
        {tab === "branches" && <BranchesTab />}
        {tab === "employees" && <EmployeesTab />}
        {tab === "data" && <DataTab />}
      </div>
    </>
  );
}

/* ================= ФИЛИАЛЫ / ЭТАЖИ / КАБИНЕТЫ ================= */
function BranchesTab() {
  const { data, addBranch, removeBranch, addFloor, removeFloor, addRoom, removeRoom } = useData();
  const { showToast } = useOutletContext();
  const [nb, setNb] = useState({ name: "", city: "" });
  const [nf, setNf] = useState({});
  const [nr, setNr] = useState({});

  const addBr = () => {
    if (!nb.name.trim()) return showToast("Введите название филиала");
    addBranch(nb.name, nb.city);
    setNb({ name: "", city: "" });
    showToast("Филиал добавлен");
  };

  return (
    <div>
      <div className="addform">
        <div className="ff"><span className="lbl">Название филиала</span><input className="field field--box" value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} placeholder='Напр. Филиал «Север»' /></div>
        <div className="ff"><span className="lbl">Город</span><input className="field field--box" value={nb.city} onChange={(e) => setNb({ ...nb, city: e.target.value })} placeholder="Санкт-Петербург" /></div>
        <div className="ff"><button className="btn btn--solid" onClick={addBr}><IcPlus style={{ width: 12, height: 12 }} /> Добавить филиал</button></div>
      </div>

      {data.branches.length === 0 && <div className="empty">Филиалов пока нет — добавьте первый выше</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {data.branches.map((b) => (
          <div className="block" key={b.id}>
            <div className="block__h">
              <div>
                <b style={{ fontWeight: 300, fontSize: 15 }}>{b.name}</b>
                <span className="lbl" style={{ marginLeft: 10, color: "var(--dim)" }}>{b.city}</span>
              </div>
              <button className="pill" onClick={() => removeBranch(b.id)}><IcTrash style={{ width: 12, height: 12 }} /></button>
            </div>
            <div className="block__b" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input className="field field--box" style={{ maxWidth: 260 }} placeholder="Название этажа, напр. 2 этаж"
                  value={nf[b.id] || ""} onChange={(e) => setNf({ ...nf, [b.id]: e.target.value })} />
                <button className="btn btn--sm" onClick={() => { if (!nf[b.id]?.trim()) return; addFloor(b.id, nf[b.id]); setNf({ ...nf, [b.id]: "" }); }}>+ Этаж</button>
              </div>
              {b.floors.length === 0 && <div className="mono" style={{ fontSize: 11, color: "var(--dimmer)", marginBottom: 10 }}>Этажей пока нет</div>}
              {b.floors.map((f) => (
                <div key={f.id} style={{ borderLeft: "1px solid var(--line)", paddingLeft: 16, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 300, fontSize: 14 }}>{f.name}</span>
                    <button className="pill" style={{ width: 20, height: 20 }} onClick={() => removeFloor(b.id, f.id)}><IcTrash style={{ width: 10, height: 10 }} /></button>
                  </div>
                  <div style={{ display: "flex", gap: 10, margin: "10px 0" }}>
                    <input className="field field--box" style={{ maxWidth: 220 }} placeholder="Кабинет, напр. Каб. 204"
                      value={nr[f.id] || ""} onChange={(e) => setNr({ ...nr, [f.id]: e.target.value })} />
                    <button className="btn btn--sm" onClick={() => { if (!nr[f.id]?.trim()) return; addRoom(b.id, f.id, nr[f.id]); setNr({ ...nr, [f.id]: "" }); }}>+ Кабинет</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {f.rooms.map((r) => (
                      <span key={r.id} className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", border: "1px solid var(--line)", padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {r.name}
                        <button onClick={() => removeRoom(b.id, f.id, r.id)} style={{ color: "var(--dimmer)" }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= СОТРУДНИКИ ================= */
function EmployeesTab() {
  const { user, createEmployee, updateEmployee, removeEmployee, regeneratePassword, listEmployees } = useAuth();
  const { data } = useData();
  const { showToast } = useOutletContext();
  const employees = listEmployees();

  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({ name: "", login: "", branchId: "", permissions: emptyPermissions() });
  const [genInfo, setGenInfo] = useState(null); // { login, password }

  const submit = async () => {
    if (!nf.name.trim() || !nf.login.trim()) return showToast("Укажите имя и логин");
    try {
      const { user: u, password } = await createEmployee(nf);
      setGenInfo({ login: u.login, password });
      setNf({ name: "", login: "", branchId: "", permissions: emptyPermissions() });
      setAdding(false);
    } catch (e) {
      showToast(e.message);
    }
  };

  const togglePerm = (moduleId, checked) => setNf((f) => ({ ...f, permissions: { ...f.permissions, [moduleId]: checked } }));

  const regen = async (id) => {
    const password = await regeneratePassword(id);
    const emp = employees.find((e) => e.id === id);
    setGenInfo({ login: emp.login, password });
    showToast("Новый пароль сгенерирован");
  };

  return (
    <div>
      {genInfo && (
        <div className="warnbar" style={{ borderColor: "rgba(107,208,138,0.3)", background: "rgba(107,208,138,0.05)", color: "var(--ok)" }}>
          Учётная запись готова. Логин: <b>{genInfo.login}</b> · Пароль: <b>{genInfo.password}</b><br />
          Сообщите эти данные сотруднику лично — после первого входа система предложит сменить пароль.
          <button className="mono" style={{ marginLeft: 14, color: "var(--dim)", textDecoration: "underline" }} onClick={() => setGenInfo(null)}>Скрыть</button>
        </div>
      )}

      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn--solid btn--sm" onClick={() => setAdding((v) => !v)}><IcPlus style={{ width: 12, height: 12 }} /> {adding ? "Отмена" : "Сотрудник"}</button>
      </div>

      {adding && (
        <div className="addform">
          <div className="ff"><span className="lbl">Имя сотрудника</span><input className="field field--box" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="Иванов Иван" /></div>
          <div className="ff"><span className="lbl">Логин</span><input className="field field--box" value={nf.login} onChange={(e) => setNf({ ...nf, login: e.target.value })} placeholder="ivanov" /></div>
          <div className="ff"><span className="lbl">Филиал (необязательно)</span>
            <select className="field field--box" value={nf.branchId} onChange={(e) => setNf({ ...nf, branchId: e.target.value })}>
              <option value="">Не привязан</option>
              {data.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="ff full">
            <span className="lbl">Доступные модули</span>
            <div className="permgrid">
              {ALL_MODULES.filter((m) => m.id !== "settings").map((m) => (
                <label key={m.id} className="checkline">
                  <input type="checkbox" checked={nf.permissions[m.id]} onChange={(e) => togglePerm(m.id, e.target.checked)} />
                  {m.name}
                </label>
              ))}
            </div>
          </div>
          <div className="ff"><button className="btn btn--solid" onClick={submit}>Создать и выдать пароль</button></div>
        </div>
      )}

      <table className="tbl">
        <thead><tr><th>Сотрудник</th><th>Логин</th><th>Роль</th><th>Модули</th><th></th></tr></thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td className="mono-cell">{e.login}</td>
              <td className="muted">{e.role === "admin" ? "Администратор" : "Сотрудник"}</td>
              <td className="mono-cell">
                {e.role === "admin" ? "Полный доступ" : (ALL_MODULES.filter((m) => e.permissions?.[m.id]).map((m) => m.name).join(", ") || "—")}
              </td>
              <td style={{ textAlign: "right" }}>
                {e.id !== user.id && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn btn--sm" onClick={() => regen(e.id)}><IcRefresh style={{ width: 11, height: 11 }} /> Пароль</button>
                    <button className="btn btn--sm btn--danger" onClick={() => removeEmployee(e.id)}><IcTrash style={{ width: 11, height: 11 }} /></button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {employees.filter((e) => e.role !== "admin").length > 0 && (
        <>
          <div className="sectitle">Права по модулям</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {employees.filter((e) => e.role !== "admin").map((e) => (
              <div className="block" key={e.id}>
                <div className="block__h"><b style={{ fontWeight: 300, fontSize: 14 }}>{e.name}</b><span className="lbl">{e.login}</span></div>
                <div style={{ padding: "16px 20px" }}>
                  <div className="permgrid">
                    {ALL_MODULES.filter((m) => m.id !== "settings").map((m) => (
                      <label key={m.id} className="checkline">
                        <input type="checkbox" checked={!!e.permissions?.[m.id]}
                          onChange={(ev) => updateEmployee(e.id, { permissions: { ...e.permissions, [m.id]: ev.target.checked } })} />
                        {m.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= ДАННЫЕ (экспорт/импорт) ================= */
function DataTab() {
  const { org } = useAuth();
  const { showToast } = useOutletContext();
  return (
    <div className="block" style={{ maxWidth: 560 }}>
      <div className="block__h"><span className="lbl">Резервная копия</span></div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <p className="mono" style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.7 }}>
          Все данные организации хранятся локально в этом браузере. Экспортируйте резервную копию в JSON,
          чтобы перенести её на другое устройство или сохранить на случай очистки браузера.
        </p>
        <button className="btn btn--solid" onClick={() => { exportOrgJson(org.id); showToast("Файл экспортирован"); }}>Скачать резервную копию (.json)</button>
        <label className="btn" style={{ textAlign: "center", cursor: "pointer" }}>
          Импортировать резервную копию
          <input type="file" accept="application/json" style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { await importOrgJson(f); showToast("Импортировано. Перезагрузите страницу и войдите заново."); }
              catch { showToast("Не удалось прочитать файл"); }
            }} />
        </label>
      </div>
    </div>
  );
}
