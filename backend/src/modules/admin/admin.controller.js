import * as adminService from "./admin.service.js";

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
