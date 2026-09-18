import { withApi, requireSession, requireModule, sql, ApiError } from "./_lib/context.js";
import { makeId } from "./_lib/auth.js";

export default withApi(async (req, res) => {
  const me = await requireSession(req);
  requireModule(me, "equipment");

  if (req.method === "GET") {
    const rows = await sql`SELECT * FROM equipment WHERE org_id = ${me.org_id} ORDER BY created_at DESC`;
    return res.status(200).json(rows.map((e) => ({
      id: e.id, type: e.type, model: e.model, inv: e.inv, branchId: e.branch_id,
      floorId: e.floor_id, roomId: e.room_id, userName: e.user_name, status: e.status,
    })));
  }

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");
  const { action } = req.body || {};

  if (action === "create") {
    const { type, model, inv, branchId, floorId, roomId, userName } = req.body || {};
    if (!model?.trim() || !inv?.trim() || !branchId || !floorId || !roomId) throw new ApiError(400, "Заполните обязательные поля");
    const id = makeId("eq");
    await sql`INSERT INTO equipment (id, org_id, type, model, inv, branch_id, floor_id, room_id, user_name, status)
              VALUES (${id}, ${me.org_id}, ${type || "Прочее"}, ${model.trim()}, ${inv.trim()}, ${branchId}, ${floorId}, ${roomId}, ${userName?.trim() || ""}, 'work')`;
    return res.status(201).json({ id });
  }

  if (action === "update") {
    const { id, status } = req.body || {};
    if (status) await sql`UPDATE equipment SET status = ${status} WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  if (action === "delete") {
    const { id } = req.body || {};
    await sql`DELETE FROM equipment WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  throw new ApiError(400, "Неизвестное действие");
});
