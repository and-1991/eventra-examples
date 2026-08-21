import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({ apiKey: "test" });

export default function trackFeature(name: string) {
  tracker.track(name);
}
