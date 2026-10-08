import { EVENTS } from "../events";

// gtag("event", name, params): other commands (config, set) are not events and are ignored
export function setup() {
  gtag("js", new Date());
  gtag("config", "G-TEST");
  gtag("set", { user_id: "u1" });
}

export function trackPurchase() {
  gtag("event", EVENTS.purchase, { value: 10 });
  gtag("event", "ga4_gtag_literal");
}

// window.gtag works too
export function trackWindow() {
  window.gtag("event", "ga4_window_gtag");
}

// Names with spaces/colons are kept as written
export function trackSpaced() {
  gtag("event", EVENTS.trialStarted);
}
