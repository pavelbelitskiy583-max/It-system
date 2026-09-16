import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useData } from "../context/DataContext";
import PageHeader from "../components/PageHeader";
import { IcPlus, IcTrash } from "../components/Icons";

const CATS = ["Периферия", "Комплектующие", "Кабели", "Питание", "Расходники", "Прочее"];

export default function Warehouse() {
  const { data, branchName, addWarehouseItem, adjustWarehouseItem, removeWarehouseItem } = useData();
  const { showToast } = useOutletContext();
  const [q, setQ] = useState("");
  const [br, setBr] = useState("all");
  const [adding, setAdding] = useState(false);
  const branches = data.branches;
  const [nf, setNf] = useState({ name: "", cat: CATS[0], qty: "", branchId: branches[0]?.id || "" });

  const list = data.warehouse.filter((i) =>
    (br === "all" || i.branchId === br) &&
    (i.name.toLowerCase().includes(q.toLowerCase()) || i.cat.toLowerCase().includes(q.toLowerCase())));

  const add = () => {
    if (!nf.name.trim() || nf.qty === "" || !nf.branchId) return showToast("Заполните все поля позиции");
    addWarehouseItem({ name: nf.name.trim(), cat: nf.cat, qty: parseInt(nf.qty) || 0, unit: "шт", branchId: nf.branchId });
    setNf({ name: "", cat: CATS[0], qty: "", branchId: branches[0]?.id || "" });
    setAdding(false);
    showToast("Позиция добавлена на склад");
  };

  return (
    <>
      <PageHeader title="Склад IT" crumb="Расходники и комплектующие по филиалам" />
      <div className="content">
        {branches.length === 0 ? (
          <div className="empty">Сначала добавьте филиал в разделе «Настройки»</div>
        ) : (
          <>
            <div className="toolbar">
              <div className="search"><input className="field field--box" placeholder="Поиск по складу…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <select className="field field--box" style={{ maxWidth: 220 }} value={br} onChange={(e) => setBr(e.target.value)}>
                <option value="all">Все филиалы</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button className="btn btn--solid btn--sm" onClick={() => setAdding((v) => !v)}><IcPlus /> {adding ? "Отмена" : "Позиция"}</button>
            </div>
            {adding && (
              <div className="addform">
                <div className="ff full"><span className="lbl">Наименование</span><input className="field field--box" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="Напр. Мышь USB Logitech" /></div>
                <div className="ff"><span className="lbl">Категория</span><select className="field field--box" value={nf.cat} onChange={(e) => setNf({ ...nf, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="ff"><span className="lbl">Количество</span><input className="field field--box" type="number" value={nf.qty} onChange={(e) => setNf({ ...nf, qty: e.target.value })} placeholder="0" /></div>
                <div className="ff"><span className="lbl">Филиал</span><select className="field field--box" value={nf.branchId} onChange={(e) => setNf({ ...nf, branchId: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div className="ff"><button className="btn btn--solid" onClick={add}>Добавить</button></div>
              </div>
            )}
            <table className="tbl">
              <thead><tr><th>Наименование</th><th>Категория</th><th>Филиал</th><th style={{ textAlign: "center" }}>На складе</th><th style={{ textAlign: "right" }}>Приём / выдача</th></tr></thead>
              <tbody>
                {list.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td className="mono-cell">{i.cat}</td>
                    <td className="muted">{branchName(i.branchId)}</td>
                    <td style={{ textAlign: "center" }}><span className="num" style={{ color: i.qty === 0 ? "var(--crit)" : "#fff" }}>{i.qty}</span> <span className="muted mono-cell">{i.unit}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div className="qtybox" style={{ justifyContent: "flex-end" }}>
                        <button className="pill" onClick={() => adjustWarehouseItem(i.id, -1)}>−</button>
                        <button className="pill" onClick={() => adjustWarehouseItem(i.id, +1)}>+</button>
                        <button className="pill" onClick={() => removeWarehouseItem(i.id)} title="Удалить"><IcTrash style={{ width: 12, height: 12 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={5}><div className="empty">Ничего не найдено</div></td></tr>}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
