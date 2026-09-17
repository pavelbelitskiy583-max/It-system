// Экспорт резервной копии организации из БД (только администратор).
// Секреты в разделе "Доступы" остаются зашифрованными (AES-GCM) даже внутри экспорта.
import { api } from "./api";

export async function exportOrgBackup(orgName) {
  const payload = await api.get("/export");
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `echoit-${orgName || "backup"}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
