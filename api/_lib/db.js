// Подключение к базе данных (Vercel Postgres / Neon) через HTTP-драйвер,
// который отлично работает в serverless-функциях без пула соединений.
import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error(
    "Не найдена переменная окружения с адресом базы данных (DATABASE_URL / POSTGRES_URL). " +
    "Подключите Vercel Postgres (Storage → Create Database) к проекту."
  );
}

export const sql = neon(connectionString);

// Схема создаётся лениво при первом обращении к БД в рамках "тёплого" инстанса функции.
let schemaReady = null;

// Миграции недостающих колонок. Выполняются при КАЖДОМ вызове ensureSchema
// (не кешируются), потому что ADD COLUMN IF NOT EXISTS мгновенный и идемпотентный,
// а таблицы могли быть созданы раньше — до добавления этих колонок.
async function runColumnMigrations() {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
}

export async function ensureSchema() {
  if (schemaReady) { await schemaReady; await runColumnMigrations(); return schemaReady; }
  schemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      vault_salt TEXT,
      vault_canary_iv TEXT,
      vault_canary_ct TEXT
    )`;

    await sql`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      login TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      branch_id TEXT,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      pass_hash TEXT NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS pending_verifications (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      payload JSONB NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      city TEXT
    )`;

    await sql`CREATE TABLE IF NOT EXISTS floors (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    )`;

    await sql`CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    )`;

    await sql`CREATE TABLE IF NOT EXISTS warehouse_items (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      cat TEXT,
      qty INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'шт',
      branch_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS cartridges (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      model TEXT NOT NULL,
      printer TEXT,
      min_qty INTEGER NOT NULL DEFAULT 0
    )`;

    await sql`CREATE TABLE IF NOT EXISTS cartridge_stock (
      cartridge_id TEXT NOT NULL REFERENCES cartridges(id) ON DELETE CASCADE,
      branch_id TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (cartridge_id, branch_id)
    )`;

    await sql`CREATE TABLE IF NOT EXISTS cartridge_events (
      id TEXT PRIMARY KEY,
      cartridge_id TEXT NOT NULL REFERENCES cartridges(id) ON DELETE CASCADE,
      branch_id TEXT NOT NULL,
      type TEXT NOT NULL,
      qty INTEGER NOT NULL,
      note TEXT,
      author TEXT,
      confirmed BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      type TEXT,
      model TEXT,
      inv TEXT,
      branch_id TEXT,
      floor_id TEXT,
      room_id TEXT,
      user_name TEXT,
      status TEXT NOT NULL DEFAULT 'work',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      branch_id TEXT,
      prio TEXT NOT NULL DEFAULT 'md',
      assignee TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      branch_id TEXT
    )`;

    await sql`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      author_id TEXT,
      author_name TEXT,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS vault_credentials (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      login TEXT,
      url TEXT,
      note TEXT,
      pass_iv TEXT,
      pass_ct TEXT,
      visible_to JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  })();
  await schemaReady;
  await runColumnMigrations();
  return schemaReady;
}
