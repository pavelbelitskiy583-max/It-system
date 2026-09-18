import { withApi, requireSession, requireModule, sql, ApiError } from "./_lib/context.js";
import { makeId } from "./_lib/auth.js";

export default withApi(async (req, res) => {
  const me = await requireSession(req);
  requireModule(me, "tasks");

  if (req.method === "GET") {
    const rows = await sql`SELECT * FROM tasks WHERE org_id = ${me.org_id} ORDER BY created_at DESC`;
    return res.status(200).json(rows.map((t) => ({
      id: t.id, title: t.title, branchId: t.branch_id, prio: t.prio, assignee: t.assignee,
      status: t.status, createdBy: t.created_by, date: t.created_at,
    })));
  }

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");
  const { action } = req.body || {};

  if (action === "create") {
    const { title, branchId, prio, assignee } = req.body || {};
    if (!title?.trim()) throw new ApiError(400, "Введите название задачи");
    const id = makeId("tk");
    await sql`INSERT INTO tasks (id, org_id, title, branch_id, prio, assignee, status, created_by)
              VALUES (${id}, ${me.org_id}, ${title.trim()}, ${branchId || null}, ${prio || "md"}, ${assignee || me.name}, 'new', ${me.name})`;
    return res.status(201).json({ id });
  }

  if (action === "update") {
    const { id, status } = req.body || {};
    if (status) await sql`UPDATE tasks SET status = ${status} WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  if (action === "delete") {
    const { id } = req.body || {};
    await sql`DELETE FROM tasks WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  throw new ApiError(400, "Неизвестное действие");
});
