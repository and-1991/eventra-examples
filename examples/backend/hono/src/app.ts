import { Hono } from "hono";
import routes from "../routes/index";
import { trackingMiddleware } from "../middleware/tracking.middleware";

export function createApp() {
  const app = new Hono();

  // global middleware
  app.use("*", trackingMiddleware);

  // routes
  app.route("/", routes);

  return app;
}
