import express from "express";
import { shutdownAnalytics } from "./lib/analytics";
import { users } from "./routes/users";
import { orders } from "./routes/orders";

const app = express();
app.use(express.json());
app.use("/users", users);
app.use("/orders", orders);
app.get("/", (_req, res) => {
  res.send("OK");
});

const server = app.listen(3000, () => {
  console.log("Amplitude example running on http://localhost:3000");
});

process.on("SIGINT", async () => {
  await shutdownAnalytics();
  server.close(() => process.exit(0));
});
