import fp from "fastify-plugin";

export default fp(async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    app.tracker
      .track("fastify_request", {
        userId: "fastify_user"
      })
      .catch(() => {});
  });
});
