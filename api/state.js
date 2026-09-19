import { withApi, requireSession, sql } from "./_lib/context.js";

export default withApi(async (req, res) => {
  const me = await requireSession(req);
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

  const warehouseRows = await sql`SELECT * FROM warehouse_items WHERE org_id = ${orgId} ORDER BY id DESC`;
  const warehouse = warehouseRows.map((w) => ({ id: w.id, name: w.name, cat: w.cat, qty: w.qty, unit: w.unit, branchId: w.branch_id }));

  const cartRows = await sql`SELECT * FROM cartridges WHERE org_id = ${orgId} ORDER BY model`;
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

  const eqRows = await sql`SELECT * FROM equipment WHERE org_id = ${orgId} ORDER BY id DESC`;
  const equipment = eqRows.map((e) => ({
    id: e.id, type: e.type, model: e.model, inv: e.inv, branchId: e.branch_id,
    floorId: e.floor_id, roomId: e.room_id, userName: e.user_name, status: e.status,
  }));

  const taskRows = await sql`SELECT * FROM tasks WHERE org_id = ${orgId} ORDER BY id DESC`;
  const tasks = taskRows.map((t) => ({
    id: t.id, title: t.title, branchId: t.branch_id, prio: t.prio, assignee: t.assignee,
    status: t.status, createdBy: t.created_by, date: t.created_at,
  }));

  const chRows = await sql`SELECT * FROM channels WHERE org_id = ${orgId} ORDER BY id`;
  const channels = chRows.map((c) => ({ id: c.id, name: c.name, desc: c.description || "", branchId: c.branch_id }));
  const chIds = chRows.map((c) => c.id);
  const msgRows = chIds.length ? await sql`SELECT * FROM messages WHERE channel_id = ANY(${chIds}) ORDER BY id ASC` : [];
  const messages = {};
  for (const c of channels) messages[c.id] = [];
  for (const m of msgRows) messages[m.channel_id].push({ id: m.id, author: m.author_name, text: m.text, time: fmtTime(m.created_at) });

  const orgRows = await sql`SELECT vault_salt, vault_canary_iv, vault_canary_ct FROM organizations WHERE id = ${orgId}`;
  const orgRow = orgRows[0];
  const vaultInitialized = !!orgRow?.vault_salt;
  let vault = null;
  if (vaultInitialized) {
    const credRows = await sql`SELECT * FROM vault_credentials WHERE org_id = ${orgId} ORDER BY id DESC`;
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
});

function fmtTime(d) {
  const dt = new Date(d);
  return String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
}
