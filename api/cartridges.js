import { withApi, requireSession, requireModule, sql, ApiError } from "./_lib/context.js";
import { makeId } from "./_lib/auth.js";

export default withApi(async (req, res) => {
  const me = await requireSession(req);
  requireModule(me, "cartridges");

  if (req.method === "GET") {
    const cartRows = await sql`SELECT * FROM cartridges WHERE org_id = ${me.org_id} ORDER BY model`;
    const cartIds = cartRows.map((c) => c.id);
    const stockRows = cartIds.length ? await sql`SELECT * FROM cartridge_stock WHERE cartridge_id = ANY(${cartIds})` : [];
    const evRows = cartIds.length ? await sql`SELECT * FROM cartridge_events WHERE cartridge_id = ANY(${cartIds}) ORDER BY id DESC` : [];
    const cartridges = cartRows.map((c) => ({
      id: c.id, model: c.model, printer: c.printer, min: c.min_qty,
      stock: Object.fromEntries(stockRows.filter((s) => s.cartridge_id === c.id).map((s) => [s.branch_id, s.qty])),
      history: evRows.filter((e) => e.cartridge_id === c.id).map((e) => ({
        id: e.id, type: e.type, branchId: e.branch_id, qty: e.qty, note: e.note || "",
        author: e.author || "—", confirmed: e.confirmed, date: e.created_at,
      })),
    }));
    return res.status(200).json(cartridges);
  }

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");
  const { action } = req.body || {};

  if (action === "create") {
    const { model, printer, min } = req.body || {};
    if (!model?.trim()) throw new ApiError(400, "Укажите модель картриджа");
    const id = makeId("ct");
    await sql`INSERT INTO cartridges (id, org_id, model, printer, min_qty) VALUES (${id}, ${me.org_id}, ${model.trim()}, ${printer?.trim() || ""}, ${parseInt(min) || 0})`;
    return res.status(201).json({ id });
  }

  if (action === "delete") {
    const { id } = req.body || {};
    await sql`DELETE FROM cartridges WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  if (action === "event") {
    const { cartId, type, branchId, qty, note } = req.body || {};
    if (!["in", "sent", "returned"].includes(type) || !branchId || !qty) throw new ApiError(400, "Некорректные данные события");
    const q = parseInt(qty) || 0;
    const evId = makeId("ev");
    const confirmed = type !== "returned";
    await sql`INSERT INTO cartridge_events (id, cartridge_id, branch_id, type, qty, note, author, confirmed)
              VALUES (${evId}, ${cartId}, ${branchId}, ${type}, ${q}, ${note || ""}, ${me.name}, ${confirmed})`;
    if (type === "in") {
      await sql`INSERT INTO cartridge_stock (cartridge_id, branch_id, qty) VALUES (${cartId}, ${branchId}, ${q})
                ON CONFLICT (cartridge_id, branch_id) DO UPDATE SET qty = cartridge_stock.qty + ${q}`;
    } else if (type === "sent") {
      await sql`INSERT INTO cartridge_stock (cartridge_id, branch_id, qty) VALUES (${cartId}, ${branchId}, 0)
                ON CONFLICT (cartridge_id, branch_id) DO UPDATE SET qty = GREATEST(0, cartridge_stock.qty - ${q})`;
    }
    return res.status(201).json({ id: evId });
  }

  if (action === "confirm") {
    const { cartId, eventId } = req.body || {};
    const evRows = await sql`SELECT * FROM cartridge_events WHERE id = ${eventId} AND cartridge_id = ${cartId}`;
    const ev = evRows[0];
    if (!ev) throw new ApiError(404, "Событие не найдено");
    if (!ev.confirmed) {
      await sql`UPDATE cartridge_events SET confirmed = true WHERE id = ${eventId}`;
      await sql`INSERT INTO cartridge_stock (cartridge_id, branch_id, qty) VALUES (${cartId}, ${ev.branch_id}, ${ev.qty})
                ON CONFLICT (cartridge_id, branch_id) DO UPDATE SET qty = cartridge_stock.qty + ${ev.qty}`;
    }
    return res.status(200).json({ ok: true });
  }

  throw new ApiError(400, "Неизвестное действие");
});
