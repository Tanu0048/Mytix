import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import catalogRoutes from "./modules/catalog/catalog.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import organiserRoutes from "./modules/organiser/organiser.routes.js";
import { holdRouter } from "./modules/holds/hold.routes.js";
import { storageRouter } from "./modules/storage/storage.routes.js";

import { checkoutRouter } from "./modules/checkout/checkout.routes.js";
import { orderRouter } from "./modules/orders/order.routes.js";
import { ticketRouter } from "./modules/tickets/ticket.routes.js";
import { scanRouter } from "./modules/scan/scan.routes.js";
import { bannerRouter } from "./modules/banners/banner.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

const router = Router();

// Authentication endpoints
router.use("/auth", authRoutes);

// User account endpoints
router.use("/me", userRoutes);

// Public banners carousel endpoint
router.use("/banners", bannerRouter);

// Public catalog endpoints (home, events, artists, venues, organisers)
router.use("/", catalogRoutes);

// Full-text search endpoint
router.use("/search", searchRoutes);

// High-concurrency inventory reservation endpoints
router.use("/holds", holdRouter);

// Checkout and pricing pipeline
router.use("/checkout", checkoutRouter);

// Orders lookup endpoints
router.use("/orders", orderRouter);

// E-Tickets rendering and lookup
router.use("/tickets", ticketRouter);

// Turnstile scanning, manifests, and offline sync
router.use("/scan", scanRouter);

// File uploads endpoints (posters, banners)
router.use("/uploads", storageRouter);

// Organiser portal endpoints
router.use("/organiser", organiserRoutes);

// Admin portal endpoints
router.use("/admin", adminRouter);

export default router;
