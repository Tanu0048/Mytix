import { asyncHandler } from "../../utils/asyncHandler.js";
import * as userService from "./user.service.js";

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getUserProfile(req.user.id);
  res.status(200).json(profile);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updated = await userService.updateUserProfile(req.user.id, req.body);
  res.status(200).json(updated);
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await userService.changeUserPassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword
  );

  res.cookie("refresh_token", result.newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  res.status(200).json({ message: result.message });
});

export const getOrders = asyncHandler(async (req, res) => {
  const orders = await userService.getUserOrders(req.user.id, req.query);
  res.status(200).json(orders);
});

export const getTickets = asyncHandler(async (req, res) => {
  const tickets = await userService.getUserTickets(req.user.id, req.query);
  res.status(200).json(tickets);
});

export const getFollows = asyncHandler(async (req, res) => {
  const follows = await userService.getUserFollows(req.user.id);
  res.status(200).json({ follows });
});

export const follow = asyncHandler(async (req, res) => {
  const result = await userService.followArtist(req.user.id, req.body.artistId);
  res.status(200).json(result);
});

export const unfollow = asyncHandler(async (req, res) => {
  const result = await userService.unfollowArtist(req.user.id, req.params.artistId);
  res.status(200).json(result);
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const result = await userService.deleteUserAccount(req.user.id);
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.status(200).json(result);
});
