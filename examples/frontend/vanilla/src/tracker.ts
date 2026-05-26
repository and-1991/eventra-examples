import { Eventra } from "@eventra_dev/eventra-sdk";

export const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track",
});

export function trackFeature(name: string, data: Record<string, unknown> = {}) {
  console.log("TRACK:", name);

  try {
    tracker.track(name, data);
  } catch (e) {
    console.error("Track error:", e);
  }
}
