import { FastifyInstance } from "fastify";

export default async function routes(app: FastifyInstance) {
  app.get("/", async () => {
    app.tracker
      .track("fastify_home", {
        userId: "fastify_user"
      })
      .catch(() => {});

    return { message: "OK" };
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });
}
