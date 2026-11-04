import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({
  apiKey: process.env.EVENTRA_API_KEY ?? "test", // mock key for the local mock server — set EVENTRA_API_KEY
  endpoint: "http://localhost:4000/track",
});

export function trackFeature(name: string, data: Record<string, unknown> = {}) {
  try {
    tracker.track(name, data);
  } catch {}
}

export { tracker };
