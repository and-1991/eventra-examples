"use client";

import { Eventra } from "@eventra_dev/eventra-sdk";

export const tracker = new Eventra({
  apiKey: "test",
  // Optional: override the default API endpoint (useful for local development or self-hosted servers)
  endpoint: "http://localhost:4000/track",
});

export function trackFeature(name: string, data: any = {}) {
  try {
    tracker.track(name, data);
  } catch (e) {
    console.error("Track error:", e);
  }
}
