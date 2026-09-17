import { sql, ensureSchema } from "./lib/db.js";
import {
  ALL_MODULES, makeId, genPassword, hashPassword, verifyPassword,
  signSession, setSessionCookie, clearSessionCookie, getSessionFromReq,
  fullPermissions, emptyPermissions, ApiError, genVerificationCode, hashCode,
} from "./lib/auth.js";
import { sendVerificationEmail } from "./lib/email.js";

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const segs = Array.isArray(req.query.path) ? req.query.path : (req.query.path ? [req.query.path] : []);
    const [a, b, c, d] = segs;
    const method = req.method;

    /* ---------------- AUTH (без сессии) ---------------- */
    if (a === "auth" && b === "register" && method === "POST") return await authRequestRegister(req, res);
    if (a === "auth" && b === "verify-registration" && method === "POST") return await authVerifyRegistration(req, res);
    if (a === "auth" && b === "resend-code" && method === "POST") return await authResendCode(req, res);
    if (a === "auth" && b === "login" && method === "POST") return await authLogin(req, res);
    if (a === "auth" && b === "logout" && method === "POST") { clearSessionCookie(res); return res.status(200).json({ ok: true }); }

    /* ---------------- всё остальное требует сессии ---------------- */
    const session = getSessionFromReq(req);
    if (!session) throw new ApiError(401, "Требуется авторизация");
    const me = await getUser(session.userId);
    if (!me || me.org_id !== session.orgId) throw new ApiError(401, "Сессия недействительна");

    if (a === "auth" && b === "me" && method === "GET") return res.status(200).json({ user: shapeUser(me), org: await getOrg(me.org_id) });
    if (a === "auth" && b === "change-password" && method === "POST") return await changeOwnPassword(req, res, me);

    if (a === "state" && method === "GET") return await getState(req, res, me);
    if (a === "export" && method === "GET") return await exportOrg(req, res, me);

    if (a === "employees") return await employeesRoute(req, res, me, method, b, c);
    if (a === "branches") return await branchesRoute(req, res, me, method, b, c, d);
    if (a === "floors") return await floorsRoute(req, res, me, method, b, c);
    if (a === "rooms") return await roomsRoute(req, res, me, method, b);
    if (a === "warehouse") return await warehouseRoute(req, res, me, method, b);
    if (a === "cartridges") return await cartridgesRoute(req, res, me, method, b, c, d);
    if (a === "equipment") return await equipmentRoute(req, res, me, method, b);
    if (a === "tasks") return await tasksRoute(req, res, me, method, b);
    if (a === "channels") return await channelsRoute(req, res, me, method, b, c);
    if (a === "vault") return await vaultRoute(req, res, me, method, b, c);

    throw new ApiError(404, "Маршрут не найден");
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    return res.status(status).json({ error: e.message || "Внутренняя ошибка сервера" });
  }
}

/* ================= ПРАВА ================= */
function requireAdmin(me) {
  if (me.role !== "admin") throw new ApiError(403, "Требуются права администратора");
}
function requireModule(me, moduleId) {
  if (me.role === "admin") return;
  if (!me.permissions?.[moduleId]) throw new ApiError(403, "Модуль вам не доступен");
}

/* ================= ХЕЛПЕРЫ БД ================= */
async function getUser(id) {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] || null;
}
async function getUserByLogin(login) {
  const rows = await sql`SELECT * FROM users WHERE lower(login) = lower(${login})`;
  return rows[0] || null;
}
async function getOrg(id) {
  const rows = await sql`SELECT id, name, created_at FROM organizations WHERE id = ${id}`;
  return rows[0] ? { id: rows[0].id, name: rows[0].name, createdAt: rows[0].created_at } : null;
}
function shapeUser(u) {
  return {
    id: u.id, login: u.login, name: u.name, role: u.role, branchId: u.branch_id, email: u.email || null,
    permissions: u.permissions, mustChangePassword: u.must_change_password,
  };
}

/* ================= AUTH ================= */
async function authRequestRegister(req, res) {
  const { orgName, adminName, login, email, password } = req.body || {};
  if (!orgName?.trim() || !adminName?.trim() || !login?.trim() || !email?.trim() || !password) {
    throw new ApiError(400, "Заполните все поля");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new ApiError(400, "Некорректный адрес почты");
  if (password.length < 6) throw new ApiError(400, "Пароль должен быть не короче 6 символов");
  const existing = await getUserByLogin(login);
  if (existing) throw new ApiError(409, "Такой логин уже занят");

  const passHash = await hashPassword(password);
  const payload = { orgName: orgName.trim(), adminName: adminName.trim(), login: login.trim(), passHash };
  const normEmail = email.trim().toLowerCase();

  await sql`DELETE FROM pending_verifications WHERE email = ${normEmail}`;
  const code = genVerificationCode();
  const id = makeId("pv");
  await sql`INSERT INTO pending_verifications (id, email, code_hash, payload, expires_at)
            VALUES (${id}, ${normEmail}, ${hashCode(code)}, ${JSON.stringify(payload)}::jsonb, now() + interval '15 minutes')`;

  await sendVerificationEmail(normEmail, code);
  return res.status(200).json({ pending: true, email: normEmail });
}

async function authVerifyRegistration(req, res) {
  const { email, code } = req.body || {};
  if (!email?.trim() || !code?.trim()) throw new ApiError(400, "Введите код подтверждения");
  const normEmail = email.trim().toLowerCase();

  const rows = await sql`SELECT * FROM pending_verifications WHERE email = ${normEmail} ORDER BY created_at DESC LIMIT 1`;
  const pending = rows[0];
  if (!pending) throw new ApiError(404, "Запрос на регистрацию не найден. Запросите код ещё раз.");
  if (new Date(pending.expires_at) < new Date()) {
    await sql`DELETE FROM pending_verifications WHERE id = ${pending.id}`;
    throw new ApiError(410, "Код истёк. Запросите новый.");
  }
  if (pending.attempts >= 5) {
    await sql`DELETE FROM pending_verifications WHERE id = ${pending.id}`;
    throw new ApiError(429, "Слишком много попыток. Запросите новый код.");
  }
  if (pending.code_hash !== hashCode(code)) {
    await sql`UPDATE pending_verifications SET attempts = attempts + 1 WHERE id = ${pending.id}`;
    throw new ApiError(400, "Неверный код");
  }

  const { orgName, adminName, login, passHash } = pending.payload;
  const existing = await getUserByLogin(login);
  if (existing) { await sql`DELETE FROM pending_verifications WHERE id = ${pending.id}`; throw new ApiError(409, "Такой логин уже занят"); }

  const orgId = makeId("org");
  const userId = makeId("usr");
  await sql`INSERT INTO organizations (id, name) VALUES (${orgId}, ${orgName})`;
  await sql`INSERT INTO users (id, org_id, login, name, role, permissions, pass_hash, must_change_password, email)
            VALUES (${userId}, ${orgId}, ${login}, ${adminName}, 'admin', ${JSON.stringify(fullPermissions())}::jsonb, ${passHash}, false, ${normEmail})`;
  await sql`INSERT INTO channels (id, org_id, name, description) VALUES (${makeId("ch")}, ${orgId}, '# общий', 'Все сотрудники')`;
  await sql`DELETE FROM pending_verifications WHERE id = ${pending.id}`;

  const token = signSession({ orgId, userId, role: "admin" });
  setSessionCookie(res, token);
  const user = await getUser(userId);
  return res.status(201).json({ user: shapeUser(user), org: await getOrg(orgId) });
}

async function authResendCode(req, res) {
  const { email } = req.body || {};
  if (!email?.trim()) throw new ApiError(400, "Укажите email");
  const normEmail = email.trim().toLowerCase();
  const rows = await sql`SELECT * FROM pending_verifications WHERE email = ${normEmail} ORDER BY created_at DESC LIMIT 1`;
  const pending = rows[0];
  if (!pending) throw new ApiError(404, "Запрос на регистрацию не найден. Начните регистрацию заново.");

  const code = genVerificationCode();
  await sql`UPDATE pending_verifications SET code_hash = ${hashCode(code)}, attempts = 0, expires_at = now() + interval '15 minutes' WHERE id = ${pending.id}`;
  await sendVerificationEmail(normEmail, code);
  return res.status(200).json({ ok: true });
}

async function authLogin(req, res) {
  const { login, password } = req.body || {};
  if (!login?.trim() || !password) throw new ApiError(400, "Введите логин и пароль");
  const u = await getUserByLogin(login);
  if (!u) throw new ApiError(401, "Пользователь с таким логином не найден");
  const ok = await verifyPassword(password, u.pass_hash);
  if (!ok) throw new ApiError(401, "Неверный пароль");
  const token = signSession({ orgId: u.org_id, userId: u.id, role: u.role });
  setSessionCookie(res, token);
  return res.status(200).json({ user: shapeUser(u), org: await getOrg(u.org_id) });
}

async function changeOwnPassword(req, res, me) {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) throw new ApiError(400, "Пароль должен быть не короче 6 символов");
  const hash = await hashPassword(newPassword);
  await sql`UPDATE users SET pass_hash = ${hash}, must_change_password = false WHERE id = ${me.id}`;
  return res.status(200).json({ ok: true });
}

/* ================= АГРЕГИРОВАННОЕ СОСТОЯНИЕ ОРГАНИЗАЦИИ ================= */
async function getState(req, res, me) {
  const orgId = me.org_id;

  const branchRows = await sql`SELECT * FROM branches WHERE org_id = ${orgId} ORDER BY name`;
  const floorRows = branchRows.length ? await sql`SELECT * FROM floors WHERE branch_id = ANY(${branchRows.map((b) => b.id)}) ORDER BY name` : [];
  const roomRows = floorRows.length ? await sql`SELECT * FROM rooms WHERE floor_id = ANY(${floorRows.map((f) => f.id)}) ORDER BY name` : [];
  const branches = branchRows.map((b) => ({
    id: b.id, name: b.name, city: b.city || "",
    floors: floorRows.filter((f) => f.branch_id === b.id).map((f) => ({
      id: f.id, name: f.name,
      rooms: roomRows.filter((r) => r.floor_id === f.id).map((r) => ({ id: r.id, name: r.name })),
    })),
  }));

  const warehouseRows = await sql`SELECT * FROM warehouse_items WHERE org_id = ${orgId} ORDER BY created_at DESC`;
  const warehouse = warehouseRows.map((w) => ({ id: w.id, name: w.name, cat: w.cat, qty: w.qty, unit: w.unit, branchId: w.branch_id }));

  const cartRows = await sql`SELECT * FROM cartridges WHERE org_id = ${orgId} ORDER BY model`;
  const cartIds = cartRows.map((c) => c.id);
  const stockRows = cartIds.length ? await sql`SELECT * FROM cartridge_stock WHERE cartridge_id = ANY(${cartIds})` : [];
  const evRows = cartIds.length ? await sql`SELECT * FROM cartridge_events WHERE cartridge_id = ANY(${cartIds}) ORDER BY created_at DESC` : [];
  const cartridges = cartRows.map((c) => ({
    id: c.id, model: c.model, printer: c.printer, min: c.min_qty,
    stock: Object.fromEntries(stockRows.filter((s) => s.cartridge_id === c.id).map((s) => [s.branch_id, s.qty])),
    history: evRows.filter((e) => e.cartridge_id === c.id).map((e) => ({
      id: e.id, type: e.type, branchId: e.branch_id, qty: e.qty, note: e.note || "",
      author: e.author || "—", confirmed: e.confirmed, date: e.created_at,
    })),
  }));

  const eqRows = await sql`SELECT * FROM equipment WHERE org_id = ${orgId} ORDER BY created_at DESC`;
  const equipment = eqRows.map((e) => ({
    id: e.id, type: e.type, model: e.model, inv: e.inv, branchId: e.branch_id,
    floorId: e.floor_id, roomId: e.room_id, userName: e.user_name, status: e.status,
  }));

  const taskRows = await sql`SELECT * FROM tasks WHERE org_id = ${orgId} ORDER BY created_at DESC`;
  const tasks = taskRows.map((t) => ({
    id: t.id, title: t.title, branchId: t.branch_id, prio: t.prio, assignee: t.assignee,
    status: t.status, createdBy: t.created_by, date: t.created_at,
  }));

  const chRows = await sql`SELECT * FROM channels WHERE org_id = ${orgId} ORDER BY created_at`;
  const channels = chRows.map((c) => ({ id: c.id, name: c.name, desc: c.description || "", branchId: c.branch_id }));
  const chIds = chRows.map((c) => c.id);
  const msgRows = chIds.length ? await sql`SELECT * FROM messages WHERE channel_id = ANY(${chIds}) ORDER BY created_at ASC` : [];
  const messages = {};
  for (const c of channels) messages[c.id] = [];
  for (const m of msgRows) {
    messages[m.channel_id].push({ id: m.id, author: m.author_name, text: m.text, time: fmtTime(m.created_at) });
  }

  const orgRows = await sql`SELECT vault_salt, vault_canary_iv, vault_canary_ct FROM organizations WHERE id = ${orgId}`;
  const orgRow = orgRows[0];
  const vaultInitialized = !!orgRow?.vault_salt;
  let vault = null;
  if (vaultInitialized) {
    const credRows = await sql`SELECT * FROM vault_credentials WHERE org_id = ${orgId} ORDER BY created_at DESC`;
    const visible = credRows.filter((c) => me.role === "admin" || (c.visible_to || []).includes(me.id));
    vault = {
      salt: orgRow.vault_salt,
      canary: { iv: orgRow.vault_canary_iv, ct: orgRow.vault_canary_ct },
      credentials: visible.map((c) => ({
        id: c.id, title: c.title, login: c.login, url: c.url, note: c.note,
        passEnc: { iv: c.pass_iv, ct: c.pass_ct }, visibleTo: c.visible_to || [],
      })),
    };
  }

  return res.status(200).json({ branches, warehouse, cartridges, equipment, tasks, channels, messages, vault });
}
function fmtTime(d) {
  const dt = new Date(d);
  return String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
}

async function exportOrg(req, res, me) {
  requireAdmin(me);
  const orgId = me.org_id;
  const org = await getOrg(orgId);
  const users = await sql`SELECT id, login, name, role, branch_id, permissions, must_change_password, created_at FROM users WHERE org_id = ${orgId}`;
  // Переиспользуем ту же сборку данных, что и /api/state, но без фильтрации сейфа по видимости —
  // это резервная копия для администратора, секреты в ней остаются зашифрованными (AES-GCM).
  const stateRes = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  await getState(req, stateRes, { ...me, role: "admin" });
  return res.status(200).json({
    exportedAt: new Date().toISOString(),
    org, users,
    ...stateRes.body,
  });
}

/* ================= СОТРУДНИКИ ================= */
async function employeesRoute(req, res, me, method, id, sub) {
  if (!id && method === "GET") {
    const rows = await sql`SELECT * FROM users WHERE org_id = ${me.org_id} ORDER BY created_at`;
    return res.status(200).json(rows.map(shapeUser));
  }
  requireAdmin(me);
  if (!id && method === "POST") {
    const { name, login, branchId, permissions } = req.body || {};
    if (!name?.trim() || !login?.trim()) throw new ApiError(400, "Укажите имя и логин");
    const existing = await getUserByLogin(login);
    if (existing) throw new ApiError(409, "Такой логин уже занят");
    const password = genPassword(10);
    const hash = await hashPassword(password);
    const userId = makeId("usr");
    await sql`INSERT INTO users (id, org_id, login, name, role, branch_id, permissions, pass_hash, must_change_password)
              VALUES (${userId}, ${me.org_id}, ${login.trim()}, ${name.trim()}, 'staff', ${branchId || null}, ${JSON.stringify(permissions || emptyPermissions())}::jsonb, ${hash}, true)`;
    const user = await getUser(userId);
    return res.status(201).json({ user: shapeUser(user), password });
  }
  if (id && sub === "reset-password" && method === "POST") {
    const target = await getUser(id);
    if (!target || target.org_id !== me.org_id) throw new ApiError(404, "Сотрудник не найден");
    const password = genPassword(10);
    const hash = await hashPassword(password);
    await sql`UPDATE users SET pass_hash = ${hash}, must_change_password = true WHERE id = ${id}`;
    return res.status(200).json({ password });
  }
  if (id && !sub && method === "PATCH") {
    const target = await getUser(id);
    if (!target || target.org_id !== me.org_id) throw new ApiError(404, "Сотрудник не найден");
    const { permissions, branchId } = req.body || {};
    await sql`UPDATE users SET
        permissions = COALESCE(${permissions ? JSON.stringify(permissions) : null}::jsonb, permissions),
        branch_id = COALESCE(${branchId !== undefined ? branchId : null}, branch_id)
      WHERE id = ${id}`;
    const updated = await getUser(id);
    return res.status(200).json(shapeUser(updated));
  }
  if (id && !sub && method === "DELETE") {
    const target = await getUser(id);
    if (!target || target.org_id !== me.org_id) throw new ApiError(404, "Сотрудник не найден");
    if (target.role === "admin") throw new ApiError(400, "Нельзя удалить администратора");
    await sql`DELETE FROM users WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }
  throw new ApiError(404, "Маршрут не найден");
}

/* ================= ФИЛИАЛЫ / ЭТАЖИ / КАБИНЕТЫ ================= */
async function branchesRoute(req, res, me, method, id, sub) {
  if (!id && method === "GET") {
    requireModule(me, "settings");
    const rows = await sql`SELECT * FROM branches WHERE org_id = ${me.org_id}`;
    return res.status(200).json(rows);
  }
  requireAdmin(me);
  if (!id && method === "POST") {
    const { name, city } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, "Укажите название филиала");
    const bid = makeId("br");
    await sql`INSERT INTO branches (id, org_id, name, city) VALUES (${bid}, ${me.org_id}, ${name.trim()}, ${city?.trim() || null})`;
    return res.status(201).json({ id: bid });
  }
  if (id && !sub && method === "DELETE") {
    await sql`DELETE FROM branches WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  if (id && sub === "floors" && method === "POST") {
    const { name } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, "Укажите название этажа");
    const fid = makeId("fl");
    await sql`INSERT INTO floors (id, branch_id, name) VALUES (${fid}, ${id}, ${name.trim()})`;
    return res.status(201).json({ id: fid });
  }
  throw new ApiError(404, "Маршрут не найден");
}
async function floorsRoute(req, res, me, method, id, sub) {
  requireAdmin(me);
  if (id && !sub && method === "DELETE") {
    await sql`DELETE FROM floors WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }
  if (id && sub === "rooms" && method === "POST") {
    const { name } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, "Укажите название кабинета");
    const rid = makeId("rm");
    await sql`INSERT INTO rooms (id, floor_id, name) VALUES (${rid}, ${id}, ${name.trim()})`;
    return res.status(201).json({ id: rid });
  }
  throw new ApiError(404, "Маршрут не найден");
}
async function roomsRoute(req, res, me, method, id) {
  requireAdmin(me);
  if (id && method === "DELETE") {
    await sql`DELETE FROM rooms WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }
  throw new ApiError(404, "Маршрут не найден");
}

/* ================= СКЛАД ================= */
async function warehouseRoute(req, res, me, method, id) {
  requireModule(me, "warehouse");
  if (!id && method === "POST") {
    const { name, cat, qty, unit, branchId } = req.body || {};
    if (!name?.trim() || !branchId) throw new ApiError(400, "Заполните наименование и филиал");
    const wid = makeId("wh");
    await sql`INSERT INTO warehouse_items (id, org_id, name, cat, qty, unit, branch_id)
              VALUES (${wid}, ${me.org_id}, ${name.trim()}, ${cat || ""}, ${parseInt(qty) || 0}, ${unit || "шт"}, ${branchId})`;
    return res.status(201).json({ id: wid });
  }
  if (id && method === "PATCH") {
    const { delta } = req.body || {};
    await sql`UPDATE warehouse_items SET qty = GREATEST(0, qty + ${parseInt(delta) || 0}) WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  if (id && method === "DELETE") {
    await sql`DELETE FROM warehouse_items WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  throw new ApiError(404, "Маршрут не найден");
}

/* ================= КАРТРИДЖИ ================= */
async function cartridgesRoute(req, res, me, method, id, sub, sub2) {
  requireModule(me, "cartridges");
  if (!id && method === "POST") {
    const { model, printer, min } = req.body || {};
    if (!model?.trim()) throw new ApiError(400, "Укажите модель картриджа");
    const cid = makeId("ct");
    await sql`INSERT INTO cartridges (id, org_id, model, printer, min_qty) VALUES (${cid}, ${me.org_id}, ${model.trim()}, ${printer?.trim() || ""}, ${parseInt(min) || 0})`;
    return res.status(201).json({ id: cid });
  }
  if (id && !sub && method === "DELETE") {
    await sql`DELETE FROM cartridges WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  if (id && sub === "events" && !sub2 && method === "POST") {
    const { type, branchId, qty, note } = req.body || {};
    if (!["in", "sent", "returned"].includes(type) || !branchId || !qty) throw new ApiError(400, "Некорректные данные события");
    const q = parseInt(qty) || 0;
    const evId = makeId("ev");
    const confirmed = type !== "returned";
    await sql`INSERT INTO cartridge_events (id, cartridge_id, branch_id, type, qty, note, author, confirmed)
              VALUES (${evId}, ${id}, ${branchId}, ${type}, ${q}, ${note || ""}, ${me.name}, ${confirmed})`;
    if (type === "in") {
      await sql`INSERT INTO cartridge_stock (cartridge_id, branch_id, qty) VALUES (${id}, ${branchId}, ${q})
                ON CONFLICT (cartridge_id, branch_id) DO UPDATE SET qty = cartridge_stock.qty + ${q}`;
    } else if (type === "sent") {
      await sql`INSERT INTO cartridge_stock (cartridge_id, branch_id, qty) VALUES (${id}, ${branchId}, 0)
                ON CONFLICT (cartridge_id, branch_id) DO UPDATE SET qty = GREATEST(0, cartridge_stock.qty - ${q})`;
    }
    return res.status(201).json({ id: evId });
  }
  if (id && sub === "events" && sub2 && method === "POST") {
    // /cartridges/:id/events/:eventId/confirm — обрабатывается через req.query.path длиной 5,
    // здесь sub2 = eventId, а действие "confirm" разбирается из хвоста URL
    const rest = Array.isArray(req.query.path) ? req.query.path.slice(4) : [];
    if (rest[0] !== "confirm") throw new ApiError(404, "Маршрут не найден");
    const evRows = await sql`SELECT * FROM cartridge_events WHERE id = ${sub2} AND cartridge_id = ${id}`;
    const ev = evRows[0];
    if (!ev) throw new ApiError(404, "Событие не найдено");
    if (ev.confirmed) return res.status(200).json({ ok: true });
    await sql`UPDATE cartridge_events SET confirmed = true WHERE id = ${sub2}`;
    await sql`INSERT INTO cartridge_stock (cartridge_id, branch_id, qty) VALUES (${id}, ${ev.branch_id}, ${ev.qty})
              ON CONFLICT (cartridge_id, branch_id) DO UPDATE SET qty = cartridge_stock.qty + ${ev.qty}`;
    return res.status(200).json({ ok: true });
  }
  throw new ApiError(404, "Маршрут не найден");
}

/* ================= ОБОРУДОВАНИЕ ================= */
async function equipmentRoute(req, res, me, method, id) {
  requireModule(me, "equipment");
  if (!id && method === "POST") {
    const { type, model, inv, branchId, floorId, roomId, userName } = req.body || {};
    if (!model?.trim() || !inv?.trim() || !branchId || !floorId || !roomId) throw new ApiError(400, "Заполните обязательные поля");
    const eid = makeId("eq");
    await sql`INSERT INTO equipment (id, org_id, type, model, inv, branch_id, floor_id, room_id, user_name, status)
              VALUES (${eid}, ${me.org_id}, ${type || "Прочее"}, ${model.trim()}, ${inv.trim()}, ${branchId}, ${floorId}, ${roomId}, ${userName?.trim() || ""}, 'work')`;
    return res.status(201).json({ id: eid });
  }
  if (id && method === "PATCH") {
    const { status } = req.body || {};
    if (status) await sql`UPDATE equipment SET status = ${status} WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  if (id && method === "DELETE") {
    await sql`DELETE FROM equipment WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  throw new ApiError(404, "Маршрут не найден");
}

/* ================= ЗАДАЧИ ================= */
async function tasksRoute(req, res, me, method, id) {
  requireModule(me, "tasks");
  if (!id && method === "POST") {
    const { title, branchId, prio, assignee } = req.body || {};
    if (!title?.trim()) throw new ApiError(400, "Введите название задачи");
    const tid = makeId("tk");
    await sql`INSERT INTO tasks (id, org_id, title, branch_id, prio, assignee, status, created_by)
              VALUES (${tid}, ${me.org_id}, ${title.trim()}, ${branchId || null}, ${prio || "md"}, ${assignee || me.name}, 'new', ${me.name})`;
    return res.status(201).json({ id: tid });
  }
  if (id && method === "PATCH") {
    const { status } = req.body || {};
    if (status) await sql`UPDATE tasks SET status = ${status} WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  if (id && method === "DELETE") {
    await sql`DELETE FROM tasks WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  throw new ApiError(404, "Маршрут не найден");
}

/* ================= МЕССЕНДЖЕР ================= */
async function channelsRoute(req, res, me, method, id, sub) {
  requireModule(me, "messenger");
  if (!id && method === "POST") {
    const { name, desc } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, "Укажите название канала");
    const cid = makeId("ch");
    const label = name.trim().startsWith("#") ? name.trim() : `# ${name.trim()}`;
    await sql`INSERT INTO channels (id, org_id, name, description) VALUES (${cid}, ${me.org_id}, ${label}, ${desc || ""})`;
    return res.status(201).json({ id: cid });
  }
  if (id && sub === "messages" && method === "POST") {
    const { text } = req.body || {};
    if (!text?.trim()) throw new ApiError(400, "Пустое сообщение");
    const mid = makeId("msg");
    await sql`INSERT INTO messages (id, channel_id, author_id, author_name, text) VALUES (${mid}, ${id}, ${me.id}, ${me.name}, ${text.trim()})`;
    return res.status(201).json({ id: mid });
  }
  throw new ApiError(404, "Маршрут не найден");
}

/* ================= СЕЙФ ДОСТУПОВ ================= */
async function vaultRoute(req, res, me, method, id, sub) {
  requireModule(me, "vault");
  if (!id && method === "GET") {
    return await getVaultOnly(req, res, me);
  }
  if (id === "setup" && method === "POST") {
    requireAdmin(me);
    const { salt, canary } = req.body || {};
    if (!salt || !canary?.iv || !canary?.ct) throw new ApiError(400, "Некорректные данные сейфа");
    await sql`UPDATE organizations SET vault_salt = ${salt}, vault_canary_iv = ${canary.iv}, vault_canary_ct = ${canary.ct} WHERE id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  if (id === "credentials" && !sub && method === "POST") {
    requireAdmin(me);
    const { title, login, url, note, passEnc, visibleTo } = req.body || {};
    if (!title?.trim() || !passEnc?.iv || !passEnc?.ct) throw new ApiError(400, "Заполните название и пароль");
    const crid = makeId("cr");
    await sql`INSERT INTO vault_credentials (id, org_id, title, login, url, note, pass_iv, pass_ct, visible_to)
              VALUES (${crid}, ${me.org_id}, ${title.trim()}, ${login || ""}, ${url || ""}, ${note || ""}, ${passEnc.iv}, ${passEnc.ct}, ${JSON.stringify(visibleTo || [])}::jsonb)`;
    return res.status(201).json({ id: crid });
  }
  if (id === "credentials" && sub && method === "PATCH") {
    requireAdmin(me);
    const { visibleTo } = req.body || {};
    await sql`UPDATE vault_credentials SET visible_to = ${JSON.stringify(visibleTo || [])}::jsonb WHERE id = ${sub} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  if (id === "credentials" && sub && method === "DELETE") {
    requireAdmin(me);
    await sql`DELETE FROM vault_credentials WHERE id = ${sub} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }
  throw new ApiError(404, "Маршрут не найден");
}

async function getVaultOnly(req, res, me) {
  const orgRows = await sql`SELECT vault_salt, vault_canary_iv, vault_canary_ct FROM organizations WHERE id = ${me.org_id}`;
  const orgRow = orgRows[0];
  if (!orgRow?.vault_salt) return res.status(200).json({ initialized: false });
  const credRows = await sql`SELECT * FROM vault_credentials WHERE org_id = ${me.org_id} ORDER BY created_at DESC`;
  const visible = credRows.filter((c) => me.role === "admin" || (c.visible_to || []).includes(me.id));
  return res.status(200).json({
    initialized: true,
    salt: orgRow.vault_salt,
    canary: { iv: orgRow.vault_canary_iv, ct: orgRow.vault_canary_ct },
    credentials: visible.map((c) => ({
      id: c.id, title: c.title, login: c.login, url: c.url, note: c.note,
      passEnc: { iv: c.pass_iv, ct: c.pass_ct }, visibleTo: c.visible_to || [],
    })),
  });
}
