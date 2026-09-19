import { withApi, requireSession, requireModule, sql, ApiError } from "./_lib/context.js";
import { makeId } from "./_lib/auth.js";

function fmtTime(d) {
  const dt = new Date(d);
  return String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
}

export default withApi(async (req, res) => {
  const me = await requireSession(req);
  requireModule(me, "messenger");

  if (req.method === "GET") {
    const chRows = await sql`SELECT * FROM channels WHERE org_id = ${me.org_id} ORDER BY id`;
    const channels = chRows.map((c) => ({ id: c.id, name: c.name, desc: c.description || "", branchId: c.branch_id }));
    const chIds = chRows.map((c) => c.id);
    const msgRows = chIds.length ? await sql`SELECT * FROM messages WHERE channel_id = ANY(${chIds}) ORDER BY id ASC` : [];
    const messages = {};
    for (const c of channels) messages[c.id] = [];
    for (const m of msgRows) messages[m.channel_id].push({ id: m.id, author: m.author_name, text: m.text, time: fmtTime(m.created_at) });
    return res.status(200).json({ channels, messages });
  }

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");
  const { action } = req.body || {};

  if (action === "create-channel") {
    const { name, desc } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, "Укажите название канала");
    const id = makeId("ch");
    const label = name.trim().startsWith("#") ? name.trim() : `# ${name.trim()}`;
    await sql`INSERT INTO channels (id, org_id, name, description) VALUES (${id}, ${me.org_id}, ${label}, ${desc || ""})`;
    return res.status(201).json({ id });
  }

  if (action === "send") {
    const { channelId, text } = req.body || {};
    if (!text?.trim()) throw new ApiError(400, "Пустое сообщение");
    const id = makeId("msg");
    await sql`INSERT INTO messages (id, channel_id, author_id, author_name, text) VALUES (${id}, ${channelId}, ${me.id}, ${me.name}, ${text.trim()})`;
    return res.status(201).json({ id });
  }

  throw new ApiError(400, "Неизвестное действие");
});
