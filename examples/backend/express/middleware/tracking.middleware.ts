import { Request, Response, NextFunction } from "express";
import { trackFeature } from "../services/tracker";

export async function trackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  trackFeature("express_request");
  next();
}
