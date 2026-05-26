import fp from "fastify-plugin";
import { tracker } from "../services/tracker.js";

export default fp(async (app) => {
  app.decorate("tracker", tracker);

  app.log.info("Tracker initialized");
}, {
  name: "tracker"
});
