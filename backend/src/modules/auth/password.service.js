import crypto from "crypto";
import argon2 from "argon2";

export async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });
}

export async function verifyPassword(passwordHash, plainPassword) {
  if (!passwordHash) {
    return false;
  }
  try {
    return await argon2.verify(passwordHash, plainPassword);
  } catch (_e) {
    return false;
  }
}

export function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
