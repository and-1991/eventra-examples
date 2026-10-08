import { Eventra } from "@eventra_dev/eventra-sdk";
import * as amplitude from "@amplitude/analytics-browser";

// Eventra SDK and Amplitude side by side
const eventra = new Eventra({ apiKey: "test", endpoint: "http://localhost:4000/track" });

export function trackBoth(name: string) {
  eventra.track(name);
  amplitude.track(name);
}

trackBoth("amplitude_dual_event");
eventra.track("amplitude_eventra_only");
