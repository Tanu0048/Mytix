import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { prisma } from "../lib/prisma.js";

export async function authenticate(req, _res, next) {
  let token = req.cookies?.access_token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("LOGIN_REQUIRED", 401, "Authentication is required to perform this action."));
  }

  try {
    const payload = verifyAccessToken(token);
    let role = payload.role;

    // Fetch live role from DB so role promotions (e.g. to ADMIN) reflect immediately without requiring re-login
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { role: true }
      });
      if (dbUser?.role) {
        role = dbUser.role;
      }
    } catch {
      // Fallback gracefully to token role if DB query fails
    }

    req.user = {
      id: payload.sub,
      role,
      email: payload.email
    };
    next();
  } catch (err) {
    next(err);
  }
}
