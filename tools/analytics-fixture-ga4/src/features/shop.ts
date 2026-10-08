import { SIGNUP, Feature } from "../events";
import { track, trackEvent, trackNamed, trackArrow } from "../lib/wrappers";

// Cross-file wrappers + constants + enums
export function onSignup() {
  track(SIGNUP);
  track("ga4_signup_viewed");
}

export function onCheckout() {
  trackEvent({ event: "ga4_checkout" });
}

export function onSearch(flag: boolean) {
  trackNamed({ event: Feature.Search });
  trackArrow(flag ? "ga4_search_advanced" : "ga4_search_basic");
  trackArrow(`ga4_export_${flag ? "csv" : "json"}`);
}
