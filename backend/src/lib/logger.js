import winston from "winston";

const sensitiveKeys = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "secret",
  "authorization",
  "cookie",
  "cardNumber",
  "cvv",
  "qrToken",
  "qrTokenHash"
]);

function redactSensitiveData(obj) {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.has(key)) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

const redactFormat = winston.format((info) => {
  return redactSensitiveData(info);
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    redactFormat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});
