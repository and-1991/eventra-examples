import fp from "fastify-plugin";

export default fp(async (app) => {
  app.addHook("onRequest", async (req) => {
    try {
      app.tracker.track("fastify_request", {
        userId: "fastify_user"
      });
    } catch {}
  });

  app.addHook("onResponse", async (req, reply) => {
    try {
      app.tracker.track("fastify_response", {
        statusCode: reply.statusCode
      });
    } catch {}
  });
}, {
  name: "tracking",
  dependencies: ["tracker"]
});
