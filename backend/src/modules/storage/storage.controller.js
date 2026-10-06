import { asyncHandler } from "../../utils/asyncHandler.js";
import * as storageService from "./storage.service.js";

export const uploadImageHandler = asyncHandler(async (req, res) => {
  const folder = req.query.folder || "posters";
  const result = await storageService.uploadEventImage(req.file, folder);
  res.status(201).json({
    status: "success",
    data: result
  });
});
