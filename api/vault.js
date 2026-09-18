import { withApi, requireSession, requireAdmin, requireModule, sql, ApiError } from "./_lib/context.js";
import { makeId } from "./_lib/auth.js";

export default withApi(async (req, res) => {
  const me = await requireSession(req);
  requireModule(me, "vault");

  if (req.method === "GET") {
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

  if (req.method !== "POST") throw new ApiError(400, "Метод не поддерживается для этого адреса");
  const { action } = req.body || {};

  if (action === "setup") {
    requireAdmin(me);
    const { salt, canary } = req.body || {};
    if (!salt || !canary?.iv || !canary?.ct) throw new ApiError(400, "Некорректные данные сейфа");
    await sql`UPDATE organizations SET vault_salt = ${salt}, vault_canary_iv = ${canary.iv}, vault_canary_ct = ${canary.ct} WHERE id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  if (action === "add-credential") {
    requireAdmin(me);
    const { title, login, url, note, passEnc, visibleTo } = req.body || {};
    if (!title?.trim() || !passEnc?.iv || !passEnc?.ct) throw new ApiError(400, "Заполните название и пароль");
    const id = makeId("cr");
    await sql`INSERT INTO vault_credentials (id, org_id, title, login, url, note, pass_iv, pass_ct, visible_to)
              VALUES (${id}, ${me.org_id}, ${title.trim()}, ${login || ""}, ${url || ""}, ${note || ""}, ${passEnc.iv}, ${passEnc.ct}, ${JSON.stringify(visibleTo || [])}::jsonb)`;
    return res.status(201).json({ id });
  }

  if (action === "update-visibility") {
    requireAdmin(me);
    const { id, visibleTo } = req.body || {};
    await sql`UPDATE vault_credentials SET visible_to = ${JSON.stringify(visibleTo || [])}::jsonb WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  if (action === "delete-credential") {
    requireAdmin(me);
    const { id } = req.body || {};
    await sql`DELETE FROM vault_credentials WHERE id = ${id} AND org_id = ${me.org_id}`;
    return res.status(200).json({ ok: true });
  }

  throw new ApiError(400, "Неизвестное действие");
});
