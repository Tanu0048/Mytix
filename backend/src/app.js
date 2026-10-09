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

const app = express();

// 1. Security Headers & CORS
app.use(helmet());
app.use(
  cors({
    origin: "*",
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
