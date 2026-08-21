import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({ apiKey: "test" });

export function trackBarrel(name: string) {
  tracker.track(name);
}
