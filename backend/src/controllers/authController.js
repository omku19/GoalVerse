import { loginUser } from "../services/authService.js";

export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    if (error.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    return next(error);
  }
}

export async function logout(_req, res) {
  res.status(200).json({
    message: "Logout successful",
  });
}
