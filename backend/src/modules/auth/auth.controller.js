import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";
import { env } from "../../config/env.js";

const isProduction = env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {})
};


function attachAuthCookies(res, accessToken, refreshToken) {
  res.cookie("access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
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

function isMobileClient(req) {
  const platform = req.headers["x-client-platform"] || req.headers["x-client-type"] || req.body?.clientPlatform;
  if (platform && typeof platform === "string" && platform.toLowerCase() === "mobile") {
    return true;
  }

  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  if (
    userAgent.includes("okhttp") ||
    userAgent.includes("expo") ||
    userAgent.includes("reactnative") ||
    userAgent.includes("react-native")
  ) {
    return true;
  }

  return false;
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  attachAuthCookies(res, result.accessToken, result.refreshToken);

  const responseData = {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    },
    tokens: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    token: result.accessToken
  };

  res.status(201).json(responseData);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  attachAuthCookies(res, result.accessToken, result.refreshToken);

  const responseData = {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    },
    tokens: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    token: result.accessToken
  };

  res.status(200).json(responseData);
});

export const googleAuth = asyncHandler(async (req, res) => {
  const result = await authService.loginWithGoogle(req.body);
  attachAuthCookies(res, result.accessToken, result.refreshToken);

  const responseData = {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    }
  };

  if (isMobileClient(req)) {
    responseData.tokens = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    };
  }

  res.status(200).json(responseData);
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  const result = await authService.refreshSession(rawRefreshToken);
  attachAuthCookies(res, result.accessToken, result.refreshToken);

  const responseData = {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    }
  };

  if (isMobileClient(req) || req.body?.refreshToken) {
    responseData.tokens = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    };
  }

  res.status(200).json(responseData);
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
