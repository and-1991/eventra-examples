import posthog from "posthog-js";

posthog.init("phc_test", { api_host: "http://localhost:4000" });

export { posthog };

// Direct calls on the posthog-js singleton
export function trackBrowserLoaded() {
  posthog.capture("posthog_browser_loaded");
  posthog.capture("posthog_with_props", { plan: "pro" });
}

// Not events: `$`-prefixed system names and names with disallowed characters are excluded
export function trackSystemEvents() {
  posthog.capture("$pageview");
  posthog.capture("bad name!");
}
