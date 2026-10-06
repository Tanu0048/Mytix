import * as bannerService from "./banner.service.js";

export async function getBanners(_req, res, next) {
  try {
    const banners = await bannerService.getActiveBanners();
    res.status(200).json({
      success: true,
      data: banners
    });
  } catch (error) {
    next(error);
  }
}
