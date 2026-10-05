import { Router } from "express";
import * as searchController from "./search.controller.js";
import { validate } from "../../middleware/validate.js";
import { publicLimiter } from "../../middleware/rateLimit.js";
import { searchSchema } from "./search.schema.js";

const router = Router();

router.get("/", publicLimiter, validate(searchSchema), searchController.search);

export default router;
