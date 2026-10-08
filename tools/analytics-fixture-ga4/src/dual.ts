import { Eventra } from "@eventra_dev/eventra-sdk";

// Eventra SDK and GA4 side by side
const eventra = new Eventra({ apiKey: "test", endpoint: "http://localhost:4000/track" });

export function trackBoth(name: string) {
  eventra.track(name);
  gtag("event", name);
}

trackBoth("ga4_dual_event");
eventra.track("ga4_eventra_only");
