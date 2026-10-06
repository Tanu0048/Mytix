import multer from "multer";
import { env } from "../config/env.js";
import { MAX_FILE_SIZE_BYTES } from "../config/constants.js";
import { AppError } from "../utils/errors.js";

const memoryStorage = multer.memoryStorage();

const imageFileFilter = (_req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "INVALID_FILE_TYPE",
        400,
        `Invalid file type '${file.mimetype}'. Allowed image formats are JPEG, PNG, and WebP.`
      ),
      false
    );
  }
};

const imageUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter: imageFileFilter
});

export const uploadSingleImage = (fieldName = "image") => {
  const upload = imageUpload.single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new AppError(
              "FILE_TOO_LARGE",
              413,
              `Uploaded file exceeds the maximum allowed size of ${env.MAX_FILE_SIZE_MB} MB.`
            )
          );
        }
        return next(new AppError("UPLOAD_ERROR", 400, err.message));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};
