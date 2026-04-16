import fp from "fastify-plugin";
import { Eventra } from "@eventra_dev/eventra-sdk";

export default fp(async (app) => {
  const tracker = new Eventra({
    apiKey: "test",
  });

  app.decorate("tracker", tracker);

  app.log.info("Tracker initialized");
}, {
  name: "tracker"
});
