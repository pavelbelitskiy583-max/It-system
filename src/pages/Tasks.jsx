import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { IcPlus, IcTrash } from "../components/Icons";

const COLS = [{ id: "new", t: "Новые" }, { id: "work", t: "В работе" }, { id: "done", t: "Выполнено" }];
const PRIO_LABEL = { hi: "Высокий", md: "Средний", lo: "Низкий" };

export default function Tasks() {
  const { data, branchName, addTask, updateTask, removeTask } = useData();
  const { user, listEmployees } = useAuth();
  const { showToast } = useOutletContext();
  const branches = data.branches;
  const employees = listEmployees();

  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({ title: "", branchId: branches[0]?.id || "", prio: "md", assignee: user.name });

  const move = (id, status, dir) => {
    const order = ["new", "work", "done"];
    const i = Math.min(2, Math.max(0, order.indexOf(status) + dir));
    updateTask(id, { status: order[i] });
  };

  const add = () => {
    if (!nf.title.trim()) return showToast("Введите название задачи");
    addTask({ title: nf.title.trim(), branchId: nf.branchId, prio: nf.prio, assignee: nf.assignee.trim() || user.name, date: new Date().toISOString(), createdBy: user.name });
    setNf({ title: "", branchId: branches[0]?.id || "", prio: "md", assignee: user.name });
    setAdding(false);
    showToast("Задача создана");
  };

  return (
    <>
      <PageHeader title="Задачи" crumb="Заявки и инциденты по всем филиалам" />
      <div className="content">
        <div className="toolbar">
          <div className="spacer" />
          <button className="btn btn--solid btn--sm" onClick={() => setAdding((v) => !v)}><IcPlus /> {adding ? "Отмена" : "Новая задача"}</button>
        </div>
        {adding && (
          <div className="addform">
            <div className="ff full"><span className="lbl">Что нужно сделать</span><input className="field field--box" value={nf.title} onChange={(e) => setNf({ ...nf, title: e.target.value })} placeholder="Напр. Не печатает МФУ в каб. 110" /></div>
            <div className="ff"><span className="lbl">Филиал</span>
              <select className="field field--box" value={nf.branchId} onChange={(e) => setNf({ ...nf, branchId: e.target.value })}>
                {branches.length === 0 && <option value="">—</option>}
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="ff"><span className="lbl">Приоритет</span>
              <select className="field field--box" value={nf.prio} onChange={(e) => setNf({ ...nf, prio: e.target.value })}>
                <option value="hi">Высокий</option><option value="md">Средний</option><option value="lo">Низкий</option>
              </select>
            </div>
            <div className="ff"><span className="lbl">Исполнитель</span>
              <select className="field field--box" value={nf.assignee} onChange={(e) => setNf({ ...nf, assignee: e.target.value })}>
                {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
            <div className="ff"><button className="btn btn--solid" onClick={add}>Создать</button></div>
          </div>
        )}
        <div className="kb">
          {COLS.map((col) => {
            const items = data.tasks.filter((t) => t.status === col.id);
            return (
              <div className="kbcol" key={col.id}>
                <div className="kbcol__h"><span className="lbl">{col.t}</span><span className="c">{items.length}</span></div>
                <div className="kbcol__b">
                  {items.map((t) => (
                    <div className="tcard" key={t.id}>
                      <div className="tt">{t.title}</div>
                      <div className="meta">
                        <span className={"prio prio--" + t.prio}>{PRIO_LABEL[t.prio]}</span>
                        <span>{branchName(t.branchId)}</span>
                      </div>
                      <div className="meta"><span>◷ {fmtDate(t.date)}</span><span>◇ {t.assignee}</span></div>
                      <div className="actions">
                        {col.id !== "new" && <button onClick={() => move(t.id, t.status, -1)}>← назад</button>}
                        {col.id !== "done" && <button onClick={() => move(t.id, t.status, +1)}>вперёд →</button>}
                        <button onClick={() => removeTask(t.id)}><IcTrash style={{ width: 11, height: 11 }} /></button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="empty" style={{ padding: "30px 10px" }}>Пусто</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0");
}
