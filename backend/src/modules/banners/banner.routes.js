import { Router } from "express";
import * as bannerController from "./banner.controller.js";

export const bannerRouter = Router();

bannerRouter.get("/", bannerController.getBanners);
