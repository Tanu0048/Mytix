import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes.js";
import { webhookRouter } from "./modules/webhooks/webhook.routes.js";
import { env } from "./config/env.js";

const app = express();

// Trust reverse proxy (required for Render so rate-limiters get real client IP)
app.set("trust proxy", 1);

// 1. Security Headers & CORS
app.use(helmet());

const allowedOrigins = (env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (env.FRONTEND_URL && !allowedOrigins.includes(env.FRONTEND_URL)) {
  allowedOrigins.push(env.FRONTEND_URL);
}
if (env.ADMIN_URL && !allowedOrigins.includes(env.ADMIN_URL)) {
  allowedOrigins.push(env.ADMIN_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (env.NODE_ENV === "development" || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not permitted.`));
    },
    credentials: true
  })
);


// 2. Stripe Webhook mounted BEFORE express.json() to preserve raw body buffer
app.use("/api/v1/webhooks", webhookRouter);

// 3. Body Parsing & Cookies for application routes
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// 3. Structured Request Logging
app.use(requestLogger);

// 4. API Documentation & Health Check
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 5. Mount API v1 Routes
app.use("/api/v1", apiRoutes);

// 6. 404 and Global Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;