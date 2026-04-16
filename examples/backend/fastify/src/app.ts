import Fastify from "fastify";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  // CORE PLUGIN SCOPE
  await app.register(async function core(app) {
    await app.register(import("./plugins/tracker.plugin.js"), {
      name: "tracker"
    });

    await app.register(import("./plugins/tracking.plugin.js"), {
      name: "tracking",
      dependencies: ["tracker"]
    });
  });

  // ROUTES
  await app.register(async function routesScope(app) {
    await app.register(import("./routes/index.js"));
  });

  // lifecycle
  app.addHook("onClose", async () => {
    app.log.info("Shutting down Fastify...");
  });

  return app;
}
