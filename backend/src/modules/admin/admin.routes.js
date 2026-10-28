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
  listOrdersQuerySchema,
  cancelEventSchema
} from "./admin.schema.js";

export const adminRouter = Router();


// Enforce authentication and strictly ADMIN role for all routes in this module
adminRouter.use(authenticate, authorize("ADMIN"));

// ----------------------------------------------------
// CATEGORIES (Master List)
// ----------------------------------------------------
adminRouter.get("/categories", adminController.listCategories);
adminRouter.post("/categories", adminController.createCategory);
adminRouter.delete("/categories/:id", adminController.deleteCategory);

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
adminRouter.delete("/organisers/:id", adminController.deleteOrganiser);

// ----------------------------------------------------
// GLOBAL ORDERS (Support & Inquiries)
// ----------------------------------------------------
adminRouter.get("/orders", validate(listOrdersQuerySchema), adminController.listOrders);
adminRouter.get("/orders/:id", adminController.getOrderDetails);

// ----------------------------------------------------
// EVENT CANCELLATION & BULK REFUNDS (Admin-only)
// ----------------------------------------------------
adminRouter.post("/events/:id/cancel", validate(cancelEventSchema), adminController.cancelEvent);

// ----------------------------------------------------
// PLATFORM TERMS & CONDITIONS (Super-Admin only)
// ----------------------------------------------------
adminRouter.get("/terms", adminController.getTerms);
adminRouter.put("/terms", adminController.updateTerms);

// ----------------------------------------------------
// SOCIAL MEDIA LINKS (Super-Admin only)
// ----------------------------------------------------
adminRouter.get("/social-links", adminController.getSocialLinks);
adminRouter.put("/social-links", adminController.updateSocialLinks);

// ----------------------------------------------------
// CITY IMAGES (Super-Admin only)
// ----------------------------------------------------
adminRouter.get("/city-images", adminController.getCityImages);
adminRouter.put("/city-images", adminController.updateCityImages);

// ----------------------------------------------------
// ABOUT US PAGE (Super-Admin CMS)
// ----------------------------------------------------
adminRouter.get("/about-us", adminController.getAboutUs);
adminRouter.put("/about-us", adminController.updateAboutUs);

// ----------------------------------------------------
// CONTACT US PAGE (Super-Admin CMS)
// ----------------------------------------------------
adminRouter.get("/contact-us", adminController.getContactUs);
adminRouter.put("/contact-us", adminController.updateContactUs);

// ----------------------------------------------------
// FAQ (Super-Admin CMS)
// ----------------------------------------------------
adminRouter.get("/faq", adminController.getFaq);
adminRouter.put("/faq", adminController.updateFaq);

// ----------------------------------------------------
// ORGANISER REQUIREMENTS (Super-Admin CMS)
// ----------------------------------------------------
adminRouter.get("/organiser-requirements", adminController.getOrganiserRequirements);
adminRouter.put("/organiser-requirements", adminController.updateOrganiserRequirements);


// ----------------------------------------------------
// TRENDING EVENTS (Super-Admin Observability)
// ----------------------------------------------------
adminRouter.get("/events/trending", adminController.getTrendingEvents);
