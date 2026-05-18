import { getCurrentUserProfile, loginUser, revokeCurrentSession } from "../services/authService.js";

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

export async function logout(req, res, next) {
  try {
    await revokeCurrentSession(req.authSession);
  } catch (error) {
    return next(error);
  }

  res.status(200).json({
    message: "Logout successful",
  });
}

export async function me(req, res, next) {
  try {
    const user = await getCurrentUserProfile(req.user);

    return res.status(200).json({
      user,
    });
  } catch (error) {
    if (error.code === "UNAUTHORIZED") {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    return next(error);
  }
}
