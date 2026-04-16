import { serve } from "@hono/node-server";
import { createApp } from "./app";

const app = createApp();

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000
});

console.log("Hono (Node) running on http://localhost:3000");
