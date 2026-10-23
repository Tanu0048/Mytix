import * as adminService from "./admin.service.js";

// ----------------------------------------------------
// CATEGORIES
// ----------------------------------------------------

export async function listCategories(_req, res, next) {
  try {
    const categories = await adminService.listCategories();
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await adminService.createCategory(req.body);
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const result = await adminService.deleteCategory(req.params.id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// BANNERS
// ----------------------------------------------------

export async function listBanners(_req, res, next) {
  try {
    const banners = await adminService.listAllBanners();
    res.status(200).json({
      success: true,
      data: banners
    });
  } catch (error) {
    next(error);
  }
}

export async function createBanner(req, res, next) {
  try {
    const banner = await adminService.createBanner(req.body);
    res.status(201).json({
      success: true,
      data: banner
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBanner(req, res, next) {
  try {
    const banner = await adminService.updateBanner(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: banner
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBanner(req, res, next) {
  try {
    const result = await adminService.deleteBanner(req.params.id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// ORGANISERS
// ----------------------------------------------------

export async function createOrganiser(req, res, next) {
  try {
    const organiser = await adminService.createOrganiserAccount(req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: organiser
    });
  } catch (error) {
    next(error);
  }
}

export async function listOrganisers(req, res, next) {
  try {
    const result = await adminService.listOrganisers(req.query);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrganiserStatus(req, res, next) {
  try {
    const organiser = await adminService.updateOrganiserStatus(
      req.params.id,
      req.body.status,
      req.user.id
    );
    res.status(200).json({
      success: true,
      data: organiser
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteOrganiser(req, res, next) {
  try {
    const result = await adminService.deleteOrganiser(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function resetOrganiserPassword(req, res, next) {
  try {
    const result = await adminService.resetOrganiserPassword(
      req.params.id,
      req.body.newPassword,
      req.user.id
    );
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// GLOBAL ORDERS
// ----------------------------------------------------

export async function listOrders(req, res, next) {
  try {
    const result = await adminService.listGlobalOrders(req.query);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderDetails(req, res, next) {
  try {
    const order = await adminService.getGlobalOrderDetails(req.params.id);
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// EVENT CANCELLATION & BULK REFUNDS
// ----------------------------------------------------

export async function cancelEvent(req, res, next) {
  try {
    const result = await adminService.cancelEventAndRefundOrders(
      req.params.id,
      req.body?.reason,
      req.user.id
    );
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// TERMS & CONDITIONS (Super-Admin Platform Settings)
// ----------------------------------------------------

export async function getTerms(_req, res, next) {
  try {
    const terms = await adminService.getTermsAndConditions();
    res.status(200).json({
      success: true,
      data: terms
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTerms(req, res, next) {
  try {
    const updated = await adminService.updateTermsAndConditions(req.body);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// SOCIAL LINKS (Super-Admin Platform Settings)
// ----------------------------------------------------

export async function getSocialLinks(_req, res, next) {
  try {
    const links = await adminService.getSocialLinks();
    res.status(200).json({
      success: true,
      data: links
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSocialLinks(req, res, next) {
  try {
    const updated = await adminService.updateSocialLinks(req.body);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// CITY IMAGES (Super-Admin Platform Settings)
// ----------------------------------------------------

export async function getCityImages(_req, res, next) {
  try {
    const cityImages = await adminService.getCityImages();
    res.status(200).json({
      success: true,
      data: cityImages
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCityImages(req, res, next) {
  try {
    const updated = await adminService.updateCityImages(req.body);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// ABOUT US PAGE (Super-Admin CMS)
// ----------------------------------------------------

export async function getAboutUs(_req, res, next) {
  try {
    const aboutUs = await adminService.getAboutUs();
    res.status(200).json({
      success: true,
      data: aboutUs
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAboutUs(req, res, next) {
  try {
    const updated = await adminService.updateAboutUs(req.body);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// CONTACT US PAGE (Super-Admin CMS)
// ----------------------------------------------------

export async function getContactUs(_req, res, next) {
  try {
    const contactUs = await adminService.getContactUs();
    res.status(200).json({
      success: true,
      data: contactUs
    });
  } catch (error) {
    next(error);
  }
}

export async function updateContactUs(req, res, next) {
  try {
    const updated = await adminService.updateContactUs(req.body);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// FAQ (Super-Admin CMS)
// ----------------------------------------------------

export async function getFaq(_req, res, next) {
  try {
    const faq = await adminService.getFaq();
    res.status(200).json({
      success: true,
      data: faq
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFaq(req, res, next) {
  try {
    const updated = await adminService.updateFaq(req.body);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

