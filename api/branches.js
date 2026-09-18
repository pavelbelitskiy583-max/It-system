import { withApi, requireSession, requireAdmin, sql, ApiError } from "./_lib/context.js";
import { makeId } from "./_lib/auth.js";

export default withApi(async (req, res) => {
  const me = await requireSession(req);

  if (req.method === "GET") {
    const rows = await sql`SELECT * FROM branches WHERE org_id = ${me.org_id} ORDER BY name`;
    return res.status(200).json(rows);
  }

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");
  requireAdmin(me);
  const { action } = req.body || {};

  if (action === "create") {
    const { name, city } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, "Укажите название филиала");
    const id = makeId("br");
    await sql`INSERT INTO branches (id, org_id, name, city) VALUES (${id}, ${me.org_id}, ${name.trim()}, ${city?.trim() || null})`;
    return res.status(201).json({ id });
  }

  if (action === "delete") {
    const { id } = req.body || {};
    await sql`DELETE FROM branches WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  if (action === "add-floor") {
    const { branchId, name } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, "Укажите название этажа");
    const id = makeId("fl");
    await sql`INSERT INTO floors (id, branch_id, name) VALUES (${id}, ${branchId}, ${name.trim()})`;
    return res.status(201).json({ id });
  }

  if (action === "delete-floor") {
    const { floorId } = req.body || {};
    await sql`DELETE FROM floors WHERE id = ${floorId}`;
    return res.status(200).json({ ok: true });
  }

  if (action === "add-room") {
    const { floorId, name } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, "Укажите название кабинета");
    const id = makeId("rm");
    await sql`INSERT INTO rooms (id, floor_id, name) VALUES (${id}, ${floorId}, ${name.trim()})`;
    return res.status(201).json({ id });
  }

  if (action === "delete-room") {
    const { roomId } = req.body || {};
    await sql`DELETE FROM rooms WHERE id = ${roomId}`;
    return res.status(200).json({ ok: true });
  }

  throw new ApiError(400, "Неизвестное действие");
});
