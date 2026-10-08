import * as amplitude from "@amplitude/analytics-browser";

// Plain wrapper
export function track(name: string, properties?: Record<string, unknown>) {
  amplitude.track(name, properties);
}

// Wrapper reading the name from a property of its parameter
export function trackEvent(payload: { event: string }) {
  amplitude.track(payload.event);
}

// Object form through a wrapper works with a plain string parameter. Combining it with a
// property of the parameter -- track({ event_type: payload.event }) -- was NOT detected
// (verified with eventra-cli 2.1.0), so prefer the shape below.
export function trackObject(name: string) {
  amplitude.track({ event_type: name });
}

// Wrapper with a destructured, aliased parameter
export function trackNamed({ event: name }: { event: string }) {
  amplitude.track(name);
}

// Arrow-function wrapper
export const trackArrow = (name: string) => amplitude.track(name);
