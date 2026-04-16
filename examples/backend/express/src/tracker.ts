import { Eventra } from "@eventra_dev/eventra-sdk";

export const tracker = new Eventra({
  apiKey: "test",
});

export const trackFeature = (name: string) =>
  tracker.track(name, { userId: "express_user" });
