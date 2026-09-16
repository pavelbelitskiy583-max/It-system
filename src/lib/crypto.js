// Криптографические утилиты на Web Crypto API.
// Пароли пользователей хешируются (SHA-256 + соль).
// Записи в "Доступах" шифруются AES-GCM ключом, производным (PBKDF2) от парольной фразы сейфа.

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function fromB64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
function randomBytes(len) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

/* ---------- password hashing (users) ---------- */
export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? fromB64(saltB64) : randomBytes(16).buffer;
  const enc = new TextEncoder();
  const data = new Uint8Array([...new Uint8Array(salt), ...enc.encode(password)]);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return { hash: toB64(digest), salt: toB64(salt) };
}
export async function verifyPassword(password, hash, salt) {
  const { hash: h2 } = await hashPassword(password, salt);
  return h2 === hash;
}

/* ---------- AES-GCM for vault ---------- */
async function deriveKey(passphrase, saltB64) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations: 120000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function newVaultSalt() {
  return toB64(randomBytes(16));
}

export async function vaultEncrypt(passphrase, saltB64, plaintext) {
  const key = await deriveKey(passphrase, saltB64);
  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function vaultDecrypt(passphrase, saltB64, payload) {
  const key = await deriveKey(passphrase, saltB64);
  const dec = new TextDecoder();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(payload.iv) }, key, fromB64(payload.ct));
  return dec.decode(pt);
}

export async function vaultCanaryCheck(passphrase, saltB64, canary) {
  try {
    const val = await vaultDecrypt(passphrase, saltB64, canary);
    return val === "ECHOIT-VAULT-OK";
  } catch {
    return false;
  }
}

export async function makeVaultCanary(passphrase, saltB64) {
  return vaultEncrypt(passphrase, saltB64, "ECHOIT-VAULT-OK");
}
