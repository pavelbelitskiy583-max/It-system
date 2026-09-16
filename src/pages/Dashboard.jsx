import React from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

export default function Dashboard() {
  const { data, branchName } = useData();
  const { org, can } = useAuth();
  const navigate = useNavigate();
  if (!data) return null;

  const { equipment, cartridges, tasks, warehouse, branches } = data;
  const lowCarts = cartridges.filter((c) => branches.some((b) => (c.stock[b.id] || 0) < (c.min || 0)));
  const pendingReturns = cartridges.flatMap((c) => c.history.filter((h) => h.type === "returned" && !h.confirmed).map((h) => ({ ...h, model: c.model, cartId: c.id })));
  const openTasks = tasks.filter((t) => t.status !== "done");
  const inRepair = equipment.filter((e) => e.status === "repair");

  const stats = [
    { n: equipment.length, k: "Единиц техники", d: inRepair.length + " в ремонте", to: "/app/equipment", perm: "equipment" },
    { n: openTasks.length, k: "Открытых задач", d: tasks.filter((t) => t.status === "new").length + " новых", to: "/app/tasks", perm: "tasks" },
    { n: lowCarts.length, k: "Картриджей на исходе", d: "ниже минимума", to: "/app/cartridges", perm: "cartridges" },
    { n: warehouse.reduce((s, w) => s + w.qty, 0), k: "Позиций на складе", d: warehouse.length + " наименований", to: "/app/warehouse", perm: "warehouse" },
  ];

  return (
    <>
      <PageHeader title="Обзор" crumb="Сводка по организации" meta={`${branches.length} филиал(ов) · ${equipment.length} ед. техники`} />
      <div className="content">
        {branches.length === 0 && (
          <div className="warnbar">
            В организации ещё нет ни одного филиала. Перейдите в «Настройки → Филиалы», чтобы добавить филиалы, этажи и кабинеты — это нужно для учёта оборудования и картриджей.
          </div>
        )}
        <div className="stats">
          {stats.map((s) => (
            <button className="stat" key={s.k} onClick={() => can(s.perm) && navigate(s.to)} style={{ opacity: can(s.perm) ? 1 : 0.4, cursor: can(s.perm) ? "pointer" : "not-allowed" }}>
              <div className="n">{s.n}</div>
              <div className="k">{s.k}</div>
              <div className="d">{s.d}</div>
            </button>
          ))}
        </div>
        <div className="grid2">
          <div className="block">
            <div className="block__h"><span className="lbl">Задачи в работе</span>
              {can("tasks") && <button className="mono" style={{ fontSize: 11, color: "var(--dim)", letterSpacing: "0.1em" }} onClick={() => navigate("/app/tasks")}>ВСЕ →</button>}</div>
            <div className="block__b">
              {openTasks.slice(0, 6).map((t) => (
                <div className="row" key={t.id}>
                  <span className={"dot dot--" + (t.status === "new" ? "warn" : "ok")} />
                  <div><div className="t">{t.title}</div><div className="m">{branchName(t.branchId)} · {t.assignee}</div></div>
                  <div className="r">{fmtDate(t.date)}</div>
                </div>
              ))}
              {openTasks.length === 0 && <div className="empty">Нет открытых задач</div>}
            </div>
          </div>
          <div className="block">
            <div className="block__h"><span className="lbl">Требуют внимания</span></div>
            <div className="block__b">
              {lowCarts.map((c) => {
                const short = branches.filter((b) => (c.stock[b.id] || 0) < (c.min || 0)).map((b) => b.name);
                return (
                  <div className="row" key={c.id}>
                    <span className="dot dot--crit" />
                    <div><div className="t">{c.model}</div><div className="m">на исходе: {short.join(", ")}</div></div>
                  </div>
                );
              })}
              {pendingReturns.map((h) => (
                <div className="row" key={h.id}>
                  <span className="dot dot--warn" />
                  <div><div className="t">{h.model} — ожидает подтверждения приёмки</div><div className="m">{branchName(h.branchId)} · {h.qty} шт.</div></div>
                </div>
              ))}
              {inRepair.map((e) => (
                <div className="row" key={e.id}>
                  <span className="dot dot--crit" />
                  <div><div className="t">{e.type} — {e.model}</div><div className="m">в ремонте · {branchName(e.branchId)}</div></div>
                </div>
              ))}
              {lowCarts.length === 0 && inRepair.length === 0 && pendingReturns.length === 0 && <div className="empty">Всё в норме</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0");
}
