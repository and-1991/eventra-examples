import { AnalyticsBrowser } from "@segment/analytics-next";

// One shared client for the whole app
export const analytics = AnalyticsBrowser.load({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY ?? "test",
  cdnURL: "http://localhost:4000",
});

// Thin wrapper: call sites pass event names from lib/events.ts
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  return analytics.track(name, properties);
}
