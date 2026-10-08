import { SIGNUP, ORDER_COMPLETED, Feature } from "../events";
import { track, trackEvent, trackNamed, trackArrow } from "../lib/wrappers";

// Cross-file wrappers + constants + enums
export function onSignup() {
  track(SIGNUP);
}

export function onOrder() {
  trackEvent({ event: ORDER_COMPLETED });
  track("segment_order_viewed");
}

export function onSearch(flag: boolean) {
  trackNamed({ event: Feature.Search });
  trackArrow(flag ? "segment_search_advanced" : "segment_search_basic");
  trackArrow(`segment_export_${flag ? "csv" : "json"}`);
}
