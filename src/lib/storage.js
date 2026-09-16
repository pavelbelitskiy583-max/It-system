const NS = "echoit";

export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`${NS}:${key}`);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
  } catch (e) {
    console.error("Ошибка записи в localStorage", e);
  }
}

export function lsRemove(key) {
  localStorage.removeItem(`${NS}:${key}`);
}

/* ---------- экспорт / импорт всей организации ---------- */
export function exportOrgJson(orgId) {
  const org = lsGet(`org:${orgId}`);
  const users = lsGet(`users:${orgId}`);
  const data = lsGet(`data:${orgId}`);
  const payload = { org, users, data, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `echoit-${org?.name || orgId}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importOrgJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!payload.org?.id) throw new Error("Некорректный файл");
        lsSet(`org:${payload.org.id}`, payload.org);
        lsSet(`users:${payload.org.id}`, payload.users || []);
        lsSet(`data:${payload.org.id}`, payload.data || {});
        const orgs = lsGet("orgs", []);
        if (!orgs.find((o) => o.id === payload.org.id)) {
          lsSet("orgs", [...orgs, { id: payload.org.id, name: payload.org.name }]);
        }
        resolve(payload.org.id);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
