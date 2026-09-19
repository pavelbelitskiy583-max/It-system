import { sql, ensureSchema, resetSchemaCache } from "./_lib/db.js";

// СЛУЖЕБНЫЙ ЭНДПОИНТ: полностью пересоздаёт схему базы данных с нуля.
// Защищён секретным ключом (RESET_SECRET или JWT_SECRET).
// Использование: открыть в браузере https://<домен>/api/reset-db?key=<секрет>

export default async function handler(req, res) {
  try {
    const key = req.query?.key;
    const expected = process.env.RESET_SECRET || process.env.JWT_SECRET;
    if (!expected || key !== expected) {
      return res.status(403).json({ error: "Неверный ключ. Используйте ?key=<JWT_SECRET>" });
    }

    await sql`DROP TABLE IF EXISTS messages CASCADE`;
    await sql`DROP TABLE IF EXISTS channels CASCADE`;
    await sql`DROP TABLE IF EXISTS vault_credentials CASCADE`;
    await sql`DROP TABLE IF EXISTS cartridge_events CASCADE`;
    await sql`DROP TABLE IF EXISTS cartridge_stock CASCADE`;
    await sql`DROP TABLE IF EXISTS cartridges CASCADE`;
    await sql`DROP TABLE IF EXISTS equipment CASCADE`;
    await sql`DROP TABLE IF EXISTS warehouse_items CASCADE`;
    await sql`DROP TABLE IF EXISTS rooms CASCADE`;
    await sql`DROP TABLE IF EXISTS floors CASCADE`;
    await sql`DROP TABLE IF EXISTS branches CASCADE`;
    await sql`DROP TABLE IF EXISTS tasks CASCADE`;
    await sql`DROP TABLE IF EXISTS pending_verifications CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP TABLE IF EXISTS organizations CASCADE`;

    resetSchemaCache();
    await ensureSchema();

    return res.status(200).json({
      ok: true,
      message: "База пересоздана с нуля. Теперь зарегистрируйте организацию заново.",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Ошибка при пересоздании базы" });
  }
}
