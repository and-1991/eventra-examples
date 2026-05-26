import Fastify from "fastify";
import trackerPlugin from "./plugins/tracker.plugin.js";
import trackingPlugin from "./plugins/tracking.plugin.js";
import routes from "./routes/index.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(trackerPlugin);

  await app.register(trackingPlugin);

  await app.register(routes);

  app.addHook("onClose", async () => {
    app.log.info("Shutting down Fastify...");
  });

  return app;
}
