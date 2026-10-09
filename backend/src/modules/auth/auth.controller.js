import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/"
};

function attachAuthCookies(res, accessToken, refreshToken) {
  res.cookie("access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie("refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

function clearAuthCookies(res) {
  res.clearCookie("access_token", COOKIE_OPTIONS);
  res.clearCookie("refresh_token", COOKIE_OPTIONS);
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  attachAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(201).json({
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  attachAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    }
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const result = await authService.loginWithGoogle(req.body);
  attachAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    }
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  const result = await authService.refreshSession(rawRefreshToken);
  attachAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  await authService.logoutSession(rawRefreshToken);
  clearAuthCookies(res);

  res.status(200).json({
    message: "Logged out successfully."
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.status(200).json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.executePasswordReset(req.body.token, req.body.password);
  clearAuthCookies(res);
  res.status(200).json(result);
});
