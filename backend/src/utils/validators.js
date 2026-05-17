export function validateLoginInput(payload) {
  if (!payload || typeof payload !== "object") {
    return "Email and password are required";
  }

  if (!payload.email || typeof payload.email !== "string") {
    return "Email is required";
  }

  if (!payload.password || typeof payload.password !== "string") {
    return "Password is required";
  }

  const email = payload.email.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return "Email is invalid";
  }

  return null;
}
