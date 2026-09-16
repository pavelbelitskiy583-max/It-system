import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { IcPlus, IcCheck } from "../components/Icons";

const EVENT_LABEL = { in: "Приход", sent: "Отправлено на заправку", returned: "Принято с заправки" };

export default function Cartridges() {
  const { data, branchName, addCartridgeModel, cartridgeEvent, confirmReturn } = useData();
  const { user } = useAuth();
  const { showToast } = useOutletContext();
  const branches = data.branches;
  const carts = data.cartridges;

  const [addingModel, setAddingModel] = useState(false);
  const [nf, setNf] = useState({ model: "", printer: "", min: 2 });

  const [ev, setEv] = useState(null); // { cartId }
  const [evForm, setEvForm] = useState({ type: "in", branchId: branches[0]?.id || "", qty: 1, note: "" });

  const addModel = () => {
    if (!nf.model.trim()) return showToast("Укажите модель картриджа");
    addCartridgeModel({ model: nf.model.trim(), printer: nf.printer.trim(), min: parseInt(nf.min) || 0 });
    setNf({ model: "", printer: "", min: 2 });
    setAddingModel(false);
    showToast("Модель картриджа добавлена");
  };

  const openEvent = (cartId) => {
    setEv(cartId);
    setEvForm({ type: "in", branchId: branches[0]?.id || "", qty: 1, note: "" });
  };
  const submitEvent = () => {
    if (!evForm.branchId || !evForm.qty) return showToast("Заполните филиал и количество");
    cartridgeEvent(ev, { ...evForm, qty: parseInt(evForm.qty) || 0, author: user.name });
    showToast(EVENT_LABEL[evForm.type] + " зафиксирован(о)");
    setEv(null);
  };

  const lowCount = carts.reduce((s, c) => s + branches.filter((b) => (c.stock[b.id] || 0) < c.min).length, 0);
  const allHistory = carts.flatMap((c) => c.history.map((h) => ({ ...h, model: c.model, cartId: c.id }))).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <PageHeader title="Картриджи" crumb="Учёт по филиалам и история заправок" />
      <div className="content">
        {branches.length === 0 ? (
          <div className="empty">Сначала добавьте филиал в разделе «Настройки»</div>
        ) : (
          <>
            {lowCount > 0 && <div className="warnbar">Внимание: {lowCount} позиц. картриджей ниже минимального остатка — требуется дозаказ.</div>}

            <div className="toolbar">
              <div className="spacer" />
              <button className="btn btn--solid btn--sm" onClick={() => setAddingModel((v) => !v)}><IcPlus /> {addingModel ? "Отмена" : "Модель картриджа"}</button>
            </div>
            {addingModel && (
              <div className="addform">
                <div className="ff"><span className="lbl">Модель картриджа</span><input className="field field--box" value={nf.model} onChange={(e) => setNf({ ...nf, model: e.target.value })} placeholder="HP CF259A" /></div>
                <div className="ff"><span className="lbl">Совместимый принтер</span><input className="field field--box" value={nf.printer} onChange={(e) => setNf({ ...nf, printer: e.target.value })} placeholder="HP LaserJet Pro M404" /></div>
                <div className="ff"><span className="lbl">Мин. остаток на филиал</span><input className="field field--box" type="number" value={nf.min} onChange={(e) => setNf({ ...nf, min: e.target.value })} /></div>
                <div className="ff"><button className="btn btn--solid" onClick={addModel}>Добавить</button></div>
              </div>
            )}

            <table className="tbl">
              <thead>
                <tr>
                  <th>Модель картриджа</th><th>Совместимость</th><th style={{ textAlign: "center" }}>Мин.</th>
                  {branches.map((b) => <th key={b.id} style={{ textAlign: "center" }}>{b.name}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.model}</td>
                    <td className="mono-cell">{c.printer}</td>
                    <td style={{ textAlign: "center" }} className="muted num">{c.min}</td>
                    {branches.map((b) => {
                      const v = c.stock[b.id] || 0; const low = v < c.min;
                      return (
                        <td key={b.id} style={{ textAlign: "center" }}>
                          <span className="v mono-cell" style={{ color: v === 0 ? "var(--crit)" : low ? "var(--warn)" : "#fff", fontSize: 15, fontWeight: 500 }}>{v}</span>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn--sm" onClick={() => openEvent(c.id)}>Движение</button>
                    </td>
                  </tr>
                ))}
                {carts.length === 0 && <tr><td colSpan={4 + branches.length}><div className="empty">Нет добавленных моделей картриджей</div></td></tr>}
              </tbody>
            </table>

            <div className="sectitle">История расходов и заправок</div>
            <table className="tbl">
              <thead><tr><th>Дата</th><th>Модель</th><th>Событие</th><th>Филиал</th><th style={{ textAlign: "center" }}>Кол-во</th><th>Автор</th><th>Статус</th></tr></thead>
              <tbody>
                {allHistory.slice(0, 40).map((h) => (
                  <tr key={h.id}>
                    <td className="mono-cell">{fmtDateTime(h.date)}</td>
                    <td>{h.model}</td>
                    <td className="muted">{EVENT_LABEL[h.type]}{h.note ? " · " + h.note : ""}</td>
                    <td className="muted">{branchName(h.branchId)}</td>
                    <td style={{ textAlign: "center" }} className="num">{h.qty}</td>
                    <td className="mono-cell">{h.author}</td>
                    <td>
                      {h.type === "returned" ? (
                        h.confirmed
                          ? <span className="mono-cell" style={{ color: "var(--ok)" }}><span className="dot dot--ok" />принято</span>
                          : <button className="btn btn--sm" onClick={() => { confirmReturn(h.cartId, h.id); showToast("Приёмка подтверждена"); }}><IcCheck style={{ width: 12, height: 12 }} /> Подтвердить</button>
                      ) : <span className="mono-cell" style={{ color: "var(--dimmer)" }}>—</span>}
                    </td>
                  </tr>
                ))}
                {allHistory.length === 0 && <tr><td colSpan={7}><div className="empty">Событий пока нет</div></td></tr>}
              </tbody>
            </table>
          </>
        )}
      </div>

      {ev && (
        <div className="modal-wrap" onClick={() => setEv(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Движение картриджа</h3>
            <div className="sub">{carts.find((c) => c.id === ev)?.model}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 26 }}>
              <div className="ff"><span className="lbl">Тип события</span>
                <select className="field field--box" value={evForm.type} onChange={(e) => setEvForm({ ...evForm, type: e.target.value })}>
                  <option value="in">Приход (закупка)</option>
                  <option value="sent">Отправлено на заправку</option>
                  <option value="returned">Принято с заправки (требует подтверждения)</option>
                </select>
              </div>
              <div className="ff"><span className="lbl">Филиал</span>
                <select className="field field--box" value={evForm.branchId} onChange={(e) => setEvForm({ ...evForm, branchId: e.target.value })}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="ff"><span className="lbl">Количество</span><input className="field field--box" type="number" min="1" value={evForm.qty} onChange={(e) => setEvForm({ ...evForm, qty: e.target.value })} /></div>
              <div className="ff"><span className="lbl">Комментарий</span><input className="field field--box" value={evForm.note} onChange={(e) => setEvForm({ ...evForm, note: e.target.value })} placeholder="Необязательно" /></div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => setEv(null)}>Отмена</button>
                <button className="btn btn--solid" style={{ flex: 1 }} onClick={submitEvent}>Записать</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
