import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import catalogRoutes from "./modules/catalog/catalog.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import organiserRoutes from "./modules/organiser/organiser.routes.js";
import { holdRouter } from "./modules/holds/hold.routes.js";

const router = Router();

// Authentication endpoints
router.use("/auth", authRoutes);

// User account endpoints
router.use("/me", userRoutes);

// Public catalog endpoints (home, events, artists, venues, organisers)
router.use("/", catalogRoutes);

// Full-text search endpoint
router.use("/search", searchRoutes);

// High-concurrency inventory reservation endpoints
router.use("/holds", holdRouter);

// Organiser portal endpoints
router.use("/organiser", organiserRoutes);

export default router;
