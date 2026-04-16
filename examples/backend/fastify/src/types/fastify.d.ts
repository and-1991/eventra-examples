import "fastify";
import { Eventra } from "@eventra_dev/eventra-sdk";

declare module "fastify" {
  interface FastifyInstance {
    tracker: Eventra;
  }
}
