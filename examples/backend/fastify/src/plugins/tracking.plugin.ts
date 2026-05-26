import fp from "fastify-plugin";
import { trackFeature } from "../services/tracker.js";

export default fp(async (app) => {
  app.addHook("onRequest", async () => {
    trackFeature("fastify_request", {
      userId: "fastify_user"
    });
  });

  app.addHook("onResponse", async (_req, reply) => {
    trackFeature("fastify_response", {
      statusCode: reply.statusCode
    });
  });
}, {
  name: "tracking",
  dependencies: ["tracker"]
});
