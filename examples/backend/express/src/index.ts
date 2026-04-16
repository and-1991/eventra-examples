import express from "express";
import { trackFeature } from "./tracker";

const app = express();

app.use(async (req, res, next) => {
  await trackFeature("express_request");
  next();
});

app.get("/", async (_, res) => {
  await trackFeature("express_home");
  res.send("OK");
});

app.listen(3000, () => {
  console.log("http://localhost:3000");
});
