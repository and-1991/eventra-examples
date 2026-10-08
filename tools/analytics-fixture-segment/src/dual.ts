import { Eventra } from "@eventra_dev/eventra-sdk";
import { analytics } from "./lib/browser";

// Eventra SDK and Segment side by side
const eventra = new Eventra({ apiKey: "test", endpoint: "http://localhost:4000/track" });

export function trackBoth(name: string) {
  eventra.track(name);
  void analytics.track(name);
}

trackBoth("segment_dual_event");
eventra.track("segment_eventra_only");
