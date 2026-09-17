import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useData } from "../context/DataContext";
import PageHeader from "../components/PageHeader";
import { IcPlus, IcTrash } from "../components/Icons";

const TYPES = ["Ноутбук", "Моноблок", "Системный блок", "Монитор", "МФУ", "Принтер", "Сервер", "Коммутатор", "ИБП", "Телефон", "Прочее"];
const STATUS_LABEL = { work: "В работе", repair: "В ремонте", storage: "На складе" };
const STATUS_DOT = { work: "ok", repair: "crit", storage: "idle" };

export default function Equipment() {
  const { data, branchName, addEquipment, updateEquipment, removeEquipment } = useData();
  const { showToast } = useOutletContext();
  const branches = data.branches;
  const equipment = data.equipment;

  const [sel, setSel] = useState({ branchId: "all", floorId: null, roomId: null });
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const emptyForm = () => ({ type: TYPES[0], model: "", inv: "", branchId: branches[0]?.id || "", floorId: "", roomId: "", userName: "" });
  const [nf, setNf] = useState(emptyForm());

  const branchObj = branches.find((b) => b.id === nf.branchId);
  const floorObj = branchObj?.floors.find((f) => f.id === nf.floorId);

  const tree = useMemo(() => {
    const t = {};
    for (const b of branches) {
      const items = equipment.filter((e) => e.branchId === b.id);
      t[b.id] = { count: items.length };
    }
    return t;
  }, [equipment, branches]);

  const list = equipment.filter((e) => {
    if (sel.branchId !== "all" && e.branchId !== sel.branchId) return false;
    if (sel.floorId && e.floorId !== sel.floorId) return false;
    if (sel.roomId && e.roomId !== sel.roomId) return false;
    const s = q.toLowerCase();
    return !s || e.model.toLowerCase().includes(s) || e.inv.toLowerCase().includes(s) || (e.userName || "").toLowerCase().includes(s) || e.type.toLowerCase().includes(s);
  });

  const roomLabel = (e) => {
    const b = branches.find((x) => x.id === e.branchId);
    const f = b?.floors.find((x) => x.id === e.floorId);
    const r = f?.rooms.find((x) => x.id === e.roomId);
    return { floor: f?.name || "—", room: r?.name || "—" };
  };

  const cycleStatus = (id, current) => {
    const order = ["work", "repair", "storage"];
    const next = order[(order.indexOf(current) + 1) % 3];
    updateEquipment(id, { status: next });
  };

  const add = async () => {
    if (!nf.model.trim() || !nf.inv.trim() || !nf.branchId || !nf.floorId || !nf.roomId) return showToast("Заполните модель, инв. №, филиал, этаж и кабинет");
    try {
      await addEquipment({ ...nf, model: nf.model.trim(), inv: nf.inv.trim(), userName: nf.userName.trim() });
      setNf(emptyForm());
      setAdding(false);
      showToast("Оборудование добавлено");
    } catch (e) {
      showToast(e.message);
    }
  };

  return (
    <>
      <PageHeader title="Оборудование" crumb="Учёт по филиалам, этажам и кабинетам" />
      <div className="content">
        {branches.length === 0 ? (
          <div className="empty">Сначала добавьте филиал, этажи и кабинеты в разделе «Настройки»</div>
        ) : (
          <>
            <div className="toolbar">
              <div className="search"><input className="field field--box" placeholder="Поиск: модель, инв. №, сотрудник…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <button className="btn btn--solid btn--sm" onClick={() => setAdding((v) => !v)}><IcPlus /> {adding ? "Отмена" : "Оборудование"}</button>
            </div>
            {adding && (
              <div className="addform">
                <div className="ff"><span className="lbl">Тип</span><select className="field field--box" value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div className="ff"><span className="lbl">Модель</span><input className="field field--box" value={nf.model} onChange={(e) => setNf({ ...nf, model: e.target.value })} placeholder="HP ProBook 450" /></div>
                <div className="ff"><span className="lbl">Инв. №</span><input className="field field--box" value={nf.inv} onChange={(e) => setNf({ ...nf, inv: e.target.value })} placeholder="ИНВ-000000" /></div>
                <div className="ff"><span className="lbl">Филиал</span>
                  <select className="field field--box" value={nf.branchId} onChange={(e) => setNf({ ...nf, branchId: e.target.value, floorId: "", roomId: "" })}>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="ff"><span className="lbl">Этаж</span>
                  <select className="field field--box" value={nf.floorId} onChange={(e) => setNf({ ...nf, floorId: e.target.value, roomId: "" })}>
                    <option value="">Выберите этаж</option>
                    {branchObj?.floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="ff"><span className="lbl">Кабинет</span>
                  <select className="field field--box" value={nf.roomId} onChange={(e) => setNf({ ...nf, roomId: e.target.value })}>
                    <option value="">Выберите кабинет</option>
                    {floorObj?.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="ff"><span className="lbl">Сотрудник</span><input className="field field--box" value={nf.userName} onChange={(e) => setNf({ ...nf, userName: e.target.value })} placeholder="Фамилия И.О." /></div>
                <div className="ff"><button className="btn btn--solid" onClick={add}>Добавить</button></div>
              </div>
            )}

            <div className="eqwrap">
              <div className="eqtree">
                <button className={"tnode" + (sel.branchId === "all" ? " on" : "")} onClick={() => setSel({ branchId: "all", floorId: null, roomId: null })}>
                  Все филиалы <span className="c">{equipment.length}</span>
                </button>
                {branches.map((b) => (
                  <React.Fragment key={b.id}>
                    <button className={"tnode lvl1" + (sel.branchId === b.id && !sel.floorId ? " on" : "")} onClick={() => setSel({ branchId: b.id, floorId: null, roomId: null })}>
                      {b.name} <span className="c">{tree[b.id]?.count || 0}</span>
                    </button>
                    {sel.branchId === b.id && b.floors.map((f) => (
                      <React.Fragment key={f.id}>
                        <button className={"tnode lvl2" + (sel.floorId === f.id && !sel.roomId ? " on" : "")} onClick={() => setSel({ branchId: b.id, floorId: f.id, roomId: null })}>
                          {f.name} <span className="c">{equipment.filter((e) => e.floorId === f.id).length}</span>
                        </button>
                        {sel.floorId === f.id && f.rooms.map((r) => (
                          <button key={r.id} className={"tnode lvl3" + (sel.roomId === r.id ? " on" : "")} onClick={() => setSel({ branchId: b.id, floorId: f.id, roomId: r.id })}>
                            {r.name} <span className="c">{equipment.filter((e) => e.roomId === r.id).length}</span>
                          </button>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </div>
              <div className="eqlist">
                <table className="tbl">
                  <thead><tr><th>Тип · Модель</th><th>Инв. №</th><th>Расположение</th><th>Сотрудник</th><th>Статус</th><th></th></tr></thead>
                  <tbody>
                    {list.map((e) => {
                      const loc = roomLabel(e);
                      return (
                        <tr key={e.id}>
                          <td><b style={{ fontWeight: 400 }}>{e.type}</b><div className="m mono-cell">{e.model}</div></td>
                          <td className="mono-cell">{e.inv}</td>
                          <td className="muted">{branchName(e.branchId)}<div className="mono-cell">{loc.floor} · {loc.room}</div></td>
                          <td className="muted">{e.userName || "—"}</td>
                          <td>
                            <button onClick={() => cycleStatus(e.id, e.status)} title="Сменить статус" style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.04em", color: "var(--dim)" }}>
                              <span className={"dot dot--" + STATUS_DOT[e.status]} />{STATUS_LABEL[e.status]}
                            </button>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="pill" onClick={() => removeEquipment(e.id)}><IcTrash style={{ width: 12, height: 12 }} /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {list.length === 0 && <tr><td colSpan={6}><div className="empty">Нет оборудования в выборке</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
