import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({
  apiKey: "test", // mock key for the local mock server — replace with your key / inject at build time
  endpoint: "http://localhost:4000/track",
});

export function trackAngularPageView() {
  tracker.track("angular_page_view");
}

export function trackAngularClick() {
  tracker.track("angular_click");
}
