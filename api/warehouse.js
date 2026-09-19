import { withApi, requireSession, requireModule, sql, ApiError } from "./_lib/context.js";
import { makeId } from "./_lib/auth.js";

export default withApi(async (req, res) => {
  const me = await requireSession(req);
  requireModule(me, "warehouse");

  if (req.method === "GET") {
    const rows = await sql`SELECT * FROM warehouse_items WHERE org_id = ${me.org_id} ORDER BY id DESC`;
    return res.status(200).json(rows.map((w) => ({ id: w.id, name: w.name, cat: w.cat, qty: w.qty, unit: w.unit, branchId: w.branch_id })));
  }

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");
  const { action } = req.body || {};

  if (action === "create") {
    const { name, cat, qty, unit, branchId } = req.body || {};
    if (!name?.trim() || !branchId) throw new ApiError(400, "Заполните наименование и филиал");
    const id = makeId("wh");
    await sql`INSERT INTO warehouse_items (id, org_id, name, cat, qty, unit, branch_id)
              VALUES (${id}, ${me.org_id}, ${name.trim()}, ${cat || ""}, ${parseInt(qty) || 0}, ${unit || "шт"}, ${branchId})`;
    return res.status(201).json({ id });
  }

  if (action === "adjust") {
    const { id, delta } = req.body || {};
    await sql`UPDATE warehouse_items SET qty = GREATEST(0, qty + ${parseInt(delta) || 0}) WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  if (action === "delete") {
    const { id } = req.body || {};
    await sql`DELETE FROM warehouse_items WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  throw new ApiError(400, "Неизвестное действие");
});
