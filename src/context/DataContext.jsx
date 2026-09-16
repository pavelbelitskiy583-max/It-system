import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { lsGet, lsSet } from "../lib/storage";
import { makeId } from "../lib/id";
import { useAuth } from "./AuthContext";
import { newVaultSalt, makeVaultCanary, vaultEncrypt, vaultDecrypt, vaultCanaryCheck } from "../lib/crypto";

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const { org } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!org) { setData(null); return; }
    setData(lsGet(`data:${org.id}`));
  }, [org?.id]); // eslint-disable-line

  const save = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (org) lsSet(`data:${org.id}`, next);
      return next;
    });
  }, [org]);

  /* ================= ФИЛИАЛЫ / ЭТАЖИ / КАБИНЕТЫ ================= */
  const addBranch = (name, city) => save((d) => ({
    ...d, branches: [...d.branches, { id: makeId("br"), name: name.trim(), city: city?.trim() || "", floors: [] }],
  }));
  const removeBranch = (branchId) => save((d) => ({ ...d, branches: d.branches.filter((b) => b.id !== branchId) }));
  const addFloor = (branchId, name) => save((d) => ({
    ...d,
    branches: d.branches.map((b) => b.id === branchId
      ? { ...b, floors: [...b.floors, { id: makeId("fl"), name: name.trim(), rooms: [] }] }
      : b),
  }));
  const removeFloor = (branchId, floorId) => save((d) => ({
    ...d, branches: d.branches.map((b) => b.id === branchId ? { ...b, floors: b.floors.filter((f) => f.id !== floorId) } : b),
  }));
  const addRoom = (branchId, floorId, name) => save((d) => ({
    ...d,
    branches: d.branches.map((b) => b.id !== branchId ? b : {
      ...b,
      floors: b.floors.map((f) => f.id === floorId ? { ...f, rooms: [...f.rooms, { id: makeId("rm"), name: name.trim() }] } : f),
    }),
  }));
  const removeRoom = (branchId, floorId, roomId) => save((d) => ({
    ...d,
    branches: d.branches.map((b) => b.id !== branchId ? b : {
      ...b,
      floors: b.floors.map((f) => f.id !== floorId ? f : { ...f, rooms: f.rooms.filter((r) => r.id !== roomId) }),
    }),
  }));

  const branchName = (id) => data?.branches.find((b) => b.id === id)?.name || "—";

  /* ================= СКЛАД IT ================= */
  const addWarehouseItem = (item) => save((d) => ({ ...d, warehouse: [{ id: makeId("wh"), ...item }, ...d.warehouse] }));
  const adjustWarehouseItem = (id, delta) => save((d) => ({
    ...d, warehouse: d.warehouse.map((w) => w.id === id ? { ...w, qty: Math.max(0, w.qty + delta) } : w),
  }));
  const removeWarehouseItem = (id) => save((d) => ({ ...d, warehouse: d.warehouse.filter((w) => w.id !== id) }));

  /* ================= КАРТРИДЖИ + ИСТОРИЯ ================= */
  const addCartridgeModel = (item) => save((d) => ({
    ...d, cartridges: [{ id: makeId("ct"), stock: {}, history: [], ...item }, ...d.cartridges],
  }));
  const removeCartridgeModel = (id) => save((d) => ({ ...d, cartridges: d.cartridges.filter((c) => c.id !== id) }));

  const cartridgeEvent = (cartId, { type, branchId, qty, note, author }) => save((d) => ({
    ...d,
    cartridges: d.cartridges.map((c) => {
      if (c.id !== cartId) return c;
      const stock = { ...c.stock };
      const cur = stock[branchId] || 0;
      if (type === "in") stock[branchId] = cur + qty;
      if (type === "sent") stock[branchId] = Math.max(0, cur - qty); // отправлено на заправку — уходит с остатка
      // "returned" не меняет остаток сразу — ждём подтверждения (confirmed=false)
      const entry = {
        id: makeId("ev"), type, branchId, qty, note: note || "",
        date: new Date().toISOString(), author: author || "—",
        confirmed: type === "returned" ? false : true,
      };
      return { ...c, stock, history: [entry, ...c.history] };
    }),
  }));

  const confirmReturn = (cartId, eventId) => save((d) => ({
    ...d,
    cartridges: d.cartridges.map((c) => {
      if (c.id !== cartId) return c;
      const ev = c.history.find((h) => h.id === eventId);
      if (!ev || ev.confirmed) return c;
      const stock = { ...c.stock };
      stock[ev.branchId] = (stock[ev.branchId] || 0) + ev.qty;
      return {
        ...c, stock,
        history: c.history.map((h) => h.id === eventId ? { ...h, confirmed: true } : h),
      };
    }),
  }));

  /* ================= ОБОРУДОВАНИЕ ================= */
  const addEquipment = (item) => save((d) => ({ ...d, equipment: [{ id: makeId("eq"), status: "work", ...item }, ...d.equipment] }));
  const updateEquipment = (id, patch) => save((d) => ({ ...d, equipment: d.equipment.map((e) => e.id === id ? { ...e, ...patch } : e) }));
  const removeEquipment = (id) => save((d) => ({ ...d, equipment: d.equipment.filter((e) => e.id !== id) }));

  /* ================= ЗАДАЧИ ================= */
  const addTask = (task) => save((d) => ({ ...d, tasks: [{ id: makeId("tk"), status: "new", ...task }, ...d.tasks] }));
  const updateTask = (id, patch) => save((d) => ({ ...d, tasks: d.tasks.map((t) => t.id === id ? { ...t, ...patch } : t) }));
  const removeTask = (id) => save((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));

  /* ================= МЕССЕНДЖЕР ================= */
  const addChannel = (name, desc, branchId = null) => save((d) => {
    const id = makeId("ch");
    return {
      ...d,
      channels: [...d.channels, { id, name: name.startsWith("#") ? name : `# ${name}`, desc, branchId }],
      messages: { ...d.messages, [id]: [] },
    };
  });
  const sendMessage = (channelId, message) => save((d) => ({
    ...d,
    messages: { ...d.messages, [channelId]: [...(d.messages[channelId] || []), { id: makeId("msg"), ...message, time: nowTime() }] },
  }));

  /* ================= ДОСТУПЫ (сейф) ================= */
  const vaultInitialized = !!data?.vault;

  const setupVault = async (passphrase) => {
    const salt = newVaultSalt();
    const canary = await makeVaultCanary(passphrase, salt);
    save((d) => ({ ...d, vault: { salt, canary, credentials: [] } }));
  };

  const unlockVault = async (passphrase) => {
    if (!data?.vault) return false;
    return vaultCanaryCheck(passphrase, data.vault.salt, data.vault.canary);
  };

  const addCredential = async (passphrase, { title, login, password, url, note, visibleTo }) => {
    const salt = data.vault.salt;
    const passEnc = await vaultEncrypt(passphrase, salt, password || "");
    save((d) => ({
      ...d,
      vault: {
        ...d.vault,
        credentials: [{ id: makeId("cr"), title, login, url, note, visibleTo: visibleTo || [], passEnc }, ...d.vault.credentials],
      },
    }));
  };

  const revealCredential = async (passphrase, credId) => {
    const cred = data.vault.credentials.find((c) => c.id === credId);
    if (!cred) return "";
    return vaultDecrypt(passphrase, data.vault.salt, cred.passEnc);
  };

  const removeCredential = (credId) => save((d) => ({
    ...d, vault: { ...d.vault, credentials: d.vault.credentials.filter((c) => c.id !== credId) },
  }));

  const updateCredentialVisibility = (credId, visibleTo) => save((d) => ({
    ...d, vault: { ...d.vault, credentials: d.vault.credentials.map((c) => c.id === credId ? { ...c, visibleTo } : c) },
  }));

  const value = {
    data, branchName,
    addBranch, removeBranch, addFloor, removeFloor, addRoom, removeRoom,
    addWarehouseItem, adjustWarehouseItem, removeWarehouseItem,
    addCartridgeModel, removeCartridgeModel, cartridgeEvent, confirmReturn,
    addEquipment, updateEquipment, removeEquipment,
    addTask, updateTask, removeTask,
    addChannel, sendMessage,
    vaultInitialized, setupVault, unlockVault, addCredential, revealCredential, removeCredential, updateCredentialVisibility,
  };

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData должен использоваться внутри DataProvider");
  return ctx;
}

function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
