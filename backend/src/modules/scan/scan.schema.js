import { z } from "zod";

export const scanTicketSchema = {
  body: z.object({
    qrToken: z.string().min(10, "QR token is required."),
    gate: z.string().min(1, "Gate name or turnstile ID is required.").max(64),
    deviceId: z.string().min(1, "Device ID is required.").max(128)
  })
};

export const manifestParamSchema = {
  params: z.object({
    eventId: z.string().uuid("Invalid event ID format.")
  })
};

export const scanSyncSchema = {
  body: z.object({
    eventId: z.string().uuid("Invalid event ID format."),
    scans: z.array(
      z.object({
        qrToken: z.string().min(10),
        gate: z.string().min(1).max(64),
        deviceId: z.string().min(1).max(128),
        scannedAt: z.string().datetime().or(z.date())
      })
    ).min(1, "At least one offline scan must be provided.")
  })
};

export const scanStatsParamSchema = {
  params: z.object({
    eventId: z.string().uuid("Invalid event ID format.")
  })
};
