import { Router } from "express";
import * as amplitude from "@amplitude/analytics-node";
import { trackEvent } from "../lib/analytics";
import { EVENTS } from "../lib/events";

export const users = Router();

users.post("/", (req, res) => {
  const { id, plan } = req.body as { id: string; plan?: string };
  trackEvent(id, EVENTS.userRegistered, { plan });
  res.status(201).json({ id });
});

users.delete("/:id/subscription", (req, res) => {
  // Direct call with the object form
  amplitude.track({ event_type: EVENTS.subscriptionCancelled, user_id: req.params.id });
  res.sendStatus(204);
});
