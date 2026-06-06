const API_BASE = "http://127.0.0.1:8787";
const TOKEN_KEY = "hash_treasure_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "request_failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function login(email, password) {
  const data = await api("/auth/login", { method: "POST", body: { email, password } });
  setToken(data.token);
  return data.user;
}

export async function register(email, password) {
  const data = await api("/auth/register", { method: "POST", body: { email, password } });
  setToken(data.token);
  return data.user;
}

export async function me() {
  const data = await api("/auth/me");
  return data.user;
}
