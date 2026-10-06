import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { uploadSingleImage } from "../../middleware/upload.js";
import { uploadImageHandler } from "./storage.controller.js";

export const storageRouter = Router();

// Only authenticated organisers and admins can upload media
storageRouter.post(
  "/image",
  authenticate,
  authorize("ORGANISER", "ADMIN"),
  uploadSingleImage("file"),
  uploadImageHandler
);
