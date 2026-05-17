const API_URL = import.meta.env.VITE_API_URL || "/api";

const AUTH_TOKEN_KEY = "goalverse_auth_token";
const AUTH_USER_KEY = "goalverse_auth_user";

export function saveAuthSession({ token, user }) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthUser() {
  const user = localStorage.getItem(AUTH_USER_KEY);

  return user ? JSON.parse(user) : null;
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  saveAuthSession(data);
  return data;
}

export async function logoutUser() {
  const token = getAuthToken();

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } finally {
    clearAuthSession();
  }
}
