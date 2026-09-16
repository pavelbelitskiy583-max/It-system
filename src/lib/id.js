export function makeId(prefix = "id") {
  const rnd = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}

export function genPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}
