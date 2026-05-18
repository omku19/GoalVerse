const API_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const AUTH_TOKEN_KEY = "goalverse_auth_token";
const AUTH_USER_KEY = "goalverse_auth_user";
const AUTH_LAST_ACTIVE_KEY = "goalverse_auth_last_active";
const configuredIdleMinutes = Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES);
const SESSION_IDLE_TIMEOUT_MS = (Number.isFinite(configuredIdleMinutes) && configuredIdleMinutes > 0 ? configuredIdleMinutes : 30) * 60 * 1000;

function emitAuthExpired() {
  window.dispatchEvent(new CustomEvent("goalverse:auth-expired"));
}

export function touchAuthSession() {
  if (getAuthToken()) {
    localStorage.setItem(AUTH_LAST_ACTIVE_KEY, String(Date.now()));
  }
}

export function isAuthSessionIdleExpired() {
  const lastActive = Number(localStorage.getItem(AUTH_LAST_ACTIVE_KEY) || Date.now());
  return Boolean(getAuthToken() && Date.now() - lastActive > SESSION_IDLE_TIMEOUT_MS);
}

export function saveAuthSession({ token, user }) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  touchAuthSession();
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthUser() {
  const user = localStorage.getItem(AUTH_USER_KEY);

  try {
    return user ? JSON.parse(user) : null;
  } catch (_error) {
    clearAuthSession();
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_LAST_ACTIVE_KEY);
}

export async function fetchHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("Failed to fetch API health");
  }

  return response.json();
}

export async function loginUser(credentials) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    throw new Error("Server returned invalid JSON");
  }

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  saveAuthSession(data);
  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();

  if (!token || isAuthSessionIdleExpired()) {
    clearAuthSession();
    throw new Error("Authentication required");
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_parseError) {
    clearAuthSession();
    emitAuthExpired();
    throw new Error("Server returned invalid JSON");
  }

  if (!response.ok) {
    clearAuthSession();
    emitAuthExpired();
    throw new Error(data.message || "Authentication required");
  }

  if (data.user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    touchAuthSession();
  }

  return data.user;
}

export async function logoutUser() {
  const token = getAuthToken();

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } finally {
    clearAuthSession();
  }
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (isAuthSessionIdleExpired()) {
    clearAuthSession();
    emitAuthExpired();
    throw new Error("Session expired. Please sign in again.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      emitAuthExpired();
    }
    throw new Error(data.message || "Request failed");
  }

  touchAuthSession();
  return data.data ?? data;
}

export async function downloadReport(path, filename) {
  if (isAuthSessionIdleExpired()) {
    clearAuthSession();
    emitAuthExpired();
    throw new Error("Session expired. Please sign in again.");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      emitAuthExpired();
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Report download failed");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  touchAuthSession();
}
