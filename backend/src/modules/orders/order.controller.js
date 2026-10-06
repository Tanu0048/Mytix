import { asyncHandler } from "../../utils/asyncHandler.js";
import * as orderService from "./order.service.js";

export const getOrderHandler = asyncHandler(async (req, res) => {
  const result = await orderService.getOrderByNumber(req.params.orderNumber, req.user.id, req.user.role);
  res.status(200).json({
    status: "success",
    data: result
  });
});
