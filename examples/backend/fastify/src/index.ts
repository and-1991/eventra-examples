import Fastify from "fastify";
import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({
  apiKey: "test",
});

const app = Fastify();

app.addHook("onRequest", async () => {
  await tracker.track("fastify_request", {
    userId: "fastify_user"
  });
});

app.get("/", async () => {
  await tracker.track("fastify_home", {
    userId: "fastify_user"
  });

  return "OK";
});

app.listen({ port: 3000 });
