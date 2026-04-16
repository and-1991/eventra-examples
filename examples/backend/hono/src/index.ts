import { Hono } from "hono";
import { Eventra } from "@eventra_dev/eventra-sdk";

const app = new Hono();

const tracker = new Eventra({
  apiKey: "test",
});

app.get("/", async (c) => {
  await tracker.track("hono_request", {
    userId: "hono_user"
  });

  return c.text("OK");
});

export default app;
