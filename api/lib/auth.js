import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { parse, serialize } from "cookie";

const COOKIE_NAME = "echoit_session";
const JWT_SECRET = process.env.JWT_SECRET || "echoit-dev-insecure-secret-change-me";

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET не задан — используется небезопасный ключ по умолчанию. Добавьте JWT_SECRET в переменные окружения Vercel.");
}

export const ALL_MODULES = [
  "warehouse", "cartridges", "equipment", "tasks", "messenger", "vault", "settings",
];

export function makeId(prefix = "id") {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}

export function genPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export function signSession(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}
export function verifySession(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  }));
}
export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", serialize(COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 }));
}
export function getSessionFromReq(req) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token); // { orgId, userId, role }
}

export function fullPermissions() {
  const p = {};
  for (const m of ALL_MODULES) p[m] = true;
  return p;
}
export function emptyPermissions() {
  const p = {};
  for (const m of ALL_MODULES) p[m] = false;
  return p;
}

export function can(session, userRecord, moduleId) {
  if (!session) return false;
  if (userRecord.role === "admin") return true;
  return !!userRecord.permissions?.[moduleId];
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
