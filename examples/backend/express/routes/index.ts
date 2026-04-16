import { Router } from "express";
import { trackFeature } from "../services/tracker";

const router = Router();

router.get("/", async (req, res) => {
  trackFeature("express_home");
  res.send("OK");
});

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default router;
