import { withApi, requireSession, sql, ApiError } from "./_lib/context.js";
import {
  makeId, hashPassword, verifyPassword, signSession, setSessionCookie,
  clearSessionCookie, fullPermissions,
} from "./_lib/auth.js";

async function getUserByLogin(login) {
  const rows = await sql`SELECT * FROM users WHERE lower(login) = lower(${login})`;
  return rows[0] || null;
}
async function getOrg(id) {
  const rows = await sql`SELECT id, name FROM organizations WHERE id = ${id}`;
  return rows[0] ? { id: rows[0].id, name: rows[0].name, createdAt: null } : null;
}
function shapeUser(u) {
  return {
    id: u.id, login: u.login, name: u.name, role: u.role, branchId: u.branch_id, email: u.email || null,
    permissions: u.permissions, mustChangePassword: u.must_change_password,
  };
}

export default withApi(async (req, res) => {
  if (req.method === "GET") {
    const me = await requireSession(req);
    return res.status(200).json({ user: shapeUser(me), org: await getOrg(me.org_id) });
  }

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");

  const { action } = req.body || {};

  if (action === "register") {
    const { orgName, adminName, login, email, password } = req.body || {};
    if (!orgName?.trim() || !adminName?.trim() || !login?.trim() || !password) throw new ApiError(400, "Заполните все поля");
    if (password.length < 6) throw new ApiError(400, "Пароль должен быть не короче 6 символов");
    const existing = await getUserByLogin(login);
    if (existing) throw new ApiError(409, "Такой логин уже занят");

    const orgId = makeId("org");
    const userId = makeId("usr");
    const hash = await hashPassword(password);

    await sql`INSERT INTO organizations (id, name) VALUES (${orgId}, ${orgName.trim()})`;
    await sql`INSERT INTO users (id, org_id, login, name, role, permissions, pass_hash, must_change_password, email)
              VALUES (${userId}, ${orgId}, ${login.trim()}, ${adminName.trim()}, 'admin', ${JSON.stringify(fullPermissions())}::jsonb, ${hash}, false, ${email?.trim().toLowerCase() || null})`;
    await sql`INSERT INTO channels (id, org_id, name, description) VALUES (${makeId("ch")}, ${orgId}, '# общий', 'Все сотрудники')`;

    const token = signSession({ orgId, userId, role: "admin" });
    setSessionCookie(res, token);
    const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
    return res.status(201).json({ user: shapeUser(rows[0]), org: await getOrg(orgId) });
  }

  if (action === "login") {
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

  if (action === "logout") {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }

  if (action === "change-password") {
    const me = await requireSession(req);
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) throw new ApiError(400, "Пароль должен быть не короче 6 символов");
    const hash = await hashPassword(newPassword);
    await sql`UPDATE users SET pass_hash = ${hash}, must_change_password = false WHERE id = ${me.id}`;
    return res.status(200).json({ ok: true });
  }

  throw new ApiError(400, "Неизвестное действие");
});
