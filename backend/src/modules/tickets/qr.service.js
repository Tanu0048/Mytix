import crypto from "crypto";
import QRCode from "qrcode";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";

/**
 * Parses a base64 DER Ed25519 key into a Node crypto KeyObject.
 */
function getPrivateKeyObject() {
  const rawKey = env.TICKET_ED25519_PRIVATE_KEY;
  if (!rawKey) {
    throw new AppError("CRYPTO_KEY_MISSING", 500, "TICKET_ED25519_PRIVATE_KEY is not configured.");
  }
  const keyBuffer = Buffer.from(rawKey, "base64");
  return crypto.createPrivateKey({
    key: keyBuffer,
    format: "der",
    type: "pkcs8"
  });
}

function getPublicKeyObject() {
  const rawKey = env.TICKET_ED25519_PUBLIC_KEY;
  if (!rawKey) {
    throw new AppError("CRYPTO_KEY_MISSING", 500, "TICKET_ED25519_PUBLIC_KEY is not configured.");
  }
  const keyBuffer = Buffer.from(rawKey, "base64");
  return crypto.createPublicKey({
    key: keyBuffer,
    format: "der",
    type: "spki"
  });
}

/**
 * Generates an Ed25519 cryptographically signed token for offline ticket verification.
 * Structure: base64(payload) + "." + base64(signature)
 */
export function generateSignedQrToken({ ticketId, eventId, orderId }) {
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = JSON.stringify({
    t: ticketId,
    e: eventId,
    o: orderId,
    n: nonce,
    iat: Math.floor(Date.now() / 1000)
  });

  const payloadB64 = Buffer.from(payload).toString("base64url");
  const privateKey = getPrivateKeyObject();

  const signature = crypto.sign(null, Buffer.from(payloadB64), privateKey);
  const signatureB64 = signature.toString("base64url");

  const token = `${payloadB64}.${signatureB64}`;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  return { token, tokenHash };
}

/**
 * Cryptographically verifies an Ed25519 signed QR token (fully functional offline).
 */
export function verifySignedQrToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { valid: false, error: "MALFORMED_TOKEN" };

    const [payloadB64, signatureB64] = parts;
    const publicKey = getPublicKeyObject();

    const signature = Buffer.from(signatureB64, "base64url");
    const isVerified = crypto.verify(null, Buffer.from(payloadB64), publicKey, signature);

    if (!isVerified) {
      return { valid: false, error: "INVALID_SIGNATURE" };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    return {
      valid: true,
      ticketId: payload.t,
      eventId: payload.e,
      orderId: payload.o,
      tokenHash
    };
  } catch (err) {
    logger.warn("QR token verification failed", { error: err.message });
    return { valid: false, error: err.message };
  }
}

/**
 * Renders the signed QR token into a base64 Data URI image for embedding in HTML.
 */
export async function renderQrCodeDataUri(token) {
  try {
    return await QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 250,
      color: {
        dark: "#000000",
        light: "#ffffff"
      }
    });
  } catch (err) {
    logger.error("Failed to render QR Code Data URI", { error: err.message });
    throw new AppError("QR_RENDER_FAILED", 500, "Failed to generate QR barcode.");
  }
}
