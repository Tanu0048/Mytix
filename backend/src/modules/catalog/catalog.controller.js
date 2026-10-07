import { asyncHandler } from "../../utils/asyncHandler.js";
import * as catalogService from "./catalog.service.js";
import { getHomePageData } from "./home.service.js";
import { getEventAvailability } from "./availability.service.js";

export const getHome = asyncHandler(async (_req, res) => {
  const data = await getHomePageData();
  res.status(200).json(data);
});

export const getEvents = asyncHandler(async (req, res) => {
  const data = await catalogService.listEvents(req.query);
  res.status(200).json(data);
});

export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const data = await catalogService.listUpcomingEvents(req.query);
  res.status(200).json(data);
});

export const getEventBySlug = asyncHandler(async (req, res) => {
  const event = await catalogService.getEventDetails(req.params.slug);
  res.status(200).json(event);
});

export const getAvailability = asyncHandler(async (req, res) => {
  const data = await getEventAvailability(req.params.slug);
  res.status(200).json(data);
});

export const getArtistBySlug = asyncHandler(async (req, res) => {
  const artist = await catalogService.getArtistDetails(req.params.slug);
  res.status(200).json(artist);
});

export const getVenueBySlug = asyncHandler(async (req, res) => {
  const venue = await catalogService.getVenueDetails(req.params.slug);
  res.status(200).json(venue);
});

export const getOrganiserBySlug = asyncHandler(async (req, res) => {
  const organiser = await catalogService.getOrganiserDetails(req.params.slug);
  res.status(200).json(organiser);
});

export const getVenues = asyncHandler(async (req, res) => {
  const venues = await catalogService.listVenues();
  res.status(200).json(venues);
});

export const getArtists = asyncHandler(async (req, res) => {
  const artists = await catalogService.listArtists();
  res.status(200).json(artists);
});
