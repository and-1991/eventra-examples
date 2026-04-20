import { Eventra } from "https://esm.sh/@eventra_dev/eventra-sdk";

export const tracker = new Eventra({
  apiKey: "test",
  // Optional: override the default API endpoint (useful for local development or self-hosted servers)
  endpoint: "http://localhost:4000/track",
});

export function trackFeature(name, data = {}) {
  console.log("TRACK:", name);

  try {
    tracker.track(name, data);
  } catch (e) {
    console.error("Track error:", e);
  }
}
