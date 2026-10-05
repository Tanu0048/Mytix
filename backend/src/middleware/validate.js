import { AppError } from "../utils/errors.js";

export function validate(schema) {
  return (req, _res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      next();
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const issues = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        return next(new AppError("VALIDATION_ERROR", 400, `Validation failed: ${issues}`));
      }
      next(new AppError("VALIDATION_ERROR", 400, err.message || "Invalid request payload."));
    }
  };
}
