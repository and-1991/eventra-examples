import { Request, Response, NextFunction } from "express";

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("🔥 Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
}
