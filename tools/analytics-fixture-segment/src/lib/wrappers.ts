import { analytics } from "./browser";

// Plain wrapper
export function track(name: string, properties?: Record<string, unknown>) {
  void analytics.track(name, properties);
}

// Wrapper reading the name from a property of its parameter
export function trackEvent(payload: { event: string }) {
  void analytics.track(payload.event);
}

// Wrapper with a destructured, aliased parameter
export function trackNamed({ event: name }: { event: string }) {
  void analytics.track(name);
}

// Arrow-function wrapper
export const trackArrow = (name: string) => analytics.track(name);
