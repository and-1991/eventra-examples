import ReactGA from "react-ga4";

ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID ?? "G-TEST");

export function trackPageView(path: string) {
  ReactGA.send({ hitType: "pageview", page: path }); // not a custom event
}

// Wrapper: call sites pass event names from lib/events.ts
export function trackEvent(action: string, params?: Record<string, unknown>) {
  ReactGA.event(action, params);
}
