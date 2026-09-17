import React, { useEffect, useRef, useState } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { IcSend, IcPlus } from "../components/Icons";

export default function Messenger() {
  const { data, sendMessage, addChannel } = useData();
  const { user, isAdmin } = useAuth();
  const [active, setActive] = useState(data.channels[0]?.id || "general");
  const [text, setText] = useState("");
  const [addingCh, setAddingCh] = useState(false);
  const [chName, setChName] = useState("");
  const bodyRef = useRef(null);

  const list = data.messages[active] || [];
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [active, list.length]);

  const send = async () => {
    if (!text.trim()) return;
    const val = text.trim();
    setText("");
    try {
      await sendMessage(active, { author: user.name, me: true, text: val });
    } catch (e) {
      setText(val);
    }
  };

  const ch = data.channels.find((c) => c.id === active);
  const lastOf = (id) => { const a = data.messages[id]; return a && a.length ? a[a.length - 1].text : "нет сообщений"; };

  return (
    <>
      <PageHeader title="Мессенджер" crumb="Внутренний чат IT-отдела" />
      <div className="content">
        <div className="msg">
          <div className="chlist">
            <div className="chlist__h" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="lbl">Каналы</span>
              {isAdmin && <button onClick={() => setAddingCh((v) => !v)} title="Новый канал"><IcPlus style={{ width: 13, height: 13, color: "var(--dim)" }} /></button>}
            </div>
            {addingCh && (
              <div style={{ padding: 12, borderBottom: "1px solid var(--line)", display: "flex", gap: 8 }}>
                <input className="field field--box" style={{ fontSize: 12 }} placeholder="Название" value={chName} onChange={(e) => setChName(e.target.value)} />
                <button className="btn btn--sm" onClick={async () => { if (!chName.trim()) return; await addChannel(chName, ""); setChName(""); setAddingCh(false); }}>ОК</button>
              </div>
            )}
            {data.channels.map((c) => (
              <button key={c.id} className={"chbtn" + (active === c.id ? " on" : "")} onClick={() => setActive(c.id)}>
                <b>{c.name}</b><span>{lastOf(c.id)}</span>
              </button>
            ))}
          </div>
          <div className="chat">
            <div className="chat__h"><b>{ch?.name}</b><span>{ch?.desc}</span></div>
            <div className="chat__b" ref={bodyRef}>
              {list.map((m) => (
                <div className={"mline" + (m.author === user.name ? " me" : "")} key={m.id}>
                  <div className="head">{m.author} · {m.time}</div>
                  <div className="bub">{m.text}</div>
                </div>
              ))}
              {list.length === 0 && <div className="empty">Сообщений пока нет</div>}
            </div>
            <div className="chat__in">
              <input placeholder="Написать сообщение…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
              <button className="btn btn--solid btn--sm" onClick={send}><IcSend style={{ width: 13, height: 13 }} /> Отправить</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
