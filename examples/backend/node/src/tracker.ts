import { Eventra } from "@eventra_dev/eventra-sdk";

export const tracker = new Eventra({
  apiKey: "test",
  baseUrl: "http://localhost:4000"
});

export function trackFeature(name: string) {
  return tracker.track(name, { userId: "node_user" });
}
