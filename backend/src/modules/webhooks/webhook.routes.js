import { Router } from "express";
import express from "express";
import { stripeWebhookHandler } from "./webhook.controller.js";

export const webhookRouter = Router();

// Stripe requires raw unparsed body for cryptographic HMAC-SHA256 signature validation
webhookRouter.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);
