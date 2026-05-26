import { FastifyInstance } from "fastify";
import { trackFeature } from "../services/tracker.js";

export default async function routes(app: FastifyInstance) {
  app.get("/", async () => {
    try {
      trackFeature("fastify_home", {
        userId: "fastify_user"
      });
    } catch {}

    return { message: "OK" };
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });
}
