const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function fetchHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("Failed to fetch API health");
  }

  return response.json();
}
