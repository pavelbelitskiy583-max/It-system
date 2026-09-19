import { withApi, requireSession, requireAdmin, sql } from "./_lib/context.js";

export default withApi(async (req, res) => {
  const me = await requireSession(req);
  requireAdmin(me);
  const orgId = me.org_id;

  const orgRows = await sql`SELECT id, name FROM organizations WHERE id = ${orgId}`;
  const org = orgRows[0] ? { id: orgRows[0].id, name: orgRows[0].name, createdAt: null } : null;
  const users = await sql`SELECT id, login, name, role, branch_id, permissions, must_change_password FROM users WHERE org_id = ${orgId}`;
  const branches = await sql`SELECT * FROM branches WHERE org_id = ${orgId}`;
  const warehouse = await sql`SELECT * FROM warehouse_items WHERE org_id = ${orgId}`;
  const cartridges = await sql`SELECT * FROM cartridges WHERE org_id = ${orgId}`;
  const equipment = await sql`SELECT * FROM equipment WHERE org_id = ${orgId}`;
  const tasks = await sql`SELECT * FROM tasks WHERE org_id = ${orgId}`;
  const channels = await sql`SELECT * FROM channels WHERE org_id = ${orgId}`;
  const vaultCredentials = await sql`SELECT * FROM vault_credentials WHERE org_id = ${orgId}`;

  return res.status(200).json({
    exportedAt: new Date().toISOString(),
    org, users, branches, warehouse, cartridges, equipment, tasks, channels, vaultCredentials,
  });
});
