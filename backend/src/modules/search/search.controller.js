import { asyncHandler } from "../../utils/asyncHandler.js";
import * as searchService from "./search.service.js";

export const search = asyncHandler(async (req, res) => {
  const results = await searchService.searchAll(req.query.q);
  res.status(200).json(results);
});
