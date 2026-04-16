import Fastify from "fastify";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(import("./plugins/tracker.plugin.js"));

  await app.register(import("./plugins/tracking.plugin.js"));

  await app.register(import("./routes/index.js"));

  app.addHook("onClose", async () => {
    app.log.info("Shutting down Fastify...");
  });

  return app;
}
