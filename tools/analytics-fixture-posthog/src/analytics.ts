import { Eventra } from "@eventra_dev/eventra-sdk";
import posthog from "posthog-js";

// Eventra SDK and PostHog side by side: both are discovered by one `eventra sync`
const eventra = new Eventra({ apiKey: "test", endpoint: "http://localhost:4000/track" });

export function trackBoth(name: string) {
  eventra.track(name);
  posthog.capture(name);
}

trackBoth("posthog_dual_event");
eventra.track("posthog_eventra_only");
