import { Router } from "express";
import * as adminController from "./admin.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createBannerSchema,
  updateBannerSchema,
  createOrganiserSchema,
  resetOrganiserPasswordSchema,
  updateOrganiserStatusSchema,
  listOrganisersQuerySchema,
  listOrdersQuerySchema
} from "./admin.schema.js";

export const adminRouter = Router();

// Enforce authentication and strictly ADMIN role for all routes in this module
adminRouter.use(authenticate, authorize("ADMIN"));

// ----------------------------------------------------
// BANNERS (Hero Slider)
// ----------------------------------------------------
adminRouter.get("/banners", adminController.listBanners);
adminRouter.post("/banners", validate(createBannerSchema), adminController.createBanner);
adminRouter.patch("/banners/:id", validate(updateBannerSchema), adminController.updateBanner);
adminRouter.delete("/banners/:id", adminController.deleteBanner);

// ----------------------------------------------------
// ORGANISERS (Provisioning, Approvals & Password Management)
// ----------------------------------------------------
adminRouter.post("/organisers", validate(createOrganiserSchema), adminController.createOrganiser);
adminRouter.get("/organisers", validate(listOrganisersQuerySchema), adminController.listOrganisers);
adminRouter.patch("/organisers/:id/status", validate(updateOrganiserStatusSchema), adminController.updateOrganiserStatus);
adminRouter.patch("/organisers/:id/reset-password", validate(resetOrganiserPasswordSchema), adminController.resetOrganiserPassword);

// ----------------------------------------------------
// GLOBAL ORDERS (Support & Inquiries)
// ----------------------------------------------------
adminRouter.get("/orders", validate(listOrdersQuerySchema), adminController.listOrders);
adminRouter.get("/orders/:id", adminController.getOrderDetails);
