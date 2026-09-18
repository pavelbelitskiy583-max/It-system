// Тонкая обёртка над fetch: JSON-запросы к serverless API, с cookie-сессией.
// Все эндпоинты — плоские файлы (без динамических сегментов пути); конкретное
// действие передаётся полем "action" в теле POST-запроса.

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* тело может быть пустым */ }
  if (!res.ok) {
    throw new Error(data?.error || `Ошибка запроса (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body: body ?? {} }),
};
