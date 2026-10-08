import { Router } from "express";
import { trackEvent } from "../lib/analytics";
import { EVENTS } from "../lib/events";

export const orders = Router();

orders.post("/", (req, res) => {
  const { userId, total } = req.body as { userId: string; total: number };
  trackEvent(userId, EVENTS.orderPlaced, { total });
  trackEvent(userId, "Order Confirmation Emailed");
  res.status(201).json({ ok: true });
});
