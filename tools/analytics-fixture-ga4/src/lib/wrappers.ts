// Plain wrapper
export function track(name: string, params?: Record<string, unknown>) {
  gtag("event", name, params);
}

// Wrapper reading the name from a property of its parameter
export function trackEvent(payload: { event: string }) {
  gtag("event", payload.event);
}

// Wrapper with a destructured, aliased parameter
export function trackNamed({ event: name }: { event: string }) {
  gtag("event", name);
}

// Arrow-function wrapper
export const trackArrow = (name: string) => gtag("event", name);
