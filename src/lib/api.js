// All React-to-PHP requests pass through this file. Require an explicit URL:
// a guessed fallback can silently talk to an older project in XAMPP.
const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const TOKEN_KEY = "penny_api_token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function apiUrl(path) {
  if (!baseUrl) throw new Error("Set VITE_API_BASE_URL in .env.local and restart React.");
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function assetUrl(path) {
  if (!path || !baseUrl) return null;
  // Uploaded photo paths are relative to PHP's public/ folder.
  return `${baseUrl.replace(/index\.php$/, "")}${path.replace(/^\//, "")}`;
}

export async function api(path, { method = "GET", body, token = getToken(), signal } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    signal,
  });

  // PHP wraps successful data in { status, data }. Check for failure before
  // any page updates its state or shows a success message.
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== "success") {
    const error = new Error(result?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.fields = result?.errors || {};
    throw error;
  }
  return result.data;
}
