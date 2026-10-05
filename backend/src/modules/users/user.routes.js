import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  changePasswordSchema,
  updateProfileSchema,
  followArtistSchema,
  paginationQuerySchema
} from "./user.schema.js";

const router = Router();

router.get("/", authenticate, userController.getProfile);
router.patch("/", authenticate, validate(updateProfileSchema), userController.updateProfile);
router.post("/change-password", authenticate, validate(changePasswordSchema), userController.changePassword);
router.get("/orders", authenticate, validate(paginationQuerySchema), userController.getOrders);
router.get("/tickets", authenticate, validate(paginationQuerySchema), userController.getTickets);
router.get("/follows", authenticate, userController.getFollows);
router.post("/follows", authenticate, validate(followArtistSchema), userController.follow);
router.delete("/follows/:artistId", authenticate, userController.unfollow);
router.delete("/", authenticate, userController.deleteAccount);

export default router;
