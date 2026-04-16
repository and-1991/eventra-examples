import Fastify from "fastify";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  // plugins
  await app.register(import("./plugins/tracker.plugin.js"));
  await app.register(import("./plugins/tracking.plugin.js"));

  // routes
  await app.register(import("./routes/index.js"));

  return app;
}
