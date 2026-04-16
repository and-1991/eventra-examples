import express from "express";
import routes from "../routes/index";
import { trackingMiddleware } from "../middleware/tracking.middleware";
import { errorMiddleware } from "../middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(express.json());

  // auto tracking
  app.use(trackingMiddleware);

  app.use(routes);

  // ❗ error handler
  app.use(errorMiddleware);

  return app;
}
