import { Context, Next } from "hono";
import { trackFeature } from "../services/tracker";

export async function trackingMiddleware(c: Context, next: Next) {
  // request
  trackFeature("hono_request", {
    path: c.req.path,
    method: c.req.method
  });

  await next();

  // response
  trackFeature("hono_response", {
    status: c.res.status
  });
}
