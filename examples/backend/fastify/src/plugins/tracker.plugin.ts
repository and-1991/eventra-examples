import fp from "fastify-plugin";
import { Eventra } from "@eventra_dev/eventra-sdk";

export default fp(async (app) => {
  const tracker = new Eventra({
    apiKey: "test",
    // Optional: override the default API endpoint (useful for local development or self-hosted servers)
    endpoint: "http://localhost:4000/track",
  });

  app.decorate("tracker", tracker);

  app.log.info("Tracker initialized");
}, {
  name: "tracker"
});
