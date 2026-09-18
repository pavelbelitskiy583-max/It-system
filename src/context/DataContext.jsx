import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { newVaultSalt, makeVaultCanary, vaultEncrypt, vaultDecrypt, vaultCanaryCheck } from "../lib/crypto";

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const { org, user, ready } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!org || !user) { setData(null); return; }
    setLoading(true);
    setError("");
    try {
      const state = await api.get("/state");
      setData(state);
    } catch (e) {
      setError(e.message || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [org?.id, user?.id]); // eslint-disable-line

  useEffect(() => {
    if (!ready) return;
    if (org && user) refresh();
    else { setData(null); setError(""); }
  }, [ready, org?.id, user?.id]); // eslint-disable-line

  const branchName = (id) => data?.branches.find((b) => b.id === id)?.name || "—";

  /* ================= ФИЛИАЛЫ / ЭТАЖИ / КАБИНЕТЫ ================= */
  const addBranch = async (name, city) => { await api.post("/branches", { action: "create", name, city }); await refresh(); };
  const removeBranch = async (branchId) => { await api.post("/branches", { action: "delete", id: branchId }); await refresh(); };
  const addFloor = async (branchId, name) => { await api.post("/branches", { action: "add-floor", branchId, name }); await refresh(); };
  const removeFloor = async (branchId, floorId) => { await api.post("/branches", { action: "delete-floor", floorId }); await refresh(); };
  const addRoom = async (branchId, floorId, name) => { await api.post("/branches", { action: "add-room", floorId, name }); await refresh(); };
  const removeRoom = async (branchId, floorId, roomId) => { await api.post("/branches", { action: "delete-room", roomId }); await refresh(); };

  /* ================= СКЛАД IT ================= */
  const addWarehouseItem = async (item) => { await api.post("/warehouse", { action: "create", ...item }); await refresh(); };
  const adjustWarehouseItem = async (id, delta) => { await api.post("/warehouse", { action: "adjust", id, delta }); await refresh(); };
  const removeWarehouseItem = async (id) => { await api.post("/warehouse", { action: "delete", id }); await refresh(); };

  /* ================= КАРТРИДЖИ + ИСТОРИЯ ================= */
  const addCartridgeModel = async (item) => { await api.post("/cartridges", { action: "create", ...item }); await refresh(); };
  const removeCartridgeModel = async (id) => { await api.post("/cartridges", { action: "delete", id }); await refresh(); };
  const cartridgeEvent = async (cartId, { type, branchId, qty, note }) => {
    await api.post("/cartridges", { action: "event", cartId, type, branchId, qty, note });
    await refresh();
  };
  const confirmReturn = async (cartId, eventId) => {
    await api.post("/cartridges", { action: "confirm", cartId, eventId });
    await refresh();
  };

  /* ================= ОБОРУДОВАНИЕ ================= */
  const addEquipment = async (item) => { await api.post("/equipment", { action: "create", ...item }); await refresh(); };
  const updateEquipment = async (id, patch) => { await api.post("/equipment", { action: "update", id, ...patch }); await refresh(); };
  const removeEquipment = async (id) => { await api.post("/equipment", { action: "delete", id }); await refresh(); };

  /* ================= ЗАДАЧИ ================= */
  const addTask = async (task) => { await api.post("/tasks", { action: "create", ...task }); await refresh(); };
  const updateTask = async (id, patch) => { await api.post("/tasks", { action: "update", id, ...patch }); await refresh(); };
  const removeTask = async (id) => { await api.post("/tasks", { action: "delete", id }); await refresh(); };

  /* ================= МЕССЕНДЖЕР ================= */
  const addChannel = async (name, desc) => { await api.post("/channels", { action: "create-channel", name, desc }); await refresh(); };
  const sendMessage = async (channelId, message) => {
    await api.post("/channels", { action: "send", channelId, text: message.text });
    await refresh();
  };

  /* ================= ДОСТУПЫ (сейф) ================= */
  const vaultInitialized = !!data?.vault;

  const setupVault = async (passphrase) => {
    const salt = newVaultSalt();
    const canary = await makeVaultCanary(passphrase, salt);
    await api.post("/vault", { action: "setup", salt, canary });
    await refresh();
  };

  const unlockVault = async (passphrase) => {
    if (!data?.vault) return false;
    return vaultCanaryCheck(passphrase, data.vault.salt, data.vault.canary);
  };

  const addCredential = async (passphrase, { title, login, password, url, note, visibleTo }) => {
    const passEnc = await vaultEncrypt(passphrase, data.vault.salt, password || "");
    await api.post("/vault", { action: "add-credential", title, login, url, note, passEnc, visibleTo: visibleTo || [] });
    await refresh();
  };

  const revealCredential = async (passphrase, credId) => {
    const cred = data.vault.credentials.find((c) => c.id === credId);
    if (!cred) return "";
    return vaultDecrypt(passphrase, data.vault.salt, cred.passEnc);
  };

  const removeCredential = async (credId) => { await api.post("/vault", { action: "delete-credential", id: credId }); await refresh(); };

  const updateCredentialVisibility = async (credId, visibleTo) => {
    await api.post("/vault", { action: "update-visibility", id: credId, visibleTo });
    await refresh();
  };

  const value = {
    data, error, loading, branchName, refresh,
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
