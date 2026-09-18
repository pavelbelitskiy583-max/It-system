import { sql, ensureSchema } from "./db.js";
import { getSessionFromReq, ApiError } from "./auth.js";

export async function requireSession(req) {
  const session = getSessionFromReq(req);
  if (!session) throw new ApiError(401, "Требуется авторизация");
  const rows = await sql`SELECT * FROM users WHERE id = ${session.userId}`;
  const me = rows[0];
  if (!me || me.org_id !== session.orgId) throw new ApiError(401, "Сессия недействительна");
  return me;
}

export function requireAdmin(me) {
  if (me.role !== "admin") throw new ApiError(403, "Требуются права администратора");
}

export function requireModule(me, moduleId) {
  if (me.role === "admin") return;
  if (!me.permissions?.[moduleId]) throw new ApiError(403, "Модуль вам не доступен");
}

// Оборачивает handler: гарантирует схему БД и единообразную обработку ошибок.
// Каждый api/*.js — обычный статический файл без динамических сегментов пути,
// вся дополнительная маршрутизация (какое действие выполнить) передаётся полем
// "action" в теле POST-запроса, а не сегментами URL.
export function withApi(handler) {
  return async (req, res) => {
    try {
      await ensureSchema();
      await handler(req, res);
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      res.status(status).json({ error: e.message || "Внутренняя ошибка сервера" });
    }
  };
}

export { sql, ApiError };
