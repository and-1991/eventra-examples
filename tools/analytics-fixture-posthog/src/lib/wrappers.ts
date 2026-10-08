import posthog from "posthog-js";

// Plain wrapper: every call site's literal becomes an event
export function track(name: string, properties?: Record<string, unknown>) {
  posthog.capture(name, properties);
}

// Wrapper that reads the name from a property of its parameter
export function trackEvent(payload: { event: string; userId?: string }) {
  posthog.capture(payload.event, { userId: payload.userId });
}

// Wrapper with a destructured, aliased parameter
export function trackNamed({ event: name }: { event: string }) {
  posthog.capture(name);
}

// Arrow-function wrapper
export const trackArrow = (name: string) => posthog.capture(name);
