import { AnalyticsBrowser } from "@segment/analytics-next";

// Destructured client from AnalyticsBrowser.load(...) under any variable name
export const [analytics] = await AnalyticsBrowser.load({ writeKey: "test" });

export function trackLoaded() {
  analytics.track("segment_browser_loaded");
  analytics.track("segment_with_props", { plan: "pro" });
}

// Not events: names with disallowed characters are excluded
export function trackExcluded() {
  analytics.track("bad name!");
}
