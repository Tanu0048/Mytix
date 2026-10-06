import crypto from "crypto";
import path from "path";
import { getStorageProvider } from "../../providers/storage/index.js";
import { STORAGE_BUCKETS } from "../../config/constants.js";
import { AppError } from "../../utils/errors.js";

export async function uploadEventImage(file, subfolder = "general") {
  if (!file || !file.buffer) {
    throw new AppError("FILE_REQUIRED", 400, "An image file is required.");
  }

  const storage = getStorageProvider();
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const uniqueId = crypto.randomUUID();
  const sanitizedFolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, "");
  const destinationPath = `${sanitizedFolder}/${Date.now()}-${uniqueId}${ext}`;

  const result = await storage.upload({
    bucket: STORAGE_BUCKETS.IMAGES,
    path: destinationPath,
    fileBuffer: file.buffer,
    mimeType: file.mimetype,
    isPublic: true
  });

  return {
    bucket: STORAGE_BUCKETS.IMAGES,
    path: result.path,
    url: result.url,
    sizeBytes: file.size,
    mimeType: file.mimetype
  };
}

export async function uploadTicketPdf(fileBuffer, orderId, ticketId) {
  const storage = getStorageProvider();
  const destinationPath = `orders/${orderId}/ticket-${ticketId}.pdf`;

  const result = await storage.upload({
    bucket: STORAGE_BUCKETS.TICKETS,
    path: destinationPath,
    fileBuffer,
    mimeType: "application/pdf",
    isPublic: false
  });

  return {
    bucket: STORAGE_BUCKETS.TICKETS,
    path: result.path
  };
}

export async function getTicketDownloadUrl(filePath, expiresInSeconds = 3600) {
  const storage = getStorageProvider();
  return storage.createSignedUrl({
    bucket: STORAGE_BUCKETS.TICKETS,
    path: filePath,
    expiresInSeconds
  });
}
