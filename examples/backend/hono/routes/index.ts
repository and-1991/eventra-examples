import { Hono } from "hono";
import { trackFeature } from "../services/tracker";

const app = new Hono();

app.get("/", (c) => {
  trackFeature("hono_home");
  return c.text("OK");
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

export default app;
