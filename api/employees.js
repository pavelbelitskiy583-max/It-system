import { withApi, requireSession, requireAdmin, sql, ApiError } from "./_lib/context.js";
import { makeId, genPassword, hashPassword, emptyPermissions } from "./_lib/auth.js";

function shapeUser(u) {
  return {
    id: u.id, login: u.login, name: u.name, role: u.role, branchId: u.branch_id, email: u.email || null,
    permissions: u.permissions, mustChangePassword: u.must_change_password,
  };
}
async function getUserByLogin(login) {
  const rows = await sql`SELECT * FROM users WHERE lower(login) = lower(${login})`;
  return rows[0] || null;
}

export default withApi(async (req, res) => {
  const me = await requireSession(req);

  if (req.method === "GET") {
    const rows = await sql`SELECT * FROM users WHERE org_id = ${me.org_id} ORDER BY created_at`;
    return res.status(200).json(rows.map(shapeUser));
  }

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");
  const { action } = req.body || {};

  if (action === "create") {
    requireAdmin(me);
    const { name, login, branchId, permissions } = req.body || {};
    if (!name?.trim() || !login?.trim()) throw new ApiError(400, "Укажите имя и логин");
    const existing = await getUserByLogin(login);
    if (existing) throw new ApiError(409, "Такой логин уже занят");
    const password = genPassword(10);
    const hash = await hashPassword(password);
    const userId = makeId("usr");
    await sql`INSERT INTO users (id, org_id, login, name, role, branch_id, permissions, pass_hash, must_change_password)
              VALUES (${userId}, ${me.org_id}, ${login.trim()}, ${name.trim()}, 'staff', ${branchId || null}, ${JSON.stringify(permissions || emptyPermissions())}::jsonb, ${hash}, true)`;
    const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
    return res.status(201).json({ user: shapeUser(rows[0]), password });
  }

  if (action === "reset-password") {
    requireAdmin(me);
    const { id } = req.body || {};
    const rows = await sql`SELECT * FROM users WHERE id = ${id} AND org_id = ${me.org_id}`;
    if (!rows[0]) throw new ApiError(404, "Сотрудник не найден");
    const password = genPassword(10);
    const hash = await hashPassword(password);
    await sql`UPDATE users SET pass_hash = ${hash}, must_change_password = true WHERE id = ${id}`;
    return res.status(200).json({ password });
  }

  if (action === "update") {
    requireAdmin(me);
    const { id, permissions, branchId } = req.body || {};
    const rows = await sql`SELECT * FROM users WHERE id = ${id} AND org_id = ${me.org_id}`;
    if (!rows[0]) throw new ApiError(404, "Сотрудник не найден");
    await sql`UPDATE users SET
        permissions = COALESCE(${permissions ? JSON.stringify(permissions) : null}::jsonb, permissions),
        branch_id = COALESCE(${branchId !== undefined ? branchId : null}, branch_id)
      WHERE id = ${id}`;
    const updated = await sql`SELECT * FROM users WHERE id = ${id}`;
    return res.status(200).json(shapeUser(updated[0]));
  }

  if (action === "delete") {
    requireAdmin(me);
    const { id } = req.body || {};
    const rows = await sql`SELECT * FROM users WHERE id = ${id} AND org_id = ${me.org_id}`;
    if (!rows[0]) throw new ApiError(404, "Сотрудник не найден");
    if (rows[0].role === "admin") throw new ApiError(400, "Нельзя удалить администратора");
    await sql`DELETE FROM users WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  throw new ApiError(400, "Неизвестное действие");
});
