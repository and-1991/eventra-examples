import { SIGNUP, Feature } from "../events";
import { track, trackEvent, trackObject, trackNamed, trackArrow } from "../lib/wrappers";

// Cross-file wrappers + constants + enums
export function onSignup() {
  track(SIGNUP);
  track("amplitude_signup_viewed");
}

export function onCheckout() {
  trackEvent({ event: "amplitude_checkout" });
  trackObject("amplitude_object_wrapper");
}

export function onSearch(flag: boolean) {
  trackNamed({ event: Feature.Search });
  trackArrow(flag ? "amplitude_search_advanced" : "amplitude_search_basic");
  trackArrow(`amplitude_export_${flag ? "csv" : "json"}`);
}
